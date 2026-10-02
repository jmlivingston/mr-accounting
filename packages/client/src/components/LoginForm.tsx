import { loginInputSchema } from 'api/schemas';
import { useId, useRef, useState, type SubmitEvent } from 'react';
import { content } from '../content/content';
import { getErrorMessage } from '../api/trpcClient';
import { ErrorAlert } from './ErrorAlert';

type Props = {
  onLogin: (username: string, password: string) => Promise<void>;
};

export default function LoginForm({ onLogin }: Props) {
  const headingId = useId();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State alone can't block a second submit that fires before the next render
  const submitInFlightRef = useRef(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitInFlightRef.current) return;
    const parsed = loginInputSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setError(content.login.required);
      return;
    }
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onLogin(parsed.data.username, parsed.data.password);
    } catch (loginError) {
      setError(getErrorMessage(loginError));
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <article>
      <header>
        <h2 id={headingId}>{content.login.heading}</h2>
      </header>
      <form aria-labelledby={headingId} onSubmit={(event) => void handleSubmit(event)}>
        <label>
          {content.login.username}
          <input name="username" autoComplete="username" required aria-invalid={error ? true : undefined} />
        </label>
        <label>
          {content.login.password}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={error ? true : undefined}
          />
        </label>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <button type="submit" aria-busy={isSubmitting} disabled={isSubmitting}>
          {content.login.submit}
        </button>
      </form>
    </article>
  );
}
