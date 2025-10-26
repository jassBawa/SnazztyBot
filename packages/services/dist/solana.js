"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/solana.ts
var solana_exports = {};
__export(solana_exports, {
  ensureDbUserWithWallet: () => ensureDbUserWithWallet,
  ensureTokenAccount: () => ensureTokenAccount,
  getBalances: () => getBalances,
  getConnection: () => getConnection,
  getOrCreateUserKeypair: () => getOrCreateUserKeypair,
  getPublicKeyForUser: () => getPublicKeyForUser,
  getSolBalanceLamports: () => getSolBalanceLamports,
  getToken2022Extensions: () => getToken2022Extensions,
  getTokenBalance: () => getTokenBalance,
  getTokenBalances: () => getTokenBalances,
  getTokenDecimals: () => getTokenDecimals,
  getTokenProgramId: () => getTokenProgramId,
  hasSufficientBalance: () => hasSufficientBalance,
  isToken2022: () => isToken2022,
  isValidSolanaAddress: () => isValidSolanaAddress,
  sendToken: () => sendToken
});
module.exports = __toCommonJS(solana_exports);
var import_web3 = require("@solana/web3.js");
var import_spl_token = require("@solana/spl-token");
var import_user = require("@repo/database/user");

// src/encryption.ts
var crypto = __toESM(require("crypto"));
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
var SALT_LENGTH = 64;
var TAG_LENGTH = 16;
var KEY_LENGTH = 32;
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be set in environment and be at least 32 characters");
  }
  return key;
}
function deriveKey(salt) {
  const masterKey = getEncryptionKey();
  return crypto.pbkdf2Sync(masterKey, salt, 1e5, KEY_LENGTH, "sha256");
}
function encrypt(data) {
  const text = typeof data === "string" ? data : Buffer.from(data).toString("hex");
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString("base64");
}
function decrypt(encryptedData) {
  const combined = Buffer.from(encryptedData, "base64");
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
function encryptSecretKey(secretKey) {
  return encrypt(secretKey);
}
function decryptSecretKey(encryptedKey) {
  const decrypted = decrypt(encryptedKey);
  const bytes = Buffer.from(decrypted, "hex");
  return new Uint8Array(bytes);
}

// src/solana.ts
function getConnection() {
  const rpc = process.env.SOLANA_RPC_URL || (0, import_web3.clusterApiUrl)(process.env.SOLANA_CLUSTER || "devnet");
  return new import_web3.Connection(rpc, "confirmed");
}
async function getOrCreateUserKeypair(telegramId) {
  const user = await (0, import_user.getUserByTelegramId)(telegramId);
  if (user && user.encryptedPrivateKey) {
    const secretKey = decryptSecretKey(user.encryptedPrivateKey);
    return import_web3.Keypair.fromSecretKey(secretKey);
  }
  return import_web3.Keypair.generate();
}
async function ensureDbUserWithWallet(params) {
  const user = await (0, import_user.getUserByTelegramId)(params.telegramId);
  let keypair;
  let encryptedPrivateKey;
  if (user && user.encryptedPrivateKey) {
    const secretKey = decryptSecretKey(user.encryptedPrivateKey);
    keypair = import_web3.Keypair.fromSecretKey(secretKey);
    encryptedPrivateKey = user.encryptedPrivateKey;
  } else {
    keypair = import_web3.Keypair.generate();
    encryptedPrivateKey = encryptSecretKey(keypair.secretKey);
  }
  const pubkey = keypair.publicKey.toBase58();
  await (0, import_user.upsertTelegramUser)({
    telegramId: params.telegramId,
    username: params.username ?? null,
    firstName: params.firstName ?? null,
    lastName: params.lastName ?? null,
    walletPubKey: pubkey,
    encryptedPrivateKey
  });
  return pubkey;
}
async function getPublicKeyForUser(telegramId) {
  const kp = await getOrCreateUserKeypair(telegramId);
  return kp.publicKey;
}
function formatSol(lamports) {
  return (lamports / 1e9).toFixed(6);
}
async function getBalances(pubkey) {
  const connection = getConnection();
  const nativeLamports = await connection.getBalance(pubkey);
  const nativeSol = formatSol(nativeLamports);
  return { nativeSol };
}
async function getSolBalanceLamports(pubkey) {
  const connection = getConnection();
  return await connection.getBalance(pubkey);
}
async function hasSufficientBalance(pubkey, requiredSol, bufferSol = 0.01) {
  const lamports = await getSolBalanceLamports(pubkey);
  const currentBalance = lamports / 1e9;
  const required = requiredSol + bufferSol;
  return {
    sufficient: currentBalance >= required,
    currentBalance,
    required
  };
}
function isValidSolanaAddress(address) {
  try {
    new import_web3.PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}
async function getTokenDecimals(tokenMint) {
  try {
    const connection = getConnection();
    const mintPubkey = new import_web3.PublicKey(tokenMint);
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
    if (mintInfo.value?.data && "parsed" in mintInfo.value.data) {
      const decimals = mintInfo.value.data.parsed?.info?.decimals;
      if (typeof decimals === "number") {
        return decimals;
      }
    }
    return 9;
  } catch (error) {
    console.error("[SOLANA] Error fetching token decimals:", error);
    return 9;
  }
}
async function isToken2022(tokenMint) {
  try {
    const connection = getConnection();
    const mintPubkey = new import_web3.PublicKey(tokenMint);
    const TOKEN_2022_PROGRAM_ID2 = new import_web3.PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
    const accountInfo = await connection.getAccountInfo(mintPubkey);
    if (!accountInfo) {
      console.log(`[SOLANA] No account info found for ${tokenMint} - treating as regular token`);
      return false;
    }
    const isToken20222 = accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID2);
    console.log(`[SOLANA] Token ${tokenMint} program: ${accountInfo.owner.toBase58()} (Token2022: ${isToken20222})`);
    return isToken20222;
  } catch (error) {
    console.error("[SOLANA] Error checking Token-2022:", error);
    return false;
  }
}
async function getToken2022Extensions(tokenMint) {
  try {
    const connection = getConnection();
    const mintPubkey = new import_web3.PublicKey(tokenMint);
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
    if (!mintInfo.value?.data || !("parsed" in mintInfo.value.data)) {
      return [];
    }
    const extensions = mintInfo.value.data.parsed?.info?.extensions || [];
    const extensionTypes = extensions.map((ext) => ext.extension || ext.type || "unknown");
    console.log(`[SOLANA] Token2022 extensions for ${tokenMint}:`, extensionTypes);
    return extensionTypes;
  } catch (error) {
    console.error("[SOLANA] Error getting Token2022 extensions:", error);
    return [];
  }
}
async function getTokenProgramId(tokenMint) {
  const is2022 = await isToken2022(tokenMint);
  return is2022 ? "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" : "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
}
async function ensureTokenAccount(params) {
  const { owner, tokenMint } = params;
  const connection = getConnection();
  const mintPubkey = new import_web3.PublicKey(tokenMint);
  const is2022 = await isToken2022(tokenMint);
  const programId = is2022 ? import_spl_token.TOKEN_2022_PROGRAM_ID : import_spl_token.TOKEN_PROGRAM_ID;
  console.log(`[SOLANA] Ensuring token account for ${tokenMint} (Token2022: ${is2022})`);
  const ata = await (0, import_spl_token.getAssociatedTokenAddress)(
    mintPubkey,
    owner.publicKey,
    false,
    // allowOwnerOffCurve
    programId
  );
  console.log(`[SOLANA] Associated token account: ${ata.toBase58()}`);
  try {
    await (0, import_spl_token.getAccount)(connection, ata, "confirmed", programId);
    console.log(`[SOLANA] Token account already exists`);
    return ata;
  } catch (error) {
    console.log(`[SOLANA] Token account doesn't exist, creating...`);
    const transaction = new import_web3.Transaction().add(
      (0, import_spl_token.createAssociatedTokenAccountInstruction)(
        owner.publicKey,
        // payer
        ata,
        // associatedToken
        owner.publicKey,
        // owner
        mintPubkey,
        // mint
        programId
        // programId
      )
    );
    try {
      const signature = await (0, import_web3.sendAndConfirmTransaction)(
        connection,
        transaction,
        [owner],
        { commitment: "confirmed" }
      );
      console.log(`[SOLANA] Token account created: ${signature}`);
      return ata;
    } catch (createError) {
      console.error(`[SOLANA] Error creating token account:`, createError);
      throw new Error(`Failed to create token account: ${createError.message}`);
    }
  }
}
async function getTokenBalance(walletPubkey, tokenMint) {
  try {
    const connection = getConnection();
    const mintPubkey = new import_web3.PublicKey(tokenMint);
    const tokenAccount = await (0, import_spl_token.getAssociatedTokenAddress)(
      mintPubkey,
      walletPubkey
    );
    const accountInfo = await (0, import_spl_token.getAccount)(connection, tokenAccount);
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
    const decimals = mintInfo.value?.data?.parsed?.info?.decimals || 9;
    const amount = Number(accountInfo.amount) / Math.pow(10, decimals);
    return {
      mint: tokenMint,
      amount,
      decimals
    };
  } catch (error) {
    console.error("[SOLANA] Error getting token balance:", error);
    return null;
  }
}
var TOKEN_SYMBOLS = {
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
  "So11111111111111111111111111111111111111112": "SOL"
};
async function getTokenBalances(walletAddress) {
  const connection = getConnection();
  const pubKey = new import_web3.PublicKey(walletAddress);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
    programId: new import_web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
  });
  const balances = tokenAccounts.value.map((accountInfo) => {
    const data = accountInfo.account.data.parsed.info;
    const mint = data.mint;
    const amount = Number(data.tokenAmount.amount) / Math.pow(10, data.tokenAmount.decimals);
    const symbol = TOKEN_SYMBOLS[mint] || mint.substring(0, 4).toUpperCase();
    return {
      mint,
      amount,
      decimals: data.tokenAmount.decimals,
      symbol
    };
  });
  return balances;
}
function decimalToU64(amount, decimals) {
  const [i, f = ""] = amount.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  const normalized = `${i}${frac}`.replace(/^0+/, "") || "0";
  return BigInt(normalized);
}
function getExplorerBase() {
  return `https://explorer.solana.com/tx/`;
}
var SYMBOL_TO_MINT = {
  "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "USDT": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "RAY": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  "SOL": "So11111111111111111111111111111111111111112"
};
function resolveTokenMint(tokenInput) {
  try {
    return new import_web3.PublicKey(tokenInput);
  } catch {
    const upperInput = tokenInput.toUpperCase();
    const mintAddress = SYMBOL_TO_MINT[upperInput];
    if (mintAddress) {
      return new import_web3.PublicKey(mintAddress);
    }
    throw new Error(`Token not found: ${tokenInput}. Use symbol (USDC, USDT, etc.) or mint address.`);
  }
}
async function sendToken(fromTelegramId, toAddress, tokenInput, amount) {
  const connection = getConnection();
  const from = await getOrCreateUserKeypair(fromTelegramId);
  const to = new import_web3.PublicKey(toAddress);
  const mintPk = resolveTokenMint(tokenInput);
  const fromAta = await (0, import_spl_token.getAssociatedTokenAddress)(mintPk, from.publicKey);
  const toAta = await (0, import_spl_token.getAssociatedTokenAddress)(mintPk, to);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(from.publicKey, {
    programId: new import_web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
  });
  const tokenAccount = tokenAccounts.value.find(
    (account) => account.account.data.parsed.info.mint === mintPk.toBase58()
  );
  if (!tokenAccount) {
    throw new Error(`No ${tokenInput} token account found for sender`);
  }
  const decimals = tokenAccount.account.data.parsed.info.tokenAmount.decimals;
  const amountU64 = decimalToU64(amount, decimals);
  const transaction = new import_web3.Transaction();
  try {
    await (0, import_spl_token.getAccount)(connection, toAta);
  } catch (error) {
    const createAtaIx = (0, import_spl_token.createAssociatedTokenAccountInstruction)(
      from.publicKey,
      // payer
      toAta,
      // associated token account
      to,
      // owner
      mintPk
      // mint
    );
    transaction.add(createAtaIx);
  }
  const transferIx = (0, import_spl_token.createTransferInstruction)(fromAta, toAta, from.publicKey, amountU64);
  transaction.add(transferIx);
  try {
    const sig = await (0, import_web3.sendAndConfirmTransaction)(connection, transaction, [from]);
    const explorerLink = `${getExplorerBase()}${sig}${process.env.SOLANA_CLUSTER && process.env.SOLANA_CLUSTER !== "mainnet-beta" ? `?cluster=${process.env.SOLANA_CLUSTER}` : ""}`;
    return { signature: sig, explorerLink };
  } catch (error) {
    let errorMessage = error.message || "Unknown error";
    if (error.logs) {
      errorMessage += `

Transaction logs:
${error.logs.join("\n")}`;
    }
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ensureDbUserWithWallet,
  ensureTokenAccount,
  getBalances,
  getConnection,
  getOrCreateUserKeypair,
  getPublicKeyForUser,
  getSolBalanceLamports,
  getToken2022Extensions,
  getTokenBalance,
  getTokenBalances,
  getTokenDecimals,
  getTokenProgramId,
  hasSufficientBalance,
  isToken2022,
  isValidSolanaAddress,
  sendToken
});
