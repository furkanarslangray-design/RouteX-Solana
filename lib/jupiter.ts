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

// OPTIMIZATION: Increased rent buffer to account for ATA creation (~0.002 SOL = 2M lamports)
// and transaction fees to prevent "insufficient funds for rent" failures during max-balance swaps
export const RENT_BUFFER_LAMPORTS = 5_000_000; // 0.005 SOL (was 2,039,280)

export const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';
export const JUPITER_API = 'https://quote-api.jup.ag/v6';

// OPTIMIZATION: Strict slippage bounds to prevent user configuration errors
export const MIN_SLIPPAGE_PERCENT = 0.01;
export const MAX_SLIPPAGE_PERCENT = 50;

// OPTIMIZATION: Price impact warning threshold to prevent accidental high-impact trades
export const PRICE_IMPACT_WARNING_THRESHOLD = 5; // Percent

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

/**
 * OPTIMIZATION: Strict validation and conversion of user percentage input to Basis Points
 * with explicit precision guarantees. Prevents off-by-factor errors (e.g., 0.5% → 50 BPS, not 0.5 BPS).
 * @param percent User-input percentage (e.g., 0.5 means 0.5%)
 * @returns Basis points (e.g., 50 BPS for 0.5%)
 */
export function slippageToBps(percent: number): number {
  // Validate input type and range
  if (!Number.isFinite(percent)) throw new Error('Slippage must be a valid number');
  if (percent < MIN_SLIPPAGE_PERCENT || percent > MAX_SLIPPAGE_PERCENT) {
    throw new Error(`Slippage must be between ${MIN_SLIPPAGE_PERCENT}% and ${MAX_SLIPPAGE_PERCENT}%`);
  }

  // Convert percentage to BPS: multiply by 100
  // 0.5% → 50 BPS, 1% → 100 BPS, 2% → 200 BPS
  const bps = Math.round(percent * 100);

  // Validate the computed BPS is within acceptable range
  if (bps < 1 || bps > 5000) {
    throw new Error('Computed slippage BPS is out of acceptable range');
  }

  return bps;
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

/**
 * OPTIMIZATION: Enhanced quote fetching with strict error handling and parameter validation.
 * Ensures slippageBps is correctly computed from percentage input before sending to Jupiter API.
 */
export async function fetchQuote(inputMint: string, outputMint: string, amount: string, slippagePercent: number) {
  // Validate all inputs are present and valid
  if (!inputMint || !outputMint || !amount) {
    throw new Error('Missing required quote parameters');
  }

  if (Number(amount) <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  if (inputMint === outputMint) {
    throw new Error('Input and output tokens cannot be the same');
  }

  // CRITICAL: Convert slippage percentage to BPS with strict validation
  const slippageBps = slippageToBps(slippagePercent);

  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: String(slippageBps),
    swapMode: 'ExactIn',
    onlyDirectRoutes: 'false',
  });

  try {
    const response = await fetch(`${JUPITER_API}/quote?${params}`, {
      signal: AbortSignal.timeout(10_000), // Explicit timeout to prevent hanging
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Jupiter API error: ${response.status} - ${error}`);
    }

    const quote = (await response.json()) as QuoteResponse;

    // Validate quote response structure
    if (!quote.outAmount || !quote.priceImpactPct) {
      throw new Error('Invalid quote response structure');
    }

    return quote;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('AbortSignal')) {
      throw new Error('Quote request timed out. Please try again.');
    }
    throw error;
  }
}

/**
 * OPTIMIZATION: Production-grade swap execution with comprehensive validation,
 * pre-flight simulation, and proper error handling.
 * 
 * SECURITY IMPROVEMENTS:
 * 1. Validates quote mints are valid PublicKeys before using
 * 2. Deserializes VersionedTransaction (V0) correctly
 * 3. Runs pre-flight simulation BEFORE requesting user signature
 * 4. Includes comprehensive error messages for debugging
 */
export async function executeSwap({
  quote,
  userPublicKey,
  signTransaction,
}: {
  quote: QuoteResponse;
  userPublicKey: PublicKey;
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
}) {
  // Validate quote mints are valid public keys
  try {
    new PublicKey(quote.inputMint);
    new PublicKey(quote.outputMint);
  } catch {
    throw new Error('Invalid quote mints provided');
  }

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

  try {
    const response = await fetch(`${JUPITER_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Swap transaction creation failed: ${response.status} - ${error}`);
    }

    const responseData = (await response.json()) as { swapTransaction?: string };
    const { swapTransaction } = responseData;

    if (!swapTransaction) {
      throw new Error('Swap transaction was empty in Jupiter response');
    }

    // OPTIMIZATION: Deserialize VersionedTransaction (V0) correctly
    let transaction: VersionedTransaction;
    try {
      transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
    } catch (error) {
      throw new Error(`Failed to deserialize transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const connection = getConnection();

    // OPTIMIZATION: Pre-flight simulation BEFORE requesting user signature
    // This catches insufficient balance, instruction errors, etc. early
    const simulationResult = await connection.simulateTransaction(transaction, {
      sigVerify: false,
      replaceRecentBlockhash: true,
    });

    if (simulationResult.value.err) {
      const errorMessage = simulationResult.value.err instanceof Object
        ? JSON.stringify(simulationResult.value.err)
        : String(simulationResult.value.err);

      throw new Error(
        `Pre-flight simulation failed. Reason: ${errorMessage}. ` +
        'Check your balance, rent exemption, and route validity.'
      );
    }

    // OPTIMIZATION: Request signature AFTER successful pre-flight
    const signed = await signTransaction(transaction);

    if (!signed || !(signed instanceof VersionedTransaction || typeof signed.serialize === 'function')) {
      throw new Error('Invalid signed transaction returned from wallet');
    }

    // Send transaction with conservative retry strategy
    const signature = await connection.sendRawTransaction(
      signed.serialize(),
      {
        skipPreflight: false, // Run final preflight at send-time
        maxRetries: 3,
      }
    );

    if (!signature || typeof signature !== 'string') {
      throw new Error('No transaction signature returned');
    }

    // Confirm with 'confirmed' commitment level
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('AbortSignal')) {
      throw new Error('Swap request timed out. Please try again.');
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * OPTIMIZATION: Enhanced balance fetching with ATA awareness and rent buffer consideration.
 * For SOL, subtracts rent exemption buffer to prevent "insufficient funds for rent" errors.
 * For SPL tokens, returns the actual token balance.
 */
export async function fetchBalance(publicKey: PublicKey, mint: string): Promise<number> {
  const connection = getConnection();

  if (mint === SOL_MINT) {
    try {
      const lamports = await connection.getBalance(publicKey);

      // OPTIMIZATION: Subtract rent buffer to account for ATA creation costs
      // and transaction fees. This prevents users from attempting swaps that
      // would fail due to insufficient SOL for rent exemption.
      const availableLamports = Math.max(0, lamports - RENT_BUFFER_LAMPORTS);
      return availableLamports / LAMPORTS_PER_SOL;
    } catch (error) {
      throw new Error(`Failed to fetch SOL balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  try {
    const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      mint: new PublicKey(mint),
    });

    const totalBalance = accounts.value.reduce((sum: number, account: any) => {
      const uiAmount = account?.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
      return sum + (Number(uiAmount) || 0);
    }, 0);

    return Math.max(0, totalBalance);
  } catch (error) {
    throw new Error(`Failed to fetch token balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
