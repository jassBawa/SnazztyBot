import { Connection, Keypair, PublicKey, clusterApiUrl, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";
import { upsertTelegramUser, getUserByTelegramId } from "./db/user";
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
      return false;
    }

    // Check if the owner program is Token-2022
    return accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
  } catch (error) {
    console.error("[SOLANA] Error checking Token-2022:", error);
    return false; // Default to regular SPL token
  }
}

/**
 * Get token program ID for a mint
 */
export async function getTokenProgramId(tokenMint: string): Promise<string> {
  const is2022 = await isToken2022(tokenMint);
  return is2022
    ? "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
    : "TokenkGPmanGNXRCf56LSXt8y6LYouGxvPjSzkMGQJx";
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
  const cluster = (process.env.SOLANA_CLUSTER || "devnet").toLowerCase();
  const qs = cluster === "mainnet-beta" || cluster === "mainnet" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/`; // append sig + qs at callsite
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


