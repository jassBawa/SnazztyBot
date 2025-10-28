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
import { BN } from "bn.js";

interface UserToken {
  bondingCurve: string;
  creator: string;
  tokenMint: string;
  realSolReserves: number;
  realTokenReserves: number;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  name?: string;
  uri?: string;
  symbol?: string;
  graduated: boolean;
  bump: number;
  currentPrice: number;
  holders: number;
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

      const virtualSolReserves = decoded.virtual_sol_reserves.toNumber() / 1e9;
      const virtualTokenReserves =
        decoded.virtual_token_reserves.toNumber() / Math.pow(10, 6);

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
        realSolReserves: decoded.real_sol_reserves.toNumber() / 1e9,
        realTokenReserves:
          decoded.real_token_reserves.toNumber() / Math.pow(10, 6),
        graduated: !decoded.graduated.Active,
        bump: decoded.bump,
        holders,
      });
    }

    console.log(decodedTokens, "decodedTokens");
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

      const virtualSolReserves = decoded.virtual_sol_reserves.toNumber() / 1e9;
      const virtualTokenReserves =
        decoded.virtual_token_reserves.toNumber() / Math.pow(10, 6);

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
        realSolReserves: decoded.real_sol_reserves.toNumber() / 1e9,
        realTokenReserves:
          decoded.real_token_reserves.toNumber() / Math.pow(10, 6),
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

export const calculateTokenPrice = (
  solReserves: number,
  tokenReserves: number,
  tokensAmount: number = 1
): number => {
  if (tokenReserves === 0) {
    return 0;
  }

  const pricePerToken = solReserves / tokenReserves;
  return pricePerToken * tokensAmount;
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

interface BuyTokensParams {
  connection: Connection;
  programId: PublicKey;
  buyerKeypair: Keypair;
  tokenMint: PublicKey;
  amount: number;
  creator: PublicKey;
}

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

    const solAmount = new BN(amount).mul(new BN(1e9));

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
      buyerKeypair.publicKey
    );

    const wsolTempTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      buyerKeypair,
      WSOL_MINT,
      bondingCurve,
      true
    );
    const wsolTempTokenAccount = wsolTempTokenAccountInfo.address;

    const liquidityTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      buyerKeypair,
      tokenMint,
      bondingCurve,
      true
    );

    const liquidityTokenAccount = liquidityTokenAccountInfo.address;

    const tx = new Transaction();

    tx.add(
      SystemProgram.transfer({
        fromPubkey: buyerKeypair.publicKey,
        toPubkey: bondingCurve,
        lamports: solAmount.toNumber(),
      })
    );

    const programIx = await program.methods
      .buyTokens(solAmount)
      .accounts({
        buyer: buyerKeypair.publicKey,
        globalConfig,
        treasury,
        tokenMint,
        bondingCurve,
        bondingCurveTokenAccount,
        buyerTokenAccount,
        wsolTempTokenAccount,
        liquidityTokenAccount,
        wsolMintAccount: WSOL_MINT,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
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
