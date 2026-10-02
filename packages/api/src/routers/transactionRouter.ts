import { scopes } from '../config';
import { ApiError } from '../errors';
import { transactionInputSchema } from '../schemas/transaction';
import {
  addTransaction,
  getBalance,
  getRecentTransactions,
  InsufficientFundsError,
} from '../services/transactionService';
import { router, scopedProcedure } from '../trpc';

const readProcedure = scopedProcedure(scopes.transactionsRead);
const writeProcedure = scopedProcedure(scopes.transactionsWrite);

export const transactionRouter = router({
  balance: readProcedure.query(async () => ({ balance: await getBalance() })),
  recent: readProcedure.query(() => getRecentTransactions()),
  create: writeProcedure.input(transactionInputSchema).mutation(async ({ input }) => {
    try {
      return await addTransaction(input);
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        throw new ApiError({ code: 'BAD_REQUEST', reason: 'insufficientFunds', message: error.message });
      }
      throw error;
    }
  }),
});
