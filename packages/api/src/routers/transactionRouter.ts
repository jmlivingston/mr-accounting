import { scopes } from '../config';
import { ApiError } from '../errors';
import { transactionInputSchema } from '../schemas/transaction';
import { router, scopedProcedure } from '../trpc';

const readProcedure = scopedProcedure(scopes.transactionsRead);
const writeProcedure = scopedProcedure(scopes.transactionsWrite);

export const transactionRouter = router({
  account: readProcedure.query(({ ctx }) => ctx.ledger.snapshot()),
  balance: readProcedure.query(async ({ ctx }) => ({ balance: (await ctx.ledger.snapshot()).balance })),
  recent: readProcedure.query(async ({ ctx }) => (await ctx.ledger.snapshot()).transactions),
  create: writeProcedure.input(transactionInputSchema).mutation(async ({ input, ctx }) => {
    const result = await ctx.ledger.post(input);
    if (!result.ok) {
      throw new ApiError({
        code: 'BAD_REQUEST',
        reason: result.reason,
        message: 'Insufficient funds: this transaction would result in a negative balance',
      });
    }
    return result.transaction;
  }),
});
