import { useAccount } from '../hooks/useAccount'
import { Balance } from './Balance'
import { TransactionForm } from './TransactionForm'
import { TransactionList } from './TransactionList'

type Props = {
  onSessionExpired: () => void
}

export function Dashboard({ onSessionExpired }: Props) {
  const { balance, transactions, loadError, addTransaction } =
    useAccount(onSessionExpired)

  return (
    <>
      {loadError && <p role="alert">{loadError}</p>}
      <Balance balance={balance} />
      <TransactionForm onSubmit={addTransaction} />
      <TransactionList transactions={transactions} />
    </>
  )
}
