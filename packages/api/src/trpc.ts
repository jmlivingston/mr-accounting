import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { $ZodError } from 'zod/v4/core';
import { session } from './config';
import { ApiError, type ErrorReason } from './errors';
import type { Ledger } from './ledger/ledger';
import { verifyAccessToken } from './services/authService';

export function createContext(ledger: Ledger) {
  return async ({ req, res }: CreateExpressContextOptions) => {
    const token: unknown = req.cookies?.[session.cookieName];
    const claims = typeof token === 'string' ? await verifyAccessToken(token) : null;
    const csrfHeader = req.get(session.csrfHeader);
    return { req, res, claims, csrfHeader, ledger };
  };
}

type Context = Awaited<ReturnType<ReturnType<typeof createContext>>>;

const t = initTRPC.context<Context>().create({
  isDev: false,
  errorFormatter({ shape, error }) {
    // Only input validation failures are safe to show; other Zod errors come from stored data
    const validationError = error.code === 'BAD_REQUEST' && error.cause instanceof $ZodError ? error.cause : null;
    let message = shape.message;
    let reason: ErrorReason | undefined = error instanceof ApiError ? error.reason : undefined;
    if (validationError) {
      message = validationError.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; ');
      reason = 'validation';
    } else if (shape.data.code === 'INTERNAL_SERVER_ERROR') {
      message = 'Internal server error';
    }
    return { ...shape, message, data: { ...shape.data, reason } };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireSession = t.middleware(({ ctx, type, next }) => {
  if (!ctx.claims) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (type === 'mutation' && ctx.csrfHeader !== ctx.claims.csrfToken) {
    throw new ApiError({ code: 'FORBIDDEN', reason: 'invalidCsrfToken', message: 'Invalid CSRF token' });
  }
  return next({ ctx: { ...ctx, claims: ctx.claims } });
});

export const authenticatedProcedure = t.procedure.use(requireSession);

export function scopedProcedure(scope: string) {
  return authenticatedProcedure.use(({ ctx, next }) => {
    if (!ctx.claims.scopes.includes(scope)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next();
  });
}
