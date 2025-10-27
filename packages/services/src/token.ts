import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import idl from "./idl/program.json";

interface CreateToken {
  name: string;
  uri: string;
  symbol: string;
  connection: Connection;
  payerKeypair: Keypair;
}

export const createToken = async ({
  name,
  uri,
  symbol,
  connection,
  payerKeypair,
}: CreateToken) => {
  try {
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    const programId = new PublicKey(process.env.PROGRAM_ID!);
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
