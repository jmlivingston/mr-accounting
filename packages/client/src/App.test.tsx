import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { content } from './content/content';
import { trpcError } from './test/trpcErrors';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  account: vi.fn(),
  create: vi.fn(),
}));

vi.mock('./api/trpcClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/trpcClient')>()),
  setCsrfToken: vi.fn(),
  trpc: {
    auth: {
      session: { query: mocks.session },
      login: { mutate: mocks.login },
      logout: { mutate: mocks.logout },
    },
    transactions: {
      account: { query: mocks.account },
      create: { mutate: mocks.create },
    },
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({
    balance: 1500,
    transactions: [
      {
        id: '3f2b8c1e-5d4a-4f6b-9a7c-1e2d3c4b5a69',
        date: '2026-03-01T12:00:00Z',
        amount: 1500,
        type: 'credit',
        description: 'Salary',
      },
    ],
  });
});

describe('App', () => {
  it('shows a loading indicator while checking the session', () => {
    mocks.session.mockReturnValue(new Promise(() => undefined));
    render(<App />);
    expect(screen.getByText('Loading')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the login form when there is no session', async () => {
    mocks.session.mockResolvedValue({ csrfToken: null });
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });

  it('shows the dashboard with account data for an existing session', async () => {
    mocks.session.mockResolvedValue({ csrfToken: 'csrf' });
    render(<App />);
    expect(await screen.findByRole('heading', { name: '$1,500.00' })).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New transaction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('logs in through the form and then shows the dashboard', async () => {
    mocks.session.mockResolvedValue({ csrfToken: null });
    mocks.login.mockResolvedValue({ username: 'alice', csrfToken: 'csrf' });
    const user = userEvent.setup();
    render(<App />);

    await user.type(await screen.findByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: '$1,500.00' })).toBeInTheDocument();
    expect(mocks.login).toHaveBeenCalledWith({ username: 'alice', password: 'secret' });
  });

  it('logs out and returns to the login form', async () => {
    mocks.session.mockResolvedValue({ csrfToken: 'csrf' });
    mocks.logout.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(mocks.logout).toHaveBeenCalled();
  });

  it('returns to the login form when the session expires mid-use', async () => {
    mocks.session.mockResolvedValue({ csrfToken: 'csrf' });
    mocks.account.mockRejectedValue(trpcError('UNAUTHORIZED'));
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it('shows load errors on the dashboard', async () => {
    mocks.session.mockResolvedValue({ csrfToken: 'csrf' });
    mocks.account.mockRejectedValue(trpcError('INTERNAL_SERVER_ERROR'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(content.errors.internal);
  });
});
