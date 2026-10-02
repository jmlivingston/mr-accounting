import type { TRPC_ERROR_CODE_KEY } from '@trpc/server';

// Shared with the client, which maps reasons to localized text
export const errorReasons = {
  invalidCredentials: 'invalidCredentials',
  invalidCsrfToken: 'invalidCsrfToken',
  insufficientFunds: 'insufficientFunds',
  validation: 'validation',
} as const;

export type ErrorReason = (typeof errorReasons)[keyof typeof errorReasons];

export const errorCodes = {
  badRequest: 'BAD_REQUEST',
  forbidden: 'FORBIDDEN',
  internalServerError: 'INTERNAL_SERVER_ERROR',
  unauthorized: 'UNAUTHORIZED',
} as const satisfies Record<string, TRPC_ERROR_CODE_KEY>;
