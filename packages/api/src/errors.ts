import { TRPCError, type TRPC_ERROR_CODE_KEY } from '@trpc/server';
import type { ErrorReason } from './constants';

// Stable identifiers the client maps to localized text; `message` stays English for logs and API users

export class ApiError extends TRPCError {
  readonly reason: ErrorReason;

  constructor(options: { code: TRPC_ERROR_CODE_KEY; reason: ErrorReason; message: string }) {
    super({ code: options.code, message: options.message });
    this.reason = options.reason;
  }
}
