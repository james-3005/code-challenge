import { useEffect, useState } from 'react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownUp, ChevronDown, Moon, Sun, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { calculateOutput, fallbackRates, formatAmount, normalizeRates, sanitizeAmount } from './rates';
import './styles.css';

const priceUrl = 'https://interview.switcheo.com/prices.json';

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

function AssetSelect({ label, currency, rates, onChange }) {
  return (
    <label className="asset-select">
      <span className="sr-only">{label} asset</span>
      <TokenIcon currency={currency} />
      <span className="asset-code">{currency}</span>
      <select value={currency} onChange={(event) => onChange(event.target.value)} aria-label={`${label} asset`}>
        {rates.map((rate) => <option key={rate.currency} value={rate.currency}>{rate.currency}</option>)}
      </select>
      <ChevronDown size={16} strokeWidth={2.5} />
    </label>
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
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
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
    setValue('inputCurrency', outputCurrency, { shouldValidate: true });
    setValue('outputCurrency', inputCurrency, { shouldValidate: true });
  }

  async function submitSwap(values) {
    setConfirmation('');
    setSwapProgress(8);
    const progressTimer = window.setInterval(() => {
      setSwapProgress((value) => Math.min(value + 16, 88));
    }, 120);
    await new Promise((resolve) => setTimeout(resolve, 760));
    window.clearInterval(progressTimer);
    setSwapProgress(100);
    setConfirmation(`Swap complete: ${formatAmount(values.amount)} ${values.inputCurrency} to ${formatAmount(receivedAmount)} ${values.outputCurrency}.`);
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
              <div className="field-label"><label htmlFor="amount">You pay</label><span>Balance: 0.00</span></div>
              <div className="amount-row"><input id="amount" type="text" inputMode="decimal" placeholder="0.00" autoComplete="off" aria-invalid={Boolean(errors.amount)} {...amountField} value={amount ?? ''} onKeyDown={handleAmountKeyDown} onPaste={(event) => { event.preventDefault(); setValue('amount', sanitizeAmount(event.clipboardData.getData('text')), { shouldValidate: true }); }} onDrop={(event) => event.preventDefault()} onChange={(event) => setValue('amount', sanitizeAmount(event.target.value), { shouldValidate: true })} /><AssetSelect label="Input" currency={inputCurrency} rates={rates} onChange={(value) => { setConfirmation(''); setValue('inputCurrency', value, { shouldValidate: true }); }} /></div>
              {errors.amount && <p className="field-error" role="alert">{errors.amount.message}</p>}
            </div>
            <button className="switch-button" type="button" onClick={swapAssets} aria-label="Switch input and output assets"><ArrowDownUp size={18} /></button>
            <div className="field-card receive-card">
              <div className="field-label"><label htmlFor="receive">You receive</label><span>Estimated</span></div>
              <div className="amount-row"><output id="receive">{amount && receivedAmount ? formatAmount(receivedAmount) : '0.00'}</output><AssetSelect label="Output" currency={outputCurrency} rates={rates} onChange={(value) => { setConfirmation(''); setValue('outputCurrency', value, { shouldValidate: true }); }} /></div>
              {errors.outputCurrency && <p className="field-error" role="alert">{errors.outputCurrency.message}</p>}
            </div>
            <div className="quote-summary"><span>Rate</span><strong>{isLoading ? 'Updating quote...' : `1 ${inputCurrency} = ${formatAmount(exchangeRate)} ${outputCurrency}`}</strong></div>
            {usingFallback && <p className="source-note">Showing cached market prices while the live quote reconnects.</p>}
            <button className="swap-submit" type="submit" disabled={isSubmitting || isLoading}>{isSubmitting ? 'Swapping...' : 'Swap'}<span>→</span></button>
            <div className={`confirmation ${confirmation || isSubmitting ? 'is-visible' : ''}`} role="status" aria-live="polite">
              {isSubmitting ? <div className="progress-state"><div><span>{progressLabel}</span><strong>{swapProgress}%</strong></div><i><b style={{ width: `${swapProgress}%` }} /></i></div> : confirmation && <><span>{confirmation}</span><button type="button" onClick={() => setConfirmation('')} aria-label="Dismiss confirmation"><X size={15} /></button></>}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default App;
