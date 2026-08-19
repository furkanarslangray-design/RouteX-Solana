import './globals.css';
import type { Metadata } from 'next';
import WalletProviders from '@/components/WalletProviders';

export const metadata: Metadata = {
  title: 'RouteX — Solana swap routing',
  description: 'Simple, protected swaps across Solana liquidity.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><WalletProviders>{children}</WalletProviders></body></html>;
}
