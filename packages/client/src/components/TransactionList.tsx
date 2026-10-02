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
              <th scope="col">{content.transactionList.columns.date}</th>
              <th scope="col">{content.transactionList.columns.description}</th>
              <th scope="col">{content.transactionList.columns.type}</th>
              <th scope="col">{content.transactionList.columns.amount}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(({ id, date, description, type, amount }) => (
              <tr key={id}>
                <td>
                  <time dateTime={date}>{dateFormatter.format(new Date(date))}</time>
                </td>
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
