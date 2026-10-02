import { TRPCClientError } from '@trpc/client';

export function trpcError(code: string, reason?: string, message = code) {
  return new TRPCClientError(message, {
    result: { error: { message, code: -32000, data: { code, httpStatus: 400, reason } } } as never,
  });
}
