'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import '@solana/wallet-adapter-react-ui/styles.css';

export default function WalletProviders({ children }: { children: React.ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network: WalletAdapterNetwork.Mainnet })], []);
  const ConnectionProviderView = ConnectionProvider as React.ComponentType<any>;
  const WalletProviderView = WalletProvider as React.ComponentType<any>;
  const WalletModalProviderView = WalletModalProvider as React.ComponentType<any>;
  return (
    <ConnectionProviderView endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProviderView wallets={wallets} autoConnect>
        <WalletModalProviderView>{children}</WalletModalProviderView>
      </WalletProviderView>
    </ConnectionProviderView>
  );
}
