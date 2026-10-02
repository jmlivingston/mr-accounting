import { loginInputSchema } from 'api/schemas';
import { useState, type SubmitEvent } from 'react';
import { getErrorMessage } from '../api/trpcClient';
import { ErrorAlert } from './ErrorAlert';

type Props = {
  onLogin: (username: string, password: string) => Promise<void>;
};

export function LoginForm({ onLogin }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = loginInputSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setError('Username and password are required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onLogin(parsed.data.username, parsed.data.password);
    } catch (loginError) {
      setError(getErrorMessage(loginError));
      setIsSubmitting(false);
    }
  }

  return (
    <article>
      <header>
        <h2>Log in</h2>
      </header>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Username
          <input name="username" autoComplete="username" required aria-invalid={error ? true : undefined} />
        </label>
        <label>
          Password
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
          Log in
        </button>
      </form>
    </article>
  );
}
