# Problem 3

- `bad.tsx` marks each issue directly beside the relevant code.
- `good.tsx` filters positive balances on supported blockchains before sorting by priority.
- The corrected version removes the undefined variable, mismatched balance type, unused formatting pass, and unnecessary dependency.
- Rows use a stable blockchain-currency key, safe missing-price handling, and two-decimal formatting.
- The surrounding project is expected to provide `BoxProps`, `WalletRow`, `classes`, `useWalletBalances`, and `usePrices`.
