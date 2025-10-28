import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
  Wallet,
} from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import idl from "./idl/program.json";
import { sha256 } from "@noble/hashes/sha2.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

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

    const bondingCurveTokenAccountKeypair = Keypair.generate();

    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bonding-curve"),
        tokenMintKeypair.publicKey.toBuffer(),
        payerKeypair.publicKey.toBuffer(),
      ],
      programId
    );

    const treasury = new PublicKey(
      "8UoRQ1rBqwgf19vBadmG842k4t6TuqmgcVkEp5S28Rm2"
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
        bondingCurveTokenAccount: bondingCurveTokenAccountKeypair.publicKey,
        metadataAccount,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([tokenMintKeypair, bondingCurveTokenAccountKeypair])
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

      const metadata = await getTokenMetadata(connection, decoded.token_mint);

      decodedTokens.push({
        bondingCurve: pubkey.toString(),
        tokenMint: decoded.token_mint.toString(),
        name: metadata?.name || "Unknown Token",
        symbol: metadata?.symbol || "???",
        uri: metadata?.uri,
        creator: decoded.creator.toString(),
        virtualSolReserves: decoded.virtual_sol_reserves.toNumber() / 1e9,
        virtualTokenReserves:
          decoded.virtual_token_reserves.toNumber() / Math.pow(10, 6),
        realSolReserves: decoded.real_sol_reserves.toNumber() / 1e9,
        realTokenReserves:
          decoded.real_token_reserves.toNumber() / Math.pow(10, 6),
        graduated: !decoded.graduated.Active,
        bump: decoded.bump,
      });
    }

    console.log(decodedTokens, "decodedTokens");
    return decodedTokens;
  } catch (error) {
    console.error("Error while fetching my tokens:", error);
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
