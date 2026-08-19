'use client';

import { CircleDollarSign, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b border-white/[0.07] bg-[#08100f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <a href="#top" className="flex items-center gap-3" aria-label="RouteX home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#a3f34b] text-[#09110f] shadow-[0_0_28px_rgba(163,243,75,0.24)]"><CircleDollarSign size={22} strokeWidth={2.5} /></span>
          <span className="text-lg font-semibold tracking-tight text-white">route<span className="text-[#a3f34b]">x</span></span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-[#93a49c] md:flex">
          <a className="text-white transition hover:text-[#a3f34b]" href="#swap">Swap</a>
          <a className="transition hover:text-white" href="#stats">Analytics</a>
          <a className="transition hover:text-white" href="#security">Security</a>
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[#b9c8c0] sm:flex"><span className="h-2 w-2 rounded-full bg-[#a3f34b] shadow-[0_0_10px_#a3f34b]" />Mainnet</div>
          <WalletMultiButton className="!h-11 !rounded-xl !bg-[#a3f34b] !px-4 !font-semibold !text-[#09110f] hover:!bg-[#bafa70]" />
          <button onClick={() => setOpen(!open)} className="rounded-lg border border-white/10 p-2 text-white md:hidden" aria-label="Open menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open && <div className="border-t border-white/[0.07] px-5 py-4 md:hidden"><div className="grid gap-3 text-sm text-[#b9c8c0]"><a href="#swap" onClick={() => setOpen(false)}>Swap</a><a href="#stats" onClick={() => setOpen(false)}>Analytics</a><a href="#security" onClick={() => setOpen(false)}>Security</a></div></div>}
    </header>
  );
}
