import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
  Wallet,
} from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import idl from "./idl/program.json";
import { sha256 } from "@noble/hashes/sha2.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import BN, { BN as BN_VALUE } from "bn.js";

interface UserToken {
  bondingCurve: string;
  creator: string;
  tokenMint: string;
  realSolReserves: bigint;
  realTokenReserves: bigint;
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
  name?: string;
  uri?: string;
  symbol?: string;
  graduated: boolean;
  bump: number;
  currentPrice: number;
  holders: number;
}
interface BuyTokensParams {
  connection: Connection;
  programId: PublicKey;
  buyerKeypair: Keypair;
  tokenMint: PublicKey;
  amount: number;
  creator: PublicKey;
}

interface SellTokensParams {
  connection: Connection;
  programId: PublicKey;
  sellerKeypair: Keypair;
  tokenMint: PublicKey;
  tokensIn: BN;
  creator: PublicKey;
}

interface CreateToken {
  name: string;
  uri: string;
  symbol: string;
  connection: Connection;
  payerKeypair: Keypair;
  programId: PublicKey;
}
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
const treasury = new PublicKey("8UoRQ1rBqwgf19vBadmG842k4t6TuqmgcVkEp5S28Rm2");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
// Constants matching your Rust contract
export const LAMPORTS_PER_SOL = BigInt(1_000_000_000);
export const TOKEN_DECIMALS = 6; // Adjust if your token uses different decimals
export const TOKEN_MULTIPLIER = BigInt(10 ** TOKEN_DECIMALS);

export const createToken = async ({
  name,
  uri,
  symbol,
  connection,
  payerKeypair,
  programId,
}: CreateToken) => {
  try {
    const wallet = new Wallet(payerKeypair);
    const [globalConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("global-config")],
      programId
    );
    const tokenMintKeypair = Keypair.generate();

    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bonding-curve"),
        tokenMintKeypair.publicKey.toBuffer(),
        payerKeypair.publicKey.toBuffer(),
      ],
      programId
    );

    const bondingCurveTokenAccount = await getAssociatedTokenAddress(
      tokenMintKeypair.publicKey,
      bondingCurve,
      true
    );

    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMintKeypair.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const provider = new AnchorProvider(connection, wallet);
    const program = new Program(idl, provider);
    const tx = await program.methods
      .createToken(name, symbol, uri)
      .accounts({
        creator: payerKeypair.publicKey,
        globalConfig,
        treasury,
        bondingCurve,
        tokenMint: tokenMintKeypair.publicKey,
        bondingCurveTokenAccount,
        metadataAccount,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([tokenMintKeypair])
      .rpc();

    return {
      success: true,
      signature: tx,
      tokenMintKeypair,
    };
  } catch (error) {
    console.error("Error while creating the token!", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong",
      signature: null,
    };
  }
};

export const getMyTokens = async ({
  connection,
  programId,
  creatorPubkey,
}: {
  connection: Connection;
  programId: PublicKey;
  creatorPubkey: PublicKey;
}): Promise<UserToken[]> => {
  try {
    const coder = new BorshAccountsCoder(idl as any);
    const discriminator = getAccountDiscriminator("BondingCurve");
    const discriminatorBase = bs58.encode(discriminator);

    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: discriminatorBase,
          },
        },

        {
          memcmp: {
            offset: 8,
            bytes: creatorPubkey.toBase58(),
          },
        },
      ],
    });

    const decodedTokens: UserToken[] = [];

    for (const { pubkey, account } of accounts) {
      const decoded = coder.decode("BondingCurve", account.data);

      const tokenMint = new PublicKey(decoded.token_mint.toString());

      const tokenMetadata = await getTokenMetadata(connection, tokenMint);

      const virtualSolReserves = decoded.virtual_sol_reserves.toNumber();
      const virtualTokenReserves = decoded.virtual_token_reserves.toNumber();
      const realSolReserves = decoded.real_sol_reserves.toNumber();
      const realTokenReserves = decoded.real_token_reserves.toNumber();

      const currentPrice = calculateTokenPrice(
        virtualSolReserves,
        virtualTokenReserves
      );

      const holders = await getTokenHolders(connection, tokenMint, pubkey);

      decodedTokens.push({
        bondingCurve: pubkey.toString(),
        tokenMint: decoded.token_mint.toString(),
        name: tokenMetadata?.name || "Unknown Token",
        symbol: tokenMetadata?.symbol || "???",
        uri: tokenMetadata?.uri,
        creator: decoded.creator.toString(),
        virtualSolReserves,
        virtualTokenReserves,
        currentPrice,
        realSolReserves,
        realTokenReserves,
        graduated: !decoded.graduated.Active,
        bump: decoded.bump,
        holders,
      });
    }

    return decodedTokens;
  } catch (error) {
    console.error("Error while fetching my tokens:", error);
    return [];
  }
};

export const getAvailableTokens = async ({
  connection,
  programId,
}: {
  connection: Connection;
  programId: PublicKey;
}) => {
  try {
    const coder = new BorshAccountsCoder(idl as any);
    const discriminator = getAccountDiscriminator("BondingCurve");
    const discriminatorBase = bs58.encode(discriminator);

    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: discriminatorBase,
          },
        },
      ],
    });

    const decodedTokens: UserToken[] = [];

    for (const { account, pubkey } of accounts) {
      const decoded = coder.decode("BondingCurve", account.data);

      const tokenMint = new PublicKey(decoded.token_mint.toString());

      const tokenMetadata = await getTokenMetadata(connection, tokenMint);

      const virtualSolReserves = BigInt(decoded.virtual_sol_reserves);
      const virtualTokenReserves = BigInt(decoded.virtual_token_reserves);
      const realSolReserves = BigInt(decoded.real_sol_reserves);
      const realTokenReserves = BigInt(decoded.real_token_reserves);

      console.log("TOken metadata name: ", tokenMetadata?.name);

      console.log("Virtual SOL reserves:", virtualSolReserves.toString());
      console.log("Virtual token reserves:", virtualTokenReserves.toString());
      console.log("Real SOL reserves:", realSolReserves.toString());
      console.log("Real token reserves:", realTokenReserves.toString());

      const currentPrice = calculateTokenPrice(
        virtualSolReserves,
        virtualTokenReserves
      );

      const holders = await getTokenHolders(connection, tokenMint, pubkey);

      decodedTokens.push({
        bondingCurve: pubkey.toString(),
        tokenMint: decoded.token_mint.toString(),
        name: tokenMetadata?.name || "Unknown Token",
        symbol: tokenMetadata?.symbol || "???",
        uri: tokenMetadata?.uri,
        creator: decoded.creator.toString(),
        virtualSolReserves,
        virtualTokenReserves,
        currentPrice,
        realSolReserves,
        realTokenReserves,
        graduated: !decoded.graduated.Active,
        bump: decoded.bump,
        holders,
      });
    }

    return decodedTokens;
  } catch (error) {
    console.error("Error while fetching available tokens:", error);
    return [];
  }
};

export const buyTokens = async ({
  connection,
  programId,
  buyerKeypair,
  tokenMint,
  amount,
  creator,
}: BuyTokensParams) => {
  try {
    const wallet = new Wallet(buyerKeypair);
    const provider = new AnchorProvider(connection, wallet);
    const program = new Program(idl, provider);

    const solAmount = new BN_VALUE(amount).mul(new BN(LAMPORTS_PER_SOL));

    const [globalConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("global-config")],
      programId
    );

    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), tokenMint.toBuffer(), creator.toBuffer()],
      programId
    );

    const bondingCurveTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      bondingCurve,
      true
    );

    const buyerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      buyerKeypair.publicKey,
      true
    );

    const wsolTempTokenAccount = await getAssociatedTokenAddress(
      WSOL_MINT,
      bondingCurve,
      true
    );

    const liquidityTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      bondingCurve,
      true
    );

    const tx = new Transaction();

    const programIx = await program.methods
      .buyTokens(solAmount)
      .accounts({
        buyer: buyerKeypair.publicKey,
        globalConfig,
        tokenMint,
        bondingCurve,
        bondingCurveTokenAccount,
        buyerTokenAccount,
        wsolTempTokenAccount,
        liquidityTokenAccount,
        wsolMintAccount: WSOL_MINT,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    tx.add(programIx);

    const signature = await provider.sendAndConfirm(tx);

    return {
      success: true,
      signature,
    };
  } catch (error) {
    console.error("Error buying tokens:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      signature: null,
    };
  }
};

export const sellTokens = async ({
  creator,
  programId,
  connection,
  tokensIn,
  tokenMint,
  sellerKeypair,
}: SellTokensParams) => {
  try {
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), tokenMint.toBuffer(), creator.toBuffer()],
      programId
    );

    const [globalConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("global-config")],
      programId
    );

    const sellerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      sellerKeypair.publicKey
    );

    const bondingCurveTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      bondingCurve,
      true
    );

    const wallet = new Wallet(sellerKeypair);

    const provider = new AnchorProvider(connection, wallet);
    const program = new Program(idl, provider);

    const tx = await program.methods
      .sellTokens(tokensIn)
      .accounts({
        seller: sellerKeypair.publicKey,
        tokenMint,
        bondingCurve,
        globalConfig,
        sellerTokenAccount,
        bondingCurveTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      success: true,
      signature: tx,
    };
  } catch (error) {
    console.error("Error while selling tokens: ", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      signature: null,
    };
  }
};

function getAccountDiscriminator(accountName: string): Buffer {
  const hash = sha256(Buffer.from(`account:${accountName}`));
  return Buffer.from(hash.slice(0, 8));
}

async function getTokenMetadata(
  connection: Connection,
  tokenMint: PublicKey
): Promise<{ name: string; symbol: string; uri: string } | null> {
  try {
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(metadataAccount);

    if (!accountInfo) {
      return null;
    }

    const data = accountInfo.data;
    let offset = 65; // Skip key + update_authority + mint

    // Read name
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    const name = data
      .slice(offset, offset + nameLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
    offset += nameLength;

    // Read symbol
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data
      .slice(offset, offset + symbolLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
    offset += symbolLength;

    // Read URI
    const uriLength = data.readUInt32LE(offset);
    offset += 4;
    const uri = data
      .slice(offset, offset + uriLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();

    return { name, symbol, uri };
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return null;
  }
}

// For buying tokens
export const calculateTokensOut = (
  solAmount: number, // in lamports
  solReserves: number, // in lamports
  tokenReserves: number // in smallest token units
): number => {
  const solAmountU128 = BigInt(Math.floor(solAmount));
  const solReservesU128 = BigInt(Math.floor(solReserves));
  const tokenReservesU128 = BigInt(Math.floor(tokenReserves));

  if (solReservesU128 === 0n || tokenReservesU128 === 0n) {
    throw new Error("Invalid reserves");
  }

  // Constant product: k = x * y
  const k = solReservesU128 * tokenReservesU128;

  // New reserves after adding SOL
  const newSolReserves = solReservesU128 + solAmountU128;

  // Calculate new token reserves
  const newTokenReserves = k / newSolReserves;

  // Tokens out is the difference
  const tokensOut = tokenReservesU128 - newTokenReserves;

  return Number(tokensOut);
};

// Calculate current token price in lamports per token (smallest unit)
export const calculateTokenPrice = (
  solReserves: bigint, // in lamports
  tokenReserves: bigint // in smallest token units
): number => {
  if (solReserves === 0n || tokenReserves === 0n) {
    return 0;
  }

  const sol = solReserves / LAMPORTS_PER_SOL;
  const tokens = tokenReserves / TOKEN_MULTIPLIER;

  const priceSOLPerToken = Number(sol) / Number(tokens);

  return priceSOLPerToken;
};

export const calculateSolOut = (
  tokensIn: bigint, // in smallest token units
  solReserves: bigint, // in lamports
  tokenReserves: bigint // in smallest token units
): bigint => {
  if (solReserves === 0n || tokenReserves === 0n) {
    return 0n;
  }

  const k = solReserves * tokenReserves;
  const newTokenReserves = tokenReserves + tokensIn;
  const newSolReserves = k / newTokenReserves;
  const solOut = solReserves - newSolReserves;

  return solOut;
};

export const formatPrice = (price: number, forAmount: number = 1): string => {
  const amountText =
    forAmount === 1 ? "" : ` per ${forAmount.toLocaleString()}`;

  if (price === 0) return `0 SOL${amountText}`;

  if (price < 0.000001) {
    return `${price.toExponential(2)} SOL${amountText}`;
  } else if (price < 0.001) {
    return `${price.toFixed(8)} SOL${amountText}`;
  } else if (price < 1) {
    return `${price.toFixed(6)} SOL${amountText}`;
  } else {
    return `${price.toFixed(4)} SOL${amountText}`;
  }
};

export const getTokenHolders = async (
  connection: Connection,
  tokenMint: PublicKey,
  bondingCurveAddress: PublicKey // ← Add this parameter
): Promise<number> => {
  try {
    const TOKEN_PROGRAM_ID = new PublicKey(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    );

    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        {
          dataSize: 165, // Size of token account
        },
        {
          memcmp: {
            offset: 0, // Mint address is at offset 0
            bytes: tokenMint.toBase58(),
          },
        },
      ],
    });

    let holders = 0;
    for (const { account, pubkey } of accounts) {
      const amount = account.data.readBigUInt64LE(64);

      const owner = new PublicKey(account.data.slice(32, 64));

      if (amount > 0n) {
        if (bondingCurveAddress && owner.equals(bondingCurveAddress)) {
          continue; // Skip bonding curve
        }
        holders++;
      }
    }

    return holders;
  } catch (error) {
    console.error("Error fetching token holders:", error);
    return 0;
  }
};
