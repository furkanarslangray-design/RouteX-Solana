import {
  Connection,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  type Commitment,
} from '@solana/web3.js';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4yR2dQhcz8f84cYv6D7m';
export const RENT_BUFFER_LAMPORTS = 2_039_280;
export const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';
export const JUPITER_API = 'https://quote-api.jup.ag/v6';

export type Token = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
};

export type QuoteResponse = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: string;
  routePlan: unknown[];
  [key: string]: unknown;
};

export const FALLBACK_TOKENS: Token[] = [
  { address: SOL_MINT, symbol: 'SOL', name: 'Solana', decimals: 9, logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png' },
  { address: USDC_MINT, symbol: 'USDC', name: 'USD Coin', decimals: 6, logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
  { address: USDT_MINT, symbol: 'USDT', name: 'Tether USD', decimals: 6, logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/Es9vMFrzaCERmJfrF4H2FYD4yR2dQhcz8f84cYv6D7m/logo.png' },
];

const TOKEN_CACHE_KEY = 'routex:jupiter-tokens:v1';
const TOKEN_CACHE_TTL = 1000 * 60 * 60 * 12;

export function getConnection() {
  const endpoints = [process.env.NEXT_PUBLIC_SOLANA_RPC_URL, DEFAULT_RPC].filter(Boolean) as string[];
  return new Connection(endpoints[0], { commitment: 'confirmed' as Commitment, confirmTransactionInitialTimeout: 45_000 });
}

export async function fetchTokens(): Promise<Token[]> {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(TOKEN_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { savedAt: number; tokens: Token[] };
        if (Date.now() - parsed.savedAt < TOKEN_CACHE_TTL && parsed.tokens.length) return parsed.tokens;
      }
    } catch { /* use network or fallback */ }
  }

  try {
    const response = await fetch('https://tokens.jup.ag/tokens?tags=verified', { signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error('Token list unavailable');
    const tokens = (await response.json()) as Token[];
    const safeTokens = tokens.filter((token) => token.address && token.symbol && Number.isInteger(token.decimals));
    if (typeof window !== 'undefined' && safeTokens.length) {
      localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), tokens: safeTokens }));
    }
    return safeTokens.length ? safeTokens : FALLBACK_TOKENS;
  } catch {
    return FALLBACK_TOKENS;
  }
}

export function toAtomicAmount(value: string, decimals: number) {
  const [whole = '0', fraction = ''] = value.trim().split('.');
  const normalized = `${whole || '0'}${fraction.slice(0, decimals).padEnd(decimals, '0')}`.replace(/^0+(?=\d)/, '');
  if (!/^\d+$/.test(normalized)) throw new Error('Enter a valid amount');
  return BigInt(normalized || '0').toString();
}

export function formatTokenAmount(amount: string, decimals: number, maxDecimals = 6) {
  const value = Number(amount) / 10 ** decimals;
  return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}

export function slippageToBps(percent: number) {
  if (!Number.isFinite(percent) || percent <= 0 || percent > 50) throw new Error('Slippage must be between 0 and 50%');
  return Math.round(percent * 100);
}

export function getPlatformFee() {
  const feeBps = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_BPS ?? '20');
  const feeAccount = process.env.NEXT_PUBLIC_FEE_ACCOUNT ?? '';
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) return { feeBps: 0, feeAccount: undefined };
  try {
    if (!feeAccount) return { feeBps: 0, feeAccount: undefined };
    new PublicKey(feeAccount);
    return { feeBps, feeAccount };
  } catch {
    return { feeBps: 0, feeAccount: undefined };
  }
}

export async function fetchQuote(inputMint: string, outputMint: string, amount: string, slippagePercent: number) {
  const slippageBps = slippageToBps(slippagePercent);
  const params = new URLSearchParams({ inputMint, outputMint, amount, slippageBps: String(slippageBps), swapMode: 'ExactIn', onlyDirectRoutes: 'false' });
  const response = await fetch(`${JUPITER_API}/quote?${params}`);
  if (!response.ok) throw new Error('Jupiter could not find a route');
  return (await response.json()) as QuoteResponse;
}

export async function executeSwap({ quote, userPublicKey, signTransaction }: { quote: QuoteResponse; userPublicKey: PublicKey; signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction> }) {
  try { new PublicKey(quote.inputMint); new PublicKey(quote.outputMint); } catch { throw new Error('Invalid quote mints'); }
  const { feeBps, feeAccount } = getPlatformFee();
  const body: Record<string, unknown> = {
    quoteResponse: quote,
    userPublicKey: userPublicKey.toBase58(),
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: 'auto',
  };
  if (feeAccount && feeBps > 0) {
    body.platformFeeBps = feeBps;
    body.feeAccount = feeAccount;
  }

  const response = await fetch(`${JUPITER_API}/swap`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error('Swap transaction could not be created');
  const { swapTransaction } = await response.json() as { swapTransaction?: string };
  if (!swapTransaction) throw new Error('Swap transaction was empty');

  const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
  const connection = getConnection();
  const simulation = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true });
  if (simulation.value.err) throw new Error('Pre-flight simulation failed. Check your balance and route.');
  const signed = await signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

export async function fetchBalance(publicKey: PublicKey, mint: string) {
  const connection = getConnection();
  if (mint === SOL_MINT) {
    const lamports = await connection.getBalance(publicKey);
    return Math.max(0, lamports - RENT_BUFFER_LAMPORTS) / LAMPORTS_PER_SOL;
  }
  const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(mint) });
  return accounts.value.reduce((sum: number, account: any) => sum + Number(account.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
}
