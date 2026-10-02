import { initTRPC, TRPCError } from '@trpc/server'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { ZodError } from 'zod'
import { session } from './config'
import { verifyAccessToken } from './services/authService'

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const token = req.cookies?.[session.cookieName]
  const claims =
    typeof token === 'string' ? await verifyAccessToken(token) : null
  const csrfHeader = req.get(session.csrfHeader)
  return { req, res, claims, csrfHeader }
}

type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create({
  isDev: false,
  errorFormatter({ shape, error }) {
    if (error.cause instanceof ZodError) {
      const message = error.cause.issues
        .map(({ path, message }) => `${path.join('.')}: ${message}`)
        .join('; ')
      return { ...shape, message }
    }
    if (shape.data.code === 'INTERNAL_SERVER_ERROR') {
      return { ...shape, message: 'Internal server error' }
    }
    return shape
  },
})

export const router = t.router
export const publicProcedure = t.procedure

const requireSession = t.middleware(({ ctx, type, next }) => {
  if (!ctx.claims) throw new TRPCError({ code: 'UNAUTHORIZED' })
  if (type === 'mutation' && ctx.csrfHeader !== ctx.claims.csrfToken) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid CSRF token' })
  }
  return next({ ctx: { ...ctx, claims: ctx.claims } })
})

export const authenticatedProcedure = t.procedure.use(requireSession)

export function scopedProcedure(scope: string) {
  return authenticatedProcedure.use(({ ctx, next }) => {
    if (!ctx.claims.scopes.includes(scope)) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    return next()
  })
}
