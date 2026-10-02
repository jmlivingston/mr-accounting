import { createTRPCClient, httpBatchLink, TRPCClientError, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { AppRouter } from 'api';
import { errorCodes } from 'api/constants';
import { apiUrl, authLoginPath, csrfHeader } from '../constants';
import { content } from '../content/content';
import { sessionStore } from '../session/sessionStore';

// A 401 from login means wrong credentials, not an expired session
const endSessionWhenUnauthorized: TRPCLink<AppRouter> = () => {
  return ({ op, next }) =>
    observable((observer) =>
      next(op).subscribe({
        next: (value) => observer.next(value),
        error(error) {
          if (op.path !== authLoginPath && error.data?.code === errorCodes.unauthorized) sessionStore.end();
          observer.error(error);
        },
        complete: () => observer.complete(),
      }),
    );
};

export const trpc = createTRPCClient<AppRouter>({
  links: [
    endSessionWhenUnauthorized,
    httpBatchLink({
      url: `${apiUrl}/trpc`,
      fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
      headers: () => {
        const csrfToken = sessionStore.getCsrfToken();
        return csrfToken ? { [csrfHeader]: csrfToken } : {};
      },
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
    case errorCodes.unauthorized:
      return content.errors.unauthorized;
    case errorCodes.forbidden:
      return content.errors.forbidden;
    case errorCodes.internalServerError:
      return content.errors.internal;
    default:
      return content.errors.unknown;
  }
}
