import { authRouter } from './routers/authRouter'
import { transactionRouter } from './routers/transactionRouter'
import { router } from './trpc'

export const appRouter = router({
  auth: authRouter,
  transactions: transactionRouter,
})

export type AppRouter = typeof appRouter
