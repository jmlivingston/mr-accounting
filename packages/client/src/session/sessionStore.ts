import { sessionStatuses } from '../constants';

export type SessionStatus = (typeof sessionStatuses)[keyof typeof sessionStatuses];

type SessionState = { status: SessionStatus; csrfToken: string | null };

const initialState: SessionState = { status: sessionStatuses.loading, csrfToken: null };

let state = initialState;
const listeners = new Set<() => void>();

function setState(next: SessionState) {
  if (next.status === state.status && next.csrfToken === state.csrfToken) return;
  state = next;
  listeners.forEach((listener) => listener());
}

export const sessionStore = {
  getStatus: () => state.status,
  getCsrfToken: () => state.csrfToken,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  begin: (csrfToken: string) => setState({ status: sessionStatuses.authenticated, csrfToken }),
  end: () => setState({ status: sessionStatuses.unauthenticated, csrfToken: null }),
  reset: () => setState(initialState),
};
