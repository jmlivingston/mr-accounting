import type { Transaction, TransactionInput } from 'api/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, isUnauthorized, trpc } from '../api/trpcClient';

export function useAccount(onSessionExpired: () => void) {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Read through a ref so an unstable callback from the caller can't re-trigger the load effect
  const onSessionExpiredRef = useRef(onSessionExpired);
  useEffect(() => {
    onSessionExpiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  const handleError = useCallback((error: unknown) => {
    if (isUnauthorized(error)) onSessionExpiredRef.current();
    return getErrorMessage(error);
  }, []);

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
        .catch((error) => setLoadError(handleError(error)))
    );
  }, [handleError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      try {
        await trpc.transactions.create.mutate(input);
      } catch (error) {
        throw new Error(handleError(error), { cause: error });
      }
      await refresh();
    },
    [handleError, refresh],
  );

  return { balance, transactions, loadError, addTransaction };
}
