import { transactionInputSchema, transactionTypes, type TransactionInput } from 'api/schemas';
import { useState, type SubmitEvent } from 'react';

type Props = {
  onSubmit: (input: TransactionInput) => Promise<void>;
};

function toLocalDateTimeValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function TransactionForm({ onSubmit }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultDate, setDefaultDate] = useState(() => toLocalDateTimeValue(new Date()));

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const date = new Date(String(values.date));
    const parsed = transactionInputSchema.safeParse({
      ...values,
      date: Number.isNaN(date.getTime()) ? values.date : date.toISOString(),
      amount: Number(values.amount),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; '));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(parsed.data);
      form.reset();
      setDefaultDate(toLocalDateTimeValue(new Date()));
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article>
      <header>
        <h2>New transaction</h2>
      </header>
      <form onSubmit={handleSubmit} key={defaultDate}>
        <label>
          Date and time
          <input name="date" type="datetime-local" defaultValue={defaultDate} required />
        </label>
        <label>
          Amount
          <input name="amount" type="number" min="0.01" step="any" inputMode="decimal" required />
        </label>
        <label>
          Type
          <select name="type" defaultValue={transactionTypes[0]} required>
            {transactionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description
          <input name="description" maxLength={200} required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" aria-busy={isSubmitting} disabled={isSubmitting}>
          Submit
        </button>
      </form>
    </article>
  );
}
