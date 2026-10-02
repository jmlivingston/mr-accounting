# Accounting

A single-user accounting system: one account, a history of single transactions, and a balance that can never go negative.

## Language

**Transaction**:
A single dated credit or debit of a positive amount, with a description.
_Avoid_: Entry, payment, record

**Credit**:
A Transaction that increases the Balance.
_Avoid_: Deposit, income

**Debit**:
A Transaction that decreases the Balance.
_Avoid_: Withdrawal, expense

**Balance**:
Credits minus Debits across all Transactions. Never negative.
_Avoid_: Total, funds

**Ledger**:
The record of every Transaction and the rules for adding one, chiefly that a Transaction which would make the Balance negative is rejected.
_Avoid_: Transaction history, store

**Account snapshot**:
The Balance together with the most recent Transactions, read from the Ledger at one moment.
_Avoid_: Account (the Account is the user's view; the snapshot is the read)

**Insufficient funds**:
The rejection of a Transaction that would make the Balance negative.
_Avoid_: Overdraft

**Session**:
The period during which the user is logged in. It ends on logout or when the server stops accepting it.
_Avoid_: Login, auth state, token
