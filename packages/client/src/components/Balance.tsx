import { useId } from 'react';
import { currencyFormatter } from '../constants';
import { content } from '../content/content';

type Props = {
  balance: number | null;
};

export function Balance({ balance }: Props) {
  const headingId = useId();

  return (
    <article>
      <header>
        <h2 id={headingId}>{content.balance.heading}</h2>
      </header>
      <output className="balance" aria-labelledby={headingId} aria-busy={balance === null}>
        {balance === null ? '' : currencyFormatter.format(balance)}
      </output>
    </article>
  );
}
