'use client';

import { ArrowUpRight, BarChart3, CheckCircle2, ChevronRight, CircleHelp, GitBranch, ShieldCheck, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SwapBox from '@/components/SwapBox';

const stats = [
  { label: 'Total volume', value: '$24.8M', trend: '+18.4%', icon: BarChart3 },
  { label: 'Transactions', value: '184,209', trend: '+12.8%', icon: GitBranch },
  { label: 'Avg. savings', value: '0.42%', trend: 'vs. market', icon: Zap },
];

export default function Home() {
  return <main id="top" className="min-h-screen overflow-hidden bg-[#08100f] text-white">
    <div className="pointer-events-none fixed inset-0 -z-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 50% -10%, rgba(79, 145, 96, 0.16), transparent 36%), radial-gradient(circle at 90% 60%, rgba(163, 243, 75, 0.06), transparent 28%)' }} />
    <Navbar />
    <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
      <section className="mx-auto max-w-3xl pb-12 pt-20 text-center sm:pt-28"><div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-[#a3f34b]/15 bg-[#a3f34b]/[0.07] px-3 py-1.5 text-xs font-medium text-[#b8ee83]"><SparkIcon /> Solana’s intelligent swap layer <ArrowUpRight size={13} /></div><h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-7xl">Move value with<br /><span className="text-[#a3f34b]">less friction.</span></h1><p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#8da198] sm:text-lg">RouteX scans deep Solana liquidity to find your best path. Simple by design, protected by default.</p></section>
      <section className="grid items-start gap-10 pb-24 lg:grid-cols-[1fr_520px_1fr] lg:gap-16"><div className="hidden pt-16 lg:block"><div className="mb-10 h-px w-20 bg-[#a3f34b]" /><h2 className="max-w-[240px] text-2xl font-medium leading-tight text-white">Every route.<br />One clear answer.</h2><p className="mt-4 max-w-[260px] text-sm leading-6 text-[#789087]">Transparent pricing, live route discovery, and no surprises when you sign.</p><div className="mt-10 space-y-4 text-sm text-[#a7b9ae]"><Feature icon={<ShieldCheck size={16} />} text="Non-custodial by design" /><Feature icon={<Zap size={16} />} text="Dynamic compute limits" /><Feature icon={<CheckCircle2 size={16} />} text="Pre-flight simulation" /></div></div><SwapBox /><div id="security" className="hidden pt-16 lg:block"><div className="ml-auto max-w-[250px]"><div className="mb-10 ml-auto h-px w-20 bg-[#a3f34b]" /><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#72847b]">Built for certainty</p><div className="mt-6 space-y-6"><div><p className="flex items-center gap-2 font-medium text-white"><ShieldCheck size={16} className="text-[#a3f34b]" />Protected execution</p><p className="mt-2 text-sm leading-6 text-[#789087]">Your wallet signs every transaction. We never hold your assets.</p></div><div><p className="flex items-center gap-2 font-medium text-white"><CircleHelp size={16} className="text-[#a3f34b]" />Clear before you sign</p><p className="mt-2 text-sm leading-6 text-[#789087]">Impact, slippage, and route details are always visible.</p></div></div></div></div></section>
      <section id="stats" className="border-t border-white/[0.07] py-10"><div className="grid divide-y divide-white/[0.07] sm:grid-cols-3 sm:divide-x sm:divide-y-0">{stats.map(({ label, value, trend, icon: Icon }) => <div key={label} className="flex items-center gap-4 px-4 py-5 sm:justify-center sm:py-1"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#a3f34b]/[0.08] text-[#a3f34b]"><Icon size={18} /></span><div><p className="text-xs text-[#72847b]">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight text-white">{value} <span className="ml-1 text-[11px] font-medium text-[#a3f34b]">{trend}</span></p></div></div>)}</div></section>
      <footer className="flex flex-col justify-between gap-4 border-t border-white/[0.07] py-8 text-xs text-[#64766d] sm:flex-row"><span>© 2026 RouteX Protocol</span><div className="flex gap-6"><a className="transition hover:text-white" href="#security">Security</a><a className="transition hover:text-white" href="#swap">Documentation <ChevronRight className="inline" size={13} /></a></div></footer>
    </div>
  </main>;
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-3"><span className="text-[#a3f34b]">{icon}</span>{text}</div>; }
function SparkIcon() { return <span className="grid h-4 w-4 place-items-center rounded bg-[#a3f34b] text-[9px] text-[#09110f]">✦</span>; }
