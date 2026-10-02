import { loginInputSchema } from 'api/schemas'
import { useState, type SubmitEvent } from 'react'
import { getErrorMessage } from '../api/trpcClient'

type Props = {
  onLogin: (username: string, password: string) => Promise<void>
}

export function LoginForm({ onLogin }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = loginInputSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    )
    if (!parsed.success) {
      setError('Username and password are required')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await onLogin(parsed.data.username, parsed.data.password)
    } catch (loginError) {
      setError(getErrorMessage(loginError))
      setIsSubmitting(false)
    }
  }

  return (
    <article>
      <header>
        <h2>Log in</h2>
      </header>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" aria-busy={isSubmitting} disabled={isSubmitting}>
          Log in
        </button>
      </form>
    </article>
  )
}
