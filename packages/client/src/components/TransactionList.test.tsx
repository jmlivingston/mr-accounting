import type { Transaction } from 'api/schemas';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TransactionList } from './TransactionList';

const transactions: Transaction[] = [
  {
    id: '3f2b8c1e-5d4a-4f6b-9a7c-1e2d3c4b5a69',
    date: '2026-03-01T12:00:00Z',
    amount: 2500,
    type: 'credit',
    description: 'Salary',
  },
  {
    id: '9a1c7e52-0b3d-4c8f-8e6a-2f4d6b8a0c13',
    date: '2026-03-02T12:00:00Z',
    amount: 12.3,
    type: 'debit',
    description: 'Lunch',
  },
];

describe('TransactionList', () => {
  it('shows an empty message when there are no transactions', () => {
    render(<TransactionList transactions={[]} />);
    expect(screen.getByText('No transactions yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders one row per transaction in the given order', () => {
    render(<TransactionList transactions={transactions} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Salary')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Lunch')).toBeInTheDocument();
  });

  it('formats amounts, dates and types', () => {
    render(<TransactionList transactions={transactions} />);
    const [salary] = screen.getAllByRole('row').slice(1);
    expect(within(salary).getByText('$2,500.00')).toBeInTheDocument();
    expect(within(salary).getByText('credit')).toBeInTheDocument();
    expect(within(salary).getByText(/Mar 1, 2026/)).toBeInTheDocument();
    expect(screen.getByText('$12.30')).toBeInTheDocument();
  });
});
