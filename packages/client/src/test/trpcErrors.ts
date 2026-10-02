import { TRPCClientError } from '@trpc/client';

// Builds the error the real client produces when the server answers with a tRPC error
export function trpcError(code: string, reason?: string, message = code) {
  return new TRPCClientError(message, {
    result: { error: { message, code: -32000, data: { code, httpStatus: 400, reason } } } as never,
  });
}
