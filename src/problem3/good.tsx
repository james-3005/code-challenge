interface WalletBalance {
  blockchain: string;
  currency: string;
  amount: number;
}

interface Props extends BoxProps {}

const priorities: Record<string, number> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20
};

function getPriority(blockchain: string): number {
  return priorities[blockchain] ?? -1;
}

const WalletPage = ({ ...rest }: Props) => {
  const balances = useWalletBalances();
  const prices = usePrices();

  const sortedBalances = useMemo(
    () => balances
      .filter((balance: WalletBalance) => balance.amount > 0 && getPriority(balance.blockchain) >= 0)
      .sort((left: WalletBalance, right: WalletBalance) => getPriority(right.blockchain) - getPriority(left.blockchain)),
    [balances]
  );

  const rows = useMemo(
    () => sortedBalances.map((balance: WalletBalance) => (
      <WalletRow
        className={classes.row}
        key={`${balance.blockchain}-${balance.currency}`}
        amount={balance.amount}
        usdValue={(prices[balance.currency] ?? 0) * balance.amount}
        formattedAmount={balance.amount.toFixed(2)}
      />
    )),
    [prices, sortedBalances]
  );

  return <div {...rest}>{rows}</div>;
};

export default WalletPage;
