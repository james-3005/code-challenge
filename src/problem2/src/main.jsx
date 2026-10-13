import { useEffect, useState } from 'react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownUp, ChevronDown, Moon, Search, Sun, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { calculateOutput, fallbackRates, formatAmount, normalizeRates, sanitizeAmount } from './rates';
import './styles.css';

const priceUrl = 'https://interview.switcheo.com/prices.json';
const feeRate = 0.0025;
const slippageRate = 0.005;
const startingBalances = { USDC: 1250, ETH: 1.8, WBTC: 0.05, ATOM: 240, OSMO: 860, SWTH: 240000 };

const formSchema = z.object({
  amount: z.coerce.number({ error: 'Enter an amount to continue.' }).positive('Amount must be greater than zero.'),
  inputCurrency: z.string().min(1),
  outputCurrency: z.string().min(1)
}).refine((values) => values.inputCurrency !== values.outputCurrency, {
  message: 'Choose two different assets.',
  path: ['outputCurrency']
});

function TokenIcon({ currency, size = 'medium' }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={`token-icon token-icon-${size}`} aria-hidden="true">
      {!failed && <img src={`https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/${currency}.svg`} alt="" onError={() => setFailed(true)} />}
      <span>{currency.slice(0, 1)}</span>
    </span>
  );
}

function TokenPicker({ activeCurrency, unavailableCurrency, rates, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const visibleRates = rates.filter((rate) => rate.currency.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="token-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="token-dialog" role="dialog" aria-modal="true" aria-labelledby="token-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading"><h2 id="token-dialog-title">Select a token</h2><button type="button" onClick={onClose} aria-label="Close token selection"><X size={18} /></button></div>
        <label className="token-search"><Search size={16} /><span className="sr-only">Search tokens</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tokens" /></label>
        <div className="token-list">
          {visibleRates.map((rate) => {
            const isUnavailable = rate.currency === unavailableCurrency;
            return <button className="token-option" type="button" key={rate.currency} disabled={isUnavailable} onClick={() => { onSelect(rate.currency); onClose(); }}><TokenIcon currency={rate.currency} /><span>{rate.currency}</span><small>{isUnavailable ? 'In use' : `$${formatAmount(rate.price, 4)}`}</small>{rate.currency === activeCurrency && <i>Selected</i>}</button>;
          })}
        </div>
      </section>
    </div>
  );
}

function handleAmountKeyDown(event) {
  if (event.metaKey || event.ctrlKey || ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return;
  }

  if (!/^[0-9.]$/.test(event.key) || (event.key === '.' && event.currentTarget.value.includes('.'))) {
    event.preventDefault();
  }
}

function App() {
  const [rates, setRates] = useState(fallbackRates);
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('axis-theme') !== 'light');
  const [confirmation, setConfirmation] = useState('');
  const [swapProgress, setSwapProgress] = useState(0);
  const [balances, setBalances] = useState(startingBalances);
  const [pickerField, setPickerField] = useState('');
  const { register, handleSubmit, setError, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: '', inputCurrency: 'USDC', outputCurrency: 'ETH' },
    mode: 'onBlur'
  });
  const amount = watch('amount');
  const inputCurrency = watch('inputCurrency');
  const outputCurrency = watch('outputCurrency');
  const inputRate = rates.find((rate) => rate.currency === inputCurrency);
  const outputRate = rates.find((rate) => rate.currency === outputCurrency);
  const receivedAmount = calculateOutput(amount, inputRate?.price, outputRate?.price);
  const exchangeRate = calculateOutput(1, inputRate?.price, outputRate?.price);
  const numericAmount = Number(amount);
  const inputBalance = balances[inputCurrency] ?? 0;
  const feeAmount = numericAmount > 0 ? numericAmount * feeRate : 0;
  const minimumReceived = receivedAmount > 0 ? receivedAmount * (1 - feeRate) * (1 - slippageRate) : 0;
  const isInsufficientBalance = numericAmount > inputBalance;
  const canSubmit = !isLoading && numericAmount > 0 && inputCurrency !== outputCurrency && !isInsufficientBalance;
  const amountField = register('amount');

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('axis-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const controller = new AbortController();

    axios.get(priceUrl, { signal: controller.signal })
      .then(({ data }) => {
        const nextRates = normalizeRates(data);
        if (!nextRates.length) throw new Error('No prices available');
        setRates(nextRates);
        setUsingFallback(false);
      })
      .catch((error) => {
        if (error.name !== 'CanceledError') setUsingFallback(true);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  function swapAssets() {
    setConfirmation('');
    if (receivedAmount > 0) setValue('amount', Number(receivedAmount.toFixed(8)).toString(), { shouldValidate: true });
    setValue('inputCurrency', outputCurrency, { shouldValidate: true });
    setValue('outputCurrency', inputCurrency, { shouldValidate: true });
  }

  async function submitSwap(values) {
    if (values.amount > inputBalance) {
      setError('amount', { message: `Insufficient ${values.inputCurrency} balance.` });
      return;
    }

    setConfirmation('');
    setSwapProgress(8);
    const progressTimer = window.setInterval(() => {
      setSwapProgress((value) => Math.min(value + 16, 88));
    }, 120);
    await new Promise((resolve) => setTimeout(resolve, 760));
    window.clearInterval(progressTimer);
    setSwapProgress(100);
    const settledAmount = receivedAmount * (1 - feeRate);
    setBalances((currentBalances) => ({
      ...currentBalances,
      [values.inputCurrency]: currentBalances[values.inputCurrency] - values.amount,
      [values.outputCurrency]: (currentBalances[values.outputCurrency] ?? 0) + settledAmount
    }));
    setValue('amount', '');
    setConfirmation(`Swapped ${formatAmount(values.amount)} ${values.inputCurrency} to ${formatAmount(settledAmount)} ${values.outputCurrency}.`);
  }

  const progressLabel = swapProgress < 45 ? 'Checking route' : swapProgress < 90 ? 'Preparing swap' : 'Finalizing';

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#swap">Swap</a>
        <div className="topbar-actions">
          <button className="theme-button" type="button" onClick={() => setIsDark((value) => !value)} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <section className="workspace" aria-labelledby="swap-title">
        <div className="swap-layout">
          <form className="swap-card" id="swap" onSubmit={handleSubmit(submitSwap)} noValidate>
            <div className="card-heading"><div><p className="eyebrow">Trade</p><h1 id="swap-title">Swap assets</h1></div></div>
            <div className="field-card">
              <div className="field-label"><label htmlFor="amount">You pay</label><span>Balance: {formatAmount(inputBalance, 4)} {inputCurrency}</span></div>
              <div className="amount-row"><input id="amount" type="text" inputMode="decimal" placeholder="0.00" autoComplete="off" aria-invalid={Boolean(errors.amount)} {...amountField} value={amount ?? ''} onKeyDown={handleAmountKeyDown} onPaste={(event) => { event.preventDefault(); setValue('amount', sanitizeAmount(event.clipboardData.getData('text')), { shouldValidate: true }); }} onDrop={(event) => event.preventDefault()} onChange={(event) => setValue('amount', sanitizeAmount(event.target.value), { shouldValidate: true })} /><button className="asset-select" type="button" onClick={() => setPickerField('input')} aria-label="Select input asset"><TokenIcon currency={inputCurrency} /><span className="asset-code">{inputCurrency}</span><ChevronDown size={16} strokeWidth={2.5} /></button></div>
              <div className="field-meta"><span>${formatAmount((numericAmount || 0) * (inputRate?.price ?? 0), 2)}</span><button type="button" onClick={() => setValue('amount', Number(inputBalance.toFixed(8)).toString(), { shouldValidate: true })}>MAX {formatAmount(inputBalance, 4)}</button></div>
              {errors.amount && <p className="field-error" role="alert">{errors.amount.message}</p>}
            </div>
            <button className="switch-button" type="button" onClick={swapAssets} aria-label="Switch input and output assets"><ArrowDownUp size={18} /></button>
            <div className="field-card receive-card">
              <div className="field-label"><label htmlFor="receive">You receive</label><span>Estimated</span></div>
              <div className="amount-row"><output id="receive">{amount && receivedAmount ? formatAmount(receivedAmount * (1 - feeRate)) : '0.00'}</output><button className="asset-select" type="button" onClick={() => setPickerField('output')} aria-label="Select output asset"><TokenIcon currency={outputCurrency} /><span className="asset-code">{outputCurrency}</span><ChevronDown size={16} strokeWidth={2.5} /></button></div>
              <div className="field-meta"><span>${formatAmount(receivedAmount * (1 - feeRate) * (outputRate?.price ?? 0), 2)}</span><span>Balance: {formatAmount(balances[outputCurrency] ?? 0, 4)}</span></div>
              {errors.outputCurrency && <p className="field-error" role="alert">{errors.outputCurrency.message}</p>}
            </div>
            <dl className="quote-summary"><div><dt>Rate</dt><dd>{isLoading ? 'Updating quote...' : `1 ${inputCurrency} = ${formatAmount(exchangeRate)} ${outputCurrency}`}</dd></div><div><dt>Protocol fee</dt><dd>{formatAmount(feeAmount, 6)} {inputCurrency}</dd></div><div><dt>Minimum received</dt><dd>{formatAmount(minimumReceived)} {outputCurrency}</dd></div></dl>
            {usingFallback && <p className="source-note">Showing cached market prices while the live quote reconnects.</p>}
            <button className="swap-submit" type="submit" disabled={isSubmitting || !canSubmit}>{isSubmitting ? 'Swapping...' : isLoading ? 'Updating quote...' : !amount ? 'Enter an amount' : isInsufficientBalance ? `Insufficient ${inputCurrency}` : 'Swap'}<span>→</span></button>
            <div className={`confirmation ${confirmation || isSubmitting ? 'is-visible' : ''}`} role="status" aria-live="polite">
              {isSubmitting ? <div className="progress-state"><div><span>{progressLabel}</span><strong>{swapProgress}%</strong></div><i><b style={{ width: `${swapProgress}%` }} /></i></div> : confirmation && <><span>{confirmation}</span><button type="button" onClick={() => setConfirmation('')} aria-label="Dismiss confirmation"><X size={15} /></button></>}
            </div>
          </form>
        </div>
      </section>
      {pickerField && <TokenPicker activeCurrency={pickerField === 'input' ? inputCurrency : outputCurrency} unavailableCurrency={pickerField === 'input' ? outputCurrency : inputCurrency} rates={rates} onClose={() => setPickerField('')} onSelect={(currency) => { setConfirmation(''); setValue(pickerField === 'input' ? 'inputCurrency' : 'outputCurrency', currency, { shouldValidate: true }); }} />}
    </main>
  );
}

export default App;
