import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from 'api';
import { apiUrl, csrfHeader } from '../constants';

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiUrl}/trpc`,
      fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
      headers: () => (csrfToken ? { [csrfHeader]: csrfToken } : {}),
    }),
  ],
});

export function getErrorMessage(error: unknown) {
  if (error instanceof TRPCClientError) return error.message;
  return 'Unable to reach the server';
}

export function isUnauthorized(error: unknown) {
  return error instanceof TRPCClientError && (error as TRPCClientError<AppRouter>).data?.code === 'UNAUTHORIZED';
}
