import {
  maxDescriptionLength,
  maxTransactionAmount,
  minTransactionAmount,
  transactionInputSchema,
  transactionTypes,
  type TransactionInput,
} from 'api/schemas';
import { useState, type SubmitEvent } from 'react';
import { ErrorAlert } from './ErrorAlert';

type Props = {
  onSubmit: (input: TransactionInput) => Promise<void>;
};

function toLocalDateTimeValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function TransactionForm({ onSubmit }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultDate, setDefaultDate] = useState(() => toLocalDateTimeValue(new Date()));

  function invalidProps(field: string) {
    return fieldErrors[field] ? { 'aria-invalid': true, 'aria-describedby': `${field}-error` } : {};
  }

  function fieldError(field: string) {
    const message = fieldErrors[field];
    return (
      message && (
        <small id={`${field}-error`} className="field-error">
          {message}
        </small>
      )
    );
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const rawDate = typeof values.date === 'string' ? values.date : '';
    const date = new Date(rawDate);
    const parsed = transactionInputSchema.safeParse({
      ...values,
      date: Number.isNaN(date.getTime()) ? rawDate : date.toISOString(),
      amount: Number(values.amount),
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const { path, message } of parsed.error.issues) errors[String(path[0])] ??= message;
      setFieldErrors(errors);
      setError(null);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});
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
      <form onSubmit={(event) => void handleSubmit(event)} key={defaultDate}>
        <label>
          Date and time
          <input name="date" type="datetime-local" defaultValue={defaultDate} required {...invalidProps('date')} />
        </label>
        {fieldError('date')}
        <label>
          Amount
          <input
            name="amount"
            type="number"
            min={minTransactionAmount}
            max={maxTransactionAmount}
            step="any"
            inputMode="decimal"
            required
            {...invalidProps('amount')}
          />
        </label>
        {fieldError('amount')}
        <label>
          Type
          <select name="type" defaultValue={transactionTypes[0]} required {...invalidProps('type')}>
            {transactionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        {fieldError('type')}
        <label>
          Description
          <input name="description" maxLength={maxDescriptionLength} required {...invalidProps('description')} />
        </label>
        {fieldError('description')}
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <button type="submit" aria-busy={isSubmitting} disabled={isSubmitting}>
          Submit
        </button>
      </form>
    </article>
  );
}
