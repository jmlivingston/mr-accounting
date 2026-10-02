import { content } from './content/content';
import { Dashboard } from './components/Dashboard';
import { LoginForm } from './components/LoginForm';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { status, login, logout, expireSession } = useAuth();

  return (
    <main className="container">
      <nav>
        <ul>
          <li>
            <strong>{content.app.title}</strong>
          </li>
        </ul>
        {status === 'authenticated' && (
          <ul>
            <li>
              <button className="secondary" onClick={() => void logout()}>
                {content.app.logout}
              </button>
            </li>
          </ul>
        )}
      </nav>
      {status === 'loading' && <p aria-busy="true">{content.app.loading}</p>}
      {status === 'unauthenticated' && <LoginForm onLogin={login} />}
      {status === 'authenticated' && <Dashboard onSessionExpired={expireSession} />}
    </main>
  );
}
