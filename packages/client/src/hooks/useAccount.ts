import type { Transaction, TransactionInput } from 'api/schemas'
import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage, isUnauthorized, trpc } from '../api/trpcClient'

async function fetchAccount() {
  const [{ balance }, transactions] = await Promise.all([
    trpc.transactions.balance.query(),
    trpc.transactions.recent.query(),
  ])
  return { balance, transactions }
}

export function useAccount(onSessionExpired: () => void) {
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const handleError = useCallback(
    (error: unknown) => {
      if (isUnauthorized(error)) onSessionExpired()
      return getErrorMessage(error)
    },
    [onSessionExpired],
  )

  const refresh = useCallback(() => {
    return fetchAccount()
      .then((account) => {
        setBalance(account.balance)
        setTransactions(account.transactions)
        setLoadError(null)
      })
      .catch((error) => setLoadError(handleError(error)))
  }, [handleError])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      try {
        await trpc.transactions.create.mutate(input)
      } catch (error) {
        throw new Error(handleError(error), { cause: error })
      }
      await refresh()
    },
    [handleError, refresh],
  )

  return { balance, transactions, loadError, addTransaction }
}
