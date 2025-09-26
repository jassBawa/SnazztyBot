import { Connection, Keypair, PublicKey, clusterApiUrl, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import fs from "fs";
import path from "path";
import { upsertTelegramUser } from "./db";

type Balances = {
  nativeSol: string;
};

type TokenBalance = {
  mint: string;
  amount: number;
  decimals: number;
  symbol?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const KEYSTORE_FILE = path.join(DATA_DIR, "wallets.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadKeystore(): Record<string, number[]> {
  ensureDataDir();
  if (!fs.existsSync(KEYSTORE_FILE)) return {};
  const raw = fs.readFileSync(KEYSTORE_FILE, "utf-8");
  try {
    return JSON.parse(raw) as Record<string, number[]>;
  } catch {
    return {};
  }
}

function saveKeystore(map: Record<string, number[]>) {
  ensureDataDir();
  fs.writeFileSync(KEYSTORE_FILE, JSON.stringify(map, null, 2), "utf-8");
}

export function getConnection(): Connection {
  const rpc = process.env.SOLANA_RPC_URL || clusterApiUrl(process.env.SOLANA_CLUSTER as any || "devnet");
  return new Connection(rpc, "confirmed");
}

export function getOrCreateUserKeypair(userId: string): Keypair {
  const store = loadKeystore();
  const existing = store[userId];
  if (existing && Array.isArray(existing)) {
    return Keypair.fromSecretKey(new Uint8Array(existing));
  }
  const kp = Keypair.generate();
  store[userId] = Array.from(kp.secretKey);
  saveKeystore(store);
  return kp;
}

export async function ensureDbUserWithWallet(params: {
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  ownerLocator: string;
}) {
  const keypair = getOrCreateUserKeypair(params.ownerLocator);
  const pubkey = keypair.publicKey.toBase58();
  await upsertTelegramUser({
    telegramId: params.telegramId,
    username: params.username ?? null,
    firstName: params.firstName ?? null,
    lastName: params.lastName ?? null,
    walletPubKey: pubkey,
  });
  return pubkey;
}

export function getPublicKeyForUser(userId: string): PublicKey {
  const kp = getOrCreateUserKeypair(userId);
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

export async function sendUsdc(fromUserId: string, toAddress: string, amount: string): Promise<{ signature: string; explorerLink: string }> {
  const usdcMint = process.env.USDC_MINT_ADDRESS;
  if (!usdcMint) throw new Error("USDC_MINT_ADDRESS not set");

  const connection = getConnection();
  const from = getOrCreateUserKeypair(fromUserId);
  const to = new PublicKey(toAddress);
  const mintPk = new PublicKey(usdcMint);

  const fromAta = await getAssociatedTokenAddress(mintPk, from.publicKey);
  const toAta = await getAssociatedTokenAddress(mintPk, to);

  const decimals = Number(process.env.USDC_DECIMALS ?? 6);
  const amountU64 = decimalToU64(amount, decimals);

  const ix = createTransferInstruction(fromAta, toAta, from.publicKey, amountU64);
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [from]);
  const explorerLink = `${getExplorerBase()}${sig}${(process.env.SOLANA_CLUSTER && process.env.SOLANA_CLUSTER !== "mainnet-beta") ? `?cluster=${process.env.SOLANA_CLUSTER}` : ""}`;
  return { signature: sig, explorerLink };
}


