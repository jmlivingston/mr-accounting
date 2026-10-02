import { lazy, Suspense } from 'react';
import { content } from './content/content';
import { useAuth } from './hooks/useAuth';

const LoginForm = lazy(() => import('./components/LoginForm'));
const Dashboard = lazy(() => import('./components/Dashboard'));

function Loading() {
  return <p aria-busy="true">{content.app.loading}</p>;
}

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
      {status === 'loading' && <Loading />}
      <Suspense fallback={<Loading />}>
        {status === 'unauthenticated' && <LoginForm onLogin={login} />}
        {status === 'authenticated' && <Dashboard onSessionExpired={expireSession} />}
      </Suspense>
    </main>
  );
}
