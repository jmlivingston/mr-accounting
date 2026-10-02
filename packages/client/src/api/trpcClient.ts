import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from 'api';
import { content } from '../content/content';
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
  if (!(error instanceof TRPCClientError)) return content.errors.network;
  const { data } = error as TRPCClientError<AppRouter>;
  // No data means the request never produced a tRPC response, e.g. the network failed
  if (!data) return content.errors.network;
  if (data.reason) return content.errors[data.reason];
  switch (data.code) {
    case 'UNAUTHORIZED':
      return content.errors.unauthorized;
    case 'FORBIDDEN':
      return content.errors.forbidden;
    case 'INTERNAL_SERVER_ERROR':
      return content.errors.internal;
    default:
      return content.errors.unknown;
  }
}

export function isUnauthorized(error: unknown) {
  return error instanceof TRPCClientError && (error as TRPCClientError<AppRouter>).data?.code === 'UNAUTHORIZED';
}
