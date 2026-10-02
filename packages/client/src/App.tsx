import { lazy, Suspense } from 'react';
import { sessionStatuses } from './constants';
import { content } from './content/content';
import { login, logout, useSession } from './session/session';

const LoginForm = lazy(() => import('./components/LoginForm'));
const Dashboard = lazy(() => import('./components/Dashboard'));

function Loading() {
  return <p aria-busy="true">{content.app.loading}</p>;
}

export default function App() {
  const status = useSession();

  return (
    <>
      <header className="container app-header">
        <nav>
          <ul>
            <li>
              <strong>{content.app.title}</strong>
            </li>
          </ul>
          {status === sessionStatuses.authenticated && (
            <ul>
              <li>
                <button className="secondary" onClick={() => void logout()}>
                  {content.app.logout}
                </button>
              </li>
            </ul>
          )}
        </nav>
      </header>
      <main className="container">
        {status === sessionStatuses.loading && <Loading />}
        <Suspense fallback={<Loading />}>
          {status === sessionStatuses.unauthenticated && <LoginForm onLogin={login} />}
          {status === sessionStatuses.authenticated && <Dashboard />}
        </Suspense>
      </main>
    </>
  );
}
