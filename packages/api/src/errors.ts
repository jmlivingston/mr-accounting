import { TRPCError, type TRPC_ERROR_CODE_KEY } from '@trpc/server';

// Stable identifiers the client maps to localized text; `message` stays English for logs and API users
export type ErrorReason = 'invalidCredentials' | 'invalidCsrfToken' | 'insufficientFunds' | 'validation';

export class ApiError extends TRPCError {
  readonly reason: ErrorReason;

  constructor(options: { code: TRPC_ERROR_CODE_KEY; reason: ErrorReason; message: string }) {
    super({ code: options.code, message: options.message });
    this.reason = options.reason;
  }
}
