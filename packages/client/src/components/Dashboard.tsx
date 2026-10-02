import { useAccount } from '../hooks/useAccount';
import { Balance } from './Balance';
import { ErrorAlert } from './ErrorAlert';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';

export default function Dashboard() {
  const { balance, transactions, loadError, addTransaction } = useAccount();

  return (
    <>
      {loadError && <ErrorAlert>{loadError}</ErrorAlert>}
      <Balance balance={balance} />
      <TransactionForm onSubmit={addTransaction} />
      <TransactionList transactions={transactions} />
    </>
  );
}
