import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { maxDescriptionLength, maxTransactionAmount, minTransactionAmount, type TransactionInput } from 'api/schemas';
import { describe, expect, it, vi } from 'vitest';
import { content } from '../content/content';
import { getIssueMessage } from '../validationMessages';
import { TransactionForm } from './TransactionForm';

function field(name: string) {
  return screen.getByLabelText(name);
}

type Submit = (input: TransactionInput) => Promise<void>;

function setup(onSubmit: Submit = vi.fn<Submit>().mockResolvedValue()) {
  const user = userEvent.setup();
  render(<TransactionForm onSubmit={onSubmit} />);
  // Skip native constraint validation so the schema's errors are what we test
  screen.getByRole('button', { name: 'Submit' }).closest('form')?.setAttribute('novalidate', '');
  return { user, onSubmit };
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  { amount, description, type }: { amount?: string; description?: string; type?: string },
) {
  if (amount !== undefined) await user.type(field('Amount'), amount);
  if (description !== undefined) await user.type(field('Description'), description);
  if (type) await user.selectOptions(field('Type'), type);
}

describe('TransactionForm', () => {
  it('defaults to a local datetime close to now and to a debit', () => {
    setup();
    const value = (field('Date and time') as HTMLInputElement).value;
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(Math.abs(new Date(value).getTime() - Date.now())).toBeLessThan(2 * 60_000);
    expect(field('Type')).toHaveValue('debit');
  });

  it('keeps error messages out of the field labels', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByRole('spinbutton', { name: 'Amount' })).toBeInTheDocument();
    expect(field('Amount').closest('label')).not.toHaveTextContent(content.validation.amount.max.slice(0, 10));
  });

  it('limits the description length', () => {
    setup();
    expect(field('Description')).toHaveAttribute('maxlength', String(maxDescriptionLength));
  });

  it('limits the amount input to the configured range', () => {
    setup();
    expect(field('Amount')).toHaveAttribute('min', String(minTransactionAmount));
    expect(field('Amount')).toHaveAttribute('max', String(maxTransactionAmount));
  });

  it('submits a parsed transaction with an ISO date', async () => {
    const { user, onSubmit } = setup();
    await fill(user, { amount: '42.5', description: '  Groceries ', type: 'credit' });
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = vi.mocked(onSubmit).mock.calls[0][0];
    expect(submitted).toMatchObject({ amount: 42.5, type: 'credit', description: 'Groceries' });
    expect(submitted.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('clears the form after a successful submit', async () => {
    const { user } = setup();
    await fill(user, { amount: '10', description: 'Coffee' });
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(field('Amount')).toHaveValue(null));
    expect(field('Description')).toHaveValue('');
  });

  it('shows an error under each invalid field and does not submit', async () => {
    const { user, onSubmit } = setup();
    await fill(user, { amount: String(maxTransactionAmount + 1), description: ' ' });
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).not.toHaveBeenCalled();

    const amount = field('Amount');
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(amount).toHaveAccessibleDescription(getIssueMessage({ path: ['amount'], code: 'too_big' }));
    const description = field('Description');
    expect(description).toHaveAttribute('aria-invalid', 'true');
    expect(description).toHaveAccessibleDescription(content.validation.description.required);
    expect(field('Type')).not.toHaveAttribute('aria-invalid');
  });

  it('rejects a missing amount', async () => {
    const { user, onSubmit } = setup();
    await fill(user, { description: 'No amount' });
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(field('Amount')).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears field errors once the input is valid', async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(field('Amount')).toHaveAttribute('aria-invalid', 'true');
    await fill(user, { amount: '5', description: 'Fixed' });
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(document.querySelector('[aria-invalid]')).toBeNull();
  });

  it('shows submit failures in an alert and keeps the entered values', async () => {
    const onSubmit = vi.fn<Submit>().mockRejectedValue(new Error('Insufficient funds'));
    const { user } = setup(onSubmit);
    await fill(user, { amount: '10', description: 'Too much' });
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient funds');
    expect(field('Amount')).toHaveValue(10);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('shows busy and disabled while submitting and ignores a repeated submit', async () => {
    let finish: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => (finish = resolve));
    const { user, onSubmit } = setup(vi.fn<Submit>().mockReturnValue(pending));
    await fill(user, { amount: '10', description: 'Lunch' });
    const button = screen.getByRole('button', { name: 'Submit' });
    const form = button.closest('form')!;

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    finish();
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).toHaveAttribute('aria-busy', 'false');
  });
});
