interface WalletBalance {
  currency: string;
  amount: number;
}
// FormattedWalletBalance should extend from WalletBalance to avoid duplicating the currency and amount properties.
interface FormattedWalletBalance {
  currency: string;
  amount: number;
  formatted: string;
}
// Props are extend but not using BoxProps
interface Props extends BoxProps {

}
const WalletPage: React.FC<Props> = (props: Props) => {
  // Children is destructured but never rendered or otherwise used.
  const { children, ...rest } = props;
  const balances = useWalletBalances();
  const prices = usePrices();

  // Bad: any disables type checking for supported blockchain values. and should be using useCallback to memoize the function and avoid recreating it on every render.
 	const getPriority = (blockchain: any): number => {
	  switch (blockchain) {
	    case 'Osmosis':
	      return 100
	    case 'Ethereum':
	      return 50
	    case 'Arbitrum':
	      return 30
	    case 'Zilliqa':
	      return 20
	    case 'Neo':
	      return 20
	    default:
	      return -99
	  }
	}

  // Bad: this helper is recreated on every render instead of being defined outside the component.
   const sortedBalances = useMemo(() => {
    return balances.filter((balance: WalletBalance) => {
		  // WalletBalance is declare but not use
		  const balancePriority = getPriority(balance.blockchain);
		  // lhsPriority is undefined, causing this filter to throw at runtime.
		  if (lhsPriority > -99) {
		     // This keeps zero or negative balances instead of positive balances.
		     if (balance.amount <= 0) {
		       return true;
		     }
		  }
		  return false
		}).sort((lhs: WalletBalance, rhs: WalletBalance) => {
			const leftPriority = getPriority(lhs.blockchain);
		  const rightPriority = getPriority(rhs.blockchain);
		  if (leftPriority > rightPriority) {
		    return -1;
		  } else if (rightPriority > leftPriority) {
		    return 1;
		  // Equal priorities return undefined instead of 0.
		  }
    });
   // Prices is not used by this calculation and triggers unnecessary sorting.
   }, [balances, prices]);

  // This derived array is calculated but never used.
   const formattedBalances = sortedBalances.map((balance: WalletBalance) => {
    return {
      ...balance,
      formatted: balance.amount.toFixed()
    }
  })

  // sortedBalances contains WalletBalance values, not FormattedWalletBalance values.
   const rows = sortedBalances.map((balance: FormattedWalletBalance, index: number) => {
     const usdValue = prices[balance.currency] * balance.amount;
    return (
      <WalletRow 
        className={classes.row}
        {/* Array indexes are unstable keys when balances are sorted or filtered. */}
        key={index}
        amount={balance.amount}
        usdValue={usdValue}
        formattedAmount={balance.formatted}
      />
    )
  })

  return (
    <div {...rest}>
      {rows}
    </div>
  )
}
