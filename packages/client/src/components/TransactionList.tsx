import type { Transaction } from 'api/schemas';
import { content } from '../content/content';
import { currencyFormatter, dateFormatter } from '../constants';

type Props = {
  transactions: Transaction[];
};

export function TransactionList({ transactions }: Props) {
  return (
    <article>
      <header>
        <h2>{content.transactionList.heading}</h2>
      </header>
      {transactions.length === 0 ? (
        <p>{content.transactionList.empty}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{content.transactionList.columns.date}</th>
              <th>{content.transactionList.columns.description}</th>
              <th>{content.transactionList.columns.type}</th>
              <th>{content.transactionList.columns.amount}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(({ id, date, description, type, amount }) => (
              <tr key={id}>
                <td>{dateFormatter.format(new Date(date))}</td>
                <td>{description}</td>
                <td>{content.transactionTypes[type]}</td>
                <td>{currencyFormatter.format(amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}
