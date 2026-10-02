import type { Transaction } from 'api/schemas';
import { currencyFormatter, dateFormatter } from '../constants';

type Props = {
  transactions: Transaction[];
};

export function TransactionList({ transactions }: Props) {
  return (
    <article>
      <header>
        <h2>Last 5 transactions</h2>
      </header>
      {transactions.length === 0 ? (
        <p>No transactions yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(({ id, date, description, type, amount }) => (
              <tr key={id}>
                <td>{dateFormatter.format(new Date(date))}</td>
                <td>{description}</td>
                <td>{type}</td>
                <td>{currencyFormatter.format(amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}
