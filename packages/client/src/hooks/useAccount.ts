import type { Transaction, TransactionInput } from 'api/schemas';
import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, trpc } from '../api/trpcClient';

export function useAccount() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    return (
      trpc.transactions.account
        .query()
        .then((account) => {
          setBalance(account.balance);
          setTransactions(account.transactions);
          setLoadError(null);
        })
        // Runs after the request settles, not synchronously inside the effect
        // eslint-disable-next-line @eslint-react/set-state-in-effect
        .catch((error) => setLoadError(getErrorMessage(error)))
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      try {
        await trpc.transactions.create.mutate(input);
      } catch (error) {
        throw new Error(getErrorMessage(error), { cause: error });
      }
      await refresh();
    },
    [refresh],
  );

  return { balance, transactions, loadError, addTransaction };
}
