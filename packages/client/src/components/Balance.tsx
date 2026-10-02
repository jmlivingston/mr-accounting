import { content } from '../content/content';
import { currencyFormatter } from '../constants';

type Props = {
  balance: number | null;
};

export function Balance({ balance }: Props) {
  return (
    <article>
      <header>
        <h2>{content.balance.heading}</h2>
      </header>
      <h3 aria-busy={balance === null}>{balance === null ? '' : currencyFormatter.format(balance)}</h3>
    </article>
  );
}
