import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Balance } from './Balance';

describe('Balance', () => {
  it('shows a loading state while the balance is unknown', () => {
    render(<Balance balance={null} />);
    expect(screen.getByRole('status', { name: 'Balance' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status', { name: 'Balance' })).toBeEmptyDOMElement();
  });

  it('formats the balance as currency', () => {
    render(<Balance balance={1234.5} />);
    expect(screen.getByRole('status', { name: 'Balance' })).toHaveTextContent('$1,234.50');
    expect(screen.getByRole('status', { name: 'Balance' })).toHaveAttribute('aria-busy', 'false');
  });

  it('shows a zero balance rather than the loading state', () => {
    render(<Balance balance={0} />);
    expect(screen.getByRole('status', { name: 'Balance' })).toHaveTextContent('$0.00');
  });
});
