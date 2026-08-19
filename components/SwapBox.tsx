'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowDownUp, Check, ChevronDown, Loader2, Search, Settings2, ShieldAlert, Sparkles, X } from 'lucide-react';
import { fetchBalance, fetchQuote, fetchTokens, FALLBACK_TOKENS, formatTokenAmount, SOL_MINT, toAtomicAmount, executeSwap, type QuoteResponse, type Token } from '@/lib/jupiter';

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer); }, [value, delay]);
  return debounced;
}

function TokenIcon({ token, small = false }: { token: Token; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  return token.logoURI && !failed ? <img className={`${small ? 'h-7 w-7' : 'h-9 w-9'} rounded-full bg-[#173028]`} src={token.logoURI} alt="" onError={() => setFailed(true)} /> : <span className={`${small ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'} grid place-items-center rounded-full bg-[#18352a] font-bold text-[#a3f34b]`}>{token.symbol.slice(0, 2)}</span>;
}

export default function SwapBox() {
  const { publicKey, connected, signTransaction } = useWallet();
  const [tokens, setTokens] = useState<Token[]>(FALLBACK_TOKENS);
  const [from, setFrom] = useState(FALLBACK_TOKENS[0]);
  const [to, setTo] = useState(FALLBACK_TOKENS[1]);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [query, setQuery] = useState('');
  const debouncedAmount = useDebouncedValue(amount, 500);

  useEffect(() => { fetchTokens().then(setTokens); }, []);
  useEffect(() => {
    if (!publicKey) { setBalance(null); return; }
    fetchBalance(publicKey, from.address).then(setBalance).catch(() => setBalance(null));
  }, [publicKey, from.address]);
  useEffect(() => {
    let cancelled = false;
    if (!debouncedAmount || Number(debouncedAmount) <= 0 || from.address === to.address) { setQuote(null); return; }
    setLoadingQuote(true); setNotice(null);
    try {
      const atomic = toAtomicAmount(debouncedAmount, from.decimals);
      fetchQuote(from.address, to.address, atomic, slippage).then((next) => { if (!cancelled) setQuote(next); }).catch((error: Error) => { if (!cancelled) { setQuote(null); setNotice({ type: 'error', text: error.message }); } }).finally(() => { if (!cancelled) setLoadingQuote(false); });
    } catch (error) { setLoadingQuote(false); setQuote(null); setNotice({ type: 'error', text: (error as Error).message }); }
    return () => { cancelled = true; };
  }, [debouncedAmount, from, to, slippage]);

  const impact = quote ? Number(quote.priceImpactPct) : 0;
  const filteredTokens = useMemo(() => tokens.filter((token) => `${token.symbol} ${token.name}`.toLowerCase().includes(query.toLowerCase())), [tokens, query]);
  const outputAmount = quote ? formatTokenAmount(quote.outAmount, to.decimals) : '0.00';

  const selectToken = (token: Token) => { if (picker === 'from') { if (token.address === to.address) setTo(from); setFrom(token); } else { if (token.address === from.address) setFrom(to); setTo(token); } setPicker(null); setQuery(''); setQuote(null); };
  const reverse = () => { setFrom(to); setTo(from); setAmount(quote ? outputAmount.replace(/,/g, '') : ''); setQuote(null); };
  const handleSwap = useCallback(async () => {
    if (!connected || !publicKey || !signTransaction) { setNotice({ type: 'error', text: 'Connect your wallet to continue.' }); return; }
    if (!quote) return;
    if (impact > 5 && !window.confirm(`This route has ${impact.toFixed(2)}% price impact. Continue?`)) return;
    setSwapping(true); setNotice(null);
    try { const signature = await executeSwap({ quote, userPublicKey: publicKey, signTransaction }); setNotice({ type: 'success', text: `Swap confirmed · ${signature.slice(0, 8)}…` }); setAmount(''); setQuote(null); fetchBalance(publicKey, from.address).then(setBalance); }
    catch (error) { setNotice({ type: 'error', text: (error as Error).message }); }
    finally { setSwapping(false); }
  }, [connected, publicKey, signTransaction, quote, impact, from.address]);

  return <section id="swap" className="relative mx-auto w-full max-w-[520px]">
    <div className="absolute -inset-4 -z-10 rounded-[36px] bg-[#a3f34b]/[0.06] blur-3xl" />
    <div className="rounded-[28px] border border-white/10 bg-[#101b18]/95 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-4">
      <div className="flex items-center justify-between px-2 pb-4"><div><h2 className="text-lg font-semibold text-white">Swap assets</h2><p className="mt-1 text-xs text-[#809189]">Best execution across Solana liquidity</p></div><button className="rounded-xl border border-white/10 p-2.5 text-[#93a49c] transition hover:border-white/20 hover:text-white" aria-label="Swap settings"><Settings2 size={18} /></button></div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1412] p-4"><div className="mb-3 flex items-center justify-between text-xs text-[#7f9188]"><span>You pay</span><span>{balance === null ? 'Balance —' : `Balance ${balance.toLocaleString(undefined, { maximumFractionDigits: 5 })}`} {balance !== null && <button onClick={() => setAmount(String(balance))} className="ml-1 text-[#a3f34b] hover:underline">MAX</button>}</span></div><div className="flex items-center gap-3"><input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0.00" className="min-w-0 flex-1 bg-transparent text-3xl font-medium tracking-tight text-white outline-none placeholder:text-[#344740]" /><button onClick={() => setPicker('from')} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#182821] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#20352b]"><TokenIcon token={from} small />{from.symbol}<ChevronDown size={15} className="text-[#8ba097]" /></button></div></div>
      <div className="relative z-10 -my-3 flex justify-center"><button onClick={reverse} className="grid h-10 w-10 place-items-center rounded-xl border-4 border-[#101b18] bg-[#a3f34b] text-[#09110f] transition hover:rotate-180 hover:bg-[#bafa70]" aria-label="Reverse swap"><ArrowDownUp size={17} strokeWidth={2.5} /></button></div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1412] p-4"><div className="mb-3 flex items-center justify-between text-xs text-[#7f9188]"><span>You receive</span><span>{quote ? 'Estimated output' : 'Balance —'}</span></div><div className="flex items-center gap-3"><div className="min-w-0 flex-1 text-3xl font-medium tracking-tight text-white">{loadingQuote ? <Loader2 className="animate-spin text-[#a3f34b]" size={27} /> : <span>{outputAmount}</span>}</div><button onClick={() => setPicker('to')} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#182821] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#20352b]"><TokenIcon token={to} small />{to.symbol}<ChevronDown size={15} className="text-[#8ba097]" /></button></div></div>
      <div className="flex items-center justify-between px-2 py-4"><div className="flex items-center gap-2 text-xs text-[#83958c]"><span>Slippage</span><select value={slippage} onChange={(event) => setSlippage(Number(event.target.value))} className="rounded-lg border border-white/10 bg-[#182821] px-2 py-1.5 text-xs text-white outline-none"><option value="0.1">0.1%</option><option value="0.5">0.5%</option><option value="1">1.0%</option><option value="2">2.0%</option></select></div>{quote && <span className="text-xs text-[#83958c]">{quote.routePlan.length} route {quote.routePlan.length === 1 ? 'hop' : 'hops'}</span>}</div>
      {impact > 5 && <div className="mb-3 flex gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.08] p-3 text-xs leading-5 text-amber-200"><ShieldAlert size={18} className="shrink-0 text-amber-300" /><span>High price impact of <strong>{impact.toFixed(2)}%</strong>. Review the route carefully before signing.</span></div>}
      {notice && <div className={`mb-3 flex items-center gap-2 rounded-xl border p-3 text-xs ${notice.type === 'success' ? 'border-[#a3f34b]/20 bg-[#a3f34b]/[0.08] text-[#c5fa93]' : 'border-red-400/20 bg-red-400/[0.08] text-red-200'}`}>{notice.type === 'success' ? <Check size={16} /> : <ShieldAlert size={16} />}{notice.text}</div>}
      <button disabled={swapping || loadingQuote || !quote || !amount} onClick={handleSwap} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#a3f34b] text-sm font-bold text-[#09110f] transition hover:bg-[#bafa70] disabled:cursor-not-allowed disabled:bg-[#22372c] disabled:text-[#61766a]">{swapping ? <><Loader2 size={18} className="animate-spin" />Confirming transaction</> : !connected ? 'Connect wallet to swap' : !quote ? 'Enter an amount' : 'Review swap'}{!swapping && quote && connected && <ArrowDownUp size={17} />}</button>
      <p className="flex items-center justify-center gap-1.5 pt-4 text-[11px] text-[#62756b]"><ShieldCheckIcon /> Non-custodial · 20 bps protocol fee</p>
    </div>
    {picker && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setPicker(null)}><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13201b] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-white">Select a token</h3><button onClick={() => setPicker(null)} className="text-[#83958c] hover:text-white"><X size={20} /></button></div><div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1412] px-3 py-2.5"><Search size={17} className="text-[#75877e]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or symbol" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#53675d]" /></div><div className="max-h-80 overflow-y-auto">{filteredTokens.slice(0, 80).map((token) => <button key={token.address} onClick={() => selectToken(token)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-white/[0.06]"><TokenIcon token={token} /><span className="flex-1"><span className="block text-sm font-semibold text-white">{token.symbol}</span><span className="block text-xs text-[#71847a]">{token.name}</span></span>{token.address === (picker === 'from' ? from.address : to.address) && <Check size={18} className="text-[#a3f34b]" />}</button>)}</div></div></div>}
  </section>;
}

function ShieldCheckIcon() { return <Sparkles size={13} className="text-[#a3f34b]" />; }
