import { Connection, Keypair, PublicKey, clusterApiUrl, sendAndConfirmTransaction, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { upsertTelegramUser, getUserByTelegramId } from "@repo/database/user";
import { encryptSecretKey, decryptSecretKey } from "./encryption";

type Balances = {
  nativeSol: string;
};

type TokenBalance = {
  mint: string;
  amount: number;
  decimals: number;
  symbol?: string;
};

/**
 * Get Solana RPC connection
 */
export function getConnection(): Connection {
  const rpc = process.env.SOLANA_RPC_URL || clusterApiUrl(process.env.SOLANA_CLUSTER as any || "devnet");
  return new Connection(rpc, "confirmed");
}

/**
 * Get or create a keypair for a user by their telegram ID
 * Stores encrypted private key in database
 */
export async function getOrCreateUserKeypair(telegramId: bigint): Promise<Keypair> {
  const user = await getUserByTelegramId(telegramId);

  if (user && user.encryptedPrivateKey) {
    // Decrypt and return existing keypair
    const secretKey = decryptSecretKey(user.encryptedPrivateKey);
    return Keypair.fromSecretKey(secretKey);
  }

  // Generate new keypair (will be saved by ensureDbUserWithWallet)
  return Keypair.generate();
}

/**
 * Claim airdrop for a user
 */
export async function claimAirdrop(kp: Keypair): Promise<{ signature: string; explorerLink: string }> {
  try{

    const connection = getConnection();
    const airdrop = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    const explorerLink = `${getExplorerBase()}${airdrop}${(process.env.SOLANA_CLUSTER && process.env.SOLANA_CLUSTER !== "mainnet-beta") ? `?cluster=${process.env.SOLANA_CLUSTER}` : ""}`;
    return { signature: airdrop, explorerLink };
  } catch (error: any) {
    console.error("[SOLANA] Error claiming airdrop:", error);
    const raw = typeof error?.message === 'string' ? error.message : String(error);
    const pretty = formatAirdropError(raw);
    throw new Error(pretty);
  }
}

function formatAirdropError(message: string): string {
  const faucetUrl = 'https://faucet.solana.com';
  const tooMany = message.includes('429') || message.toLowerCase().includes('too many requests');
  const faucetMention = message.includes('faucet.solana.com');

  if (tooMany || faucetMention) {
    return [
      'Airdrop unavailable right now.',
      'Reason: rate limited or faucet has run out of funds.',
      `Try again later or use the official faucet: ${faucetUrl}`,
    ].join('\n');
  }

  if (message.toLowerCase().includes('airdrop') || message.toLowerCase().includes('requestairdrop')) {
    return `Failed to claim airdrop: ${stripNewlines(message)}`;
  }

  return `Failed to claim airdrop: ${stripNewlines(message)}`;
}

function stripNewlines(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Ensure a user exists in database with their wallet
 * Creates wallet if it doesn't exist and stores encrypted private key
 */
export async function ensureDbUserWithWallet(params: {
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<string> {
  const user = await getUserByTelegramId(params.telegramId);

  let keypair: Keypair;
  let encryptedPrivateKey: string;

  if (user && user.encryptedPrivateKey) {
    // User exists, decrypt their existing keypair
    const secretKey = decryptSecretKey(user.encryptedPrivateKey);
    keypair = Keypair.fromSecretKey(secretKey);
    encryptedPrivateKey = user.encryptedPrivateKey;
  } else {
    // New user, generate keypair and encrypt it
    keypair = Keypair.generate();
    encryptedPrivateKey = encryptSecretKey(keypair.secretKey);
  }

  const pubkey = keypair.publicKey.toBase58();

  await upsertTelegramUser({
    telegramId: params.telegramId,
    username: params.username ?? null,
    firstName: params.firstName ?? null,
    lastName: params.lastName ?? null,
    walletPubKey: pubkey,
    encryptedPrivateKey,
  });

  return pubkey;
}

/**
 * Get public key for a user by their telegram ID
 */
export async function getPublicKeyForUser(telegramId: bigint): Promise<PublicKey> {
  const kp = await getOrCreateUserKeypair(telegramId);
  return kp.publicKey;
}

function formatSol(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(6);
}

export async function getBalances(pubkey: PublicKey): Promise<Balances> {
  const connection = getConnection();
  const nativeLamports = await connection.getBalance(pubkey);
  const nativeSol = formatSol(nativeLamports);

  return { nativeSol };
}

/**
 * Get SOL balance in lamports (raw amount)
 */
export async function getSolBalanceLamports(pubkey: PublicKey): Promise<number> {
  const connection = getConnection();
  return await connection.getBalance(pubkey);
}

/**
 * Check if user has sufficient SOL balance for a transaction
 * @param pubkey User's public key
 * @param requiredSol Amount of SOL required (in SOL, not lamports)
 * @param bufferSol Extra SOL to keep for transaction fees (default 0.01 SOL)
 * @returns true if sufficient balance, false otherwise
 */
export async function hasSufficientBalance(
  pubkey: PublicKey,
  requiredSol: number,
  bufferSol: number = 0.01
): Promise<{ sufficient: boolean; currentBalance: number; required: number }> {
  const lamports = await getSolBalanceLamports(pubkey);
  const currentBalance = lamports / 1_000_000_000;
  const required = requiredSol + bufferSol;

  return {
    sufficient: currentBalance >= required,
    currentBalance,
    required,
  };
}

/**
 * Validate if a string is a valid Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get token decimals from mint account
 */
export async function getTokenDecimals(tokenMint: string): Promise<number> {
  try {
    const connection = getConnection();
    const mintPubkey = new PublicKey(tokenMint);

    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);

    if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
      const decimals = mintInfo.value.data.parsed?.info?.decimals;
      if (typeof decimals === 'number') {
        return decimals;
      }
    }

    // Default to 9 if unable to fetch
    return 9;
  } catch (error) {
    console.error("[SOLANA] Error fetching token decimals:", error);
    return 9; // Default fallback
  }
}

/**
 * Check if a token mint uses Token-2022 program
 */
export async function isToken2022(tokenMint: string): Promise<boolean> {
  try {
    const connection = getConnection();
    const mintPubkey = new PublicKey(tokenMint);
    const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

    const accountInfo = await connection.getAccountInfo(mintPubkey);

    if (!accountInfo) {
      console.log(`[SOLANA] No account info found for ${tokenMint} - treating as regular token`);
      return false;
    }

    const isToken2022 = accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
    console.log(`[SOLANA] Token ${tokenMint} program: ${accountInfo.owner.toBase58()} (Token2022: ${isToken2022})`);

    return isToken2022;
  } catch (error) {
    console.error("[SOLANA] Error checking Token-2022:", error);
    return false; // Default to regular SPL token
  }
}

/**
 * Get Token2022 extensions if any
 */
export async function getToken2022Extensions(tokenMint: string): Promise<string[]> {
  try {
    const connection = getConnection();
    const mintPubkey = new PublicKey(tokenMint);

    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);

    if (!mintInfo.value?.data || !('parsed' in mintInfo.value.data)) {
      return [];
    }

    const extensions = mintInfo.value.data.parsed?.info?.extensions || [];
    const extensionTypes = extensions.map((ext: any) => ext.extension || ext.type || 'unknown');

    console.log(`[SOLANA] Token2022 extensions for ${tokenMint}:`, extensionTypes);
    return extensionTypes;
  } catch (error) {
    console.error("[SOLANA] Error getting Token2022 extensions:", error);
    return [];
  }
}

/**
 * Get token program ID for a mint
 */
export async function getTokenProgramId(tokenMint: string): Promise<string> {
  const is2022 = await isToken2022(tokenMint);
  return is2022
    ? "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
    : "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
}

/**
 * Ensure an associated token account exists for the given mint
 * Handles both regular SPL tokens and Token-2022
 */
export async function ensureTokenAccount(params: {
  owner: Keypair;
  tokenMint: string;
}): Promise<PublicKey> {
  const { owner, tokenMint } = params;
  const connection = getConnection();
  const mintPubkey = new PublicKey(tokenMint);

  // Check if it's Token2022
  const is2022 = await isToken2022(tokenMint);
  const programId = is2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

  console.log(`[SOLANA] Ensuring token account for ${tokenMint} (Token2022: ${is2022})`);

  // Get the associated token address with correct program ID
  const ata = await getAssociatedTokenAddress(
    mintPubkey,
    owner.publicKey,
    false, // allowOwnerOffCurve
    programId
  );

  console.log(`[SOLANA] Associated token account: ${ata.toBase58()}`);

  try {
    // Check if account exists
    await getAccount(connection, ata, 'confirmed', programId);
    console.log(`[SOLANA] Token account already exists`);
    return ata;
  } catch (error) {
    console.log(`[SOLANA] Token account doesn't exist, creating...`);

    // Create the account
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        owner.publicKey, // payer
        ata, // associatedToken
        owner.publicKey, // owner
        mintPubkey, // mint
        programId // programId
      )
    );

    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [owner],
        { commitment: 'confirmed' }
      );
      console.log(`[SOLANA] Token account created: ${signature}`);
      return ata;
    } catch (createError: any) {
      console.error(`[SOLANA] Error creating token account:`, createError);
      throw new Error(`Failed to create token account: ${createError.message}`);
    }
  }
}

/**
 * Get SPL token balance for a specific token mint
 */
export async function getTokenBalance(
  walletPubkey: PublicKey,
  tokenMint: string
): Promise<TokenBalance | null> {
  try {
    const connection = getConnection();
    const mintPubkey = new PublicKey(tokenMint);

    // Get associated token address
    const tokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      walletPubkey
    );

    // Try to get account info
    const accountInfo = await getAccount(connection, tokenAccount);

    // Get mint info for decimals
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
    const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;

    // Format amount
    const amount = Number(accountInfo.amount) / Math.pow(10, decimals);

    return {
      mint: tokenMint,
      amount,
      decimals,
    };
  } catch (error) {
    // Token account doesn't exist or other error
    console.error("[SOLANA] Error getting token balance:", error);
    return null;
  }
}

// Common token symbols mapping
const TOKEN_SYMBOLS: Record<string, string> = {
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
  "So11111111111111111111111111111111111111112": "SOL",
};

export async function getTokenBalances(walletAddress: string): Promise<TokenBalance[]> {
  const connection = getConnection();
  const pubKey = new PublicKey(walletAddress);

  // Get all token accounts owned by the wallet
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });

  // Map to readable format with symbols
  const balances = tokenAccounts.value.map((accountInfo) => {
    const data = accountInfo.account.data.parsed.info;
    const mint = data.mint;
    const amount = Number(data.tokenAmount.amount) / Math.pow(10, data.tokenAmount.decimals);
    const symbol = TOKEN_SYMBOLS[mint] || mint.substring(0, 4).toUpperCase();
    
    return {
      mint,
      amount,
      decimals: data.tokenAmount.decimals,
      symbol,
    };
  });

  return balances;
}


function decimalToU64(amount: string, decimals: number): bigint {
  const [i, f = ""] = amount.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  const normalized = `${i}${frac}`.replace(/^0+/, "") || "0";
  return BigInt(normalized);
}

function getExplorerBase(): string {
  return `https://explorer.solana.com/tx/`; // Base URL, cluster query string added at callsite
}

// Reverse mapping for symbol to mint address
const SYMBOL_TO_MINT: Record<string, string> = {
  "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "USDT": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "RAY": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  "SOL": "So11111111111111111111111111111111111111112",
};

function resolveTokenMint(tokenInput: string): PublicKey {
  // Check if it's already a valid public key
  try {
    return new PublicKey(tokenInput);
  } catch {
    // Try to resolve by symbol
    const upperInput = tokenInput.toUpperCase();
    const mintAddress = SYMBOL_TO_MINT[upperInput];
    if (mintAddress) {
      return new PublicKey(mintAddress);
    }
    throw new Error(`Token not found: ${tokenInput}. Use symbol (USDC, USDT, etc.) or mint address.`);
  }
}

export async function sendToken(fromTelegramId: bigint, toAddress: string, tokenInput: string, amount: string): Promise<{ signature: string; explorerLink: string }> {
  const connection = getConnection();
  const from = await getOrCreateUserKeypair(fromTelegramId);
  const to = new PublicKey(toAddress);
  const mintPk = resolveTokenMint(tokenInput);

  const fromAta = await getAssociatedTokenAddress(mintPk, from.publicKey);
  const toAta = await getAssociatedTokenAddress(mintPk, to);

  // Get token info to determine decimals
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(from.publicKey, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });

  const tokenAccount = tokenAccounts.value.find(account => 
    account.account.data.parsed.info.mint === mintPk.toBase58()
  );

  if (!tokenAccount) {
    throw new Error(`No ${tokenInput} token account found for sender`);
  }

  const decimals = tokenAccount.account.data.parsed.info.tokenAmount.decimals;
  const amountU64 = decimalToU64(amount, decimals);

  // Check if recipient's token account exists, create if not
  const transaction = new Transaction();
  
  try {
    await getAccount(connection, toAta);
  } catch (error) {
    // Token account doesn't exist, create it
    const createAtaIx = createAssociatedTokenAccountInstruction(
      from.publicKey, // payer
      toAta, // associated token account
      to, // owner
      mintPk // mint
    );
    transaction.add(createAtaIx);
  }

  const transferIx = createTransferInstruction(fromAta, toAta, from.publicKey, amountU64);
  transaction.add(transferIx);

  try {
    const sig = await sendAndConfirmTransaction(connection, transaction, [from]);
    const explorerLink = `${getExplorerBase()}${sig}${(process.env.SOLANA_CLUSTER && process.env.SOLANA_CLUSTER !== "mainnet-beta") ? `?cluster=${process.env.SOLANA_CLUSTER}` : ""}`;
    return { signature: sig, explorerLink };
  } catch (error: any) {
    // Enhanced error handling
    let errorMessage = error.message || "Unknown error";
    
    if (error.logs) {
      errorMessage += `\n\nTransaction logs:\n${error.logs.join('\n')}`;
    }
    
    // Check for specific error conditions
    if (errorMessage.includes("InsufficientFunds")) {
      errorMessage = `Insufficient ${tokenInput} balance to send ${amount}`;
    } else if (errorMessage.includes("InvalidAccountData")) {
      errorMessage = `Invalid account data. Make sure the recipient address is valid and can receive ${tokenInput}`;
    } else if (errorMessage.includes("AccountNotFound")) {
      errorMessage = `Token account not found. Make sure you have ${tokenInput} tokens to send`;
    }
    
    throw new Error(errorMessage);
  }
}


