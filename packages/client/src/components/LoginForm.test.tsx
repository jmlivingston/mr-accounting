import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { content } from '../content/content';
import { trpcError } from '../test/trpcErrors';
import { LoginForm } from './LoginForm';

function setup(onLogin = vi.fn<(username: string, password: string) => Promise<void>>().mockResolvedValue()) {
  const user = userEvent.setup();
  render(<LoginForm onLogin={onLogin} />);
  return { user, onLogin };
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, username: string, password: string) {
  if (username) await user.type(screen.getByLabelText('Username'), username);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('LoginForm', () => {
  it('submits the entered credentials', async () => {
    const { user, onLogin } = setup();
    await fillAndSubmit(user, 'alice', 'secret');
    expect(onLogin).toHaveBeenCalledExactlyOnceWith('alice', 'secret');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses the right autocomplete hints for password managers', () => {
    setup();
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('shows a validation error and does not call onLogin when fields are blank', async () => {
    const { user, onLogin } = setup();
    // Bypass native `required` blocking so the schema check runs
    screen.getByRole('button', { name: 'Log in' }).closest('form')?.setAttribute('novalidate', '');
    await fillAndSubmit(user, '', '');
    expect(screen.getByRole('alert')).toHaveTextContent('Username and password are required');
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('shows the server error and marks both fields invalid when login fails', async () => {
    const failure = trpcError('UNAUTHORIZED', 'invalidCredentials', 'Invalid username or password');
    const { user } = setup(vi.fn().mockRejectedValue(failure));
    await fillAndSubmit(user, 'alice', 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent(content.errors.invalidCredentials);
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
  });

  it('shows a generic message when the server is unreachable', async () => {
    const { user } = setup(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await fillAndSubmit(user, 'alice', 'secret');
    expect(await screen.findByRole('alert')).toHaveTextContent(content.errors.network);
  });

  it('disables the button while the login is in flight', async () => {
    let finish: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => (finish = resolve));
    const { user } = setup(vi.fn().mockReturnValue(pending));
    await fillAndSubmit(user, 'alice', 'secret');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Log in' })).toHaveAttribute('aria-busy', 'true');
    finish();
  });
});
