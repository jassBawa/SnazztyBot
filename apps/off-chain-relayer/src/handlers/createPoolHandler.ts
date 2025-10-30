import idl from "../idl/program.json";

import { PublicKey } from "@solana/web3.js";
import {
  ApiV3Token,
  DEVNET_PROGRAM_ID,
  Raydium,
  TxVersion,
} from "@raydium-io/raydium-sdk-v2";
import { initSdk, owner } from "../config";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import BN from "bn.js";

export interface CreatePoolEvent {
  mintA: string;
  mintAAmount: bigint;
  mintB: string;
  mintBAmount: bigint;
  creator: string;
  wsolAta: PublicKey;
  // tokenAta: PublicKey;
}

const programId = new PublicKey(process.env.PROGRAM_ID!);

export const createPoolHandler = async (event: CreatePoolEvent) => {
  try {
    const {
      mintA,
      mintB,
      mintAAmount,
      mintBAmount,
      creator,
      wsolAta,
      // tokenAta,
    } = event;

    if (!mintA || !mintB) {
      console.error("Mints are not valid!");
      return null;
    }

    const validMintA = isValidPubkey(mintA);
    const validMintB = isValidPubkey(mintB);

    if (!validMintA || !validMintB) {
      console.error("Mints are not valid!");
      return null;
    }

    const raydium = await initSdk();

    const mint1 = await raydium.token.getTokenInfo(validMintA);

    const mint2 = await raydium.token.getTokenInfo(validMintB);

    const exists = await checkIfPoolExists(raydium, mint1, mint2);

    if (exists) {
      console.error("Pool already exists!");
      return null;
    }

    const poolInfo = await createPool({
      raydium,
      mintA: mint1,
      mintB: mint2,
      mintAAmount,
      mintBAmount,
    });

    if (!poolInfo || !poolInfo.lpMint) {
      console.error("Pool info or lpMint is undefined!");
      return null;
    }

    const creatorPubkey = new PublicKey(creator);

    if (!programId) {
      console.error("Invalid Program Id!");
      return null;
    }

    const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bonding-curve"),
        new PublicKey(mintA).toBuffer(),
        creatorPubkey.toBuffer(),
      ],
      programId
    );

    const tokenMint = new PublicKey(mintA);

    try {
      await callGraduateInstruction({
        bonding_curve: bondingCurvePDA,
        token_mint: tokenMint,
        pool: poolInfo.poolId,
      });
    } catch (error) {
      console.error("Error while calling graduate instruction: ", error);
    }
  } catch (error) {
    console.error("Error in createPoolHandler, something went wrong!", error);
  }
};

const isValidPubkey = (mint: string) => {
  try {
    return new PublicKey(mint);
  } catch (error) {
    return null;
  }
};

const checkIfPoolExists = async (
  raydium: Raydium,
  mintA: ApiV3Token,
  mintB: ApiV3Token
) => {
  try {
    const pools = await raydium.api.getPoolList();

    const exists = pools.data.some((pool: any) => {
      const poolMintA = pool.mintA.address;
      const poolMintB = pool.mintB.address;

      const directMatch =
        poolMintA === mintA.address && poolMintB === mintB.address;
      const reverseMatch =
        poolMintA === mintB.address && poolMintB === mintA.address;

      return directMatch || reverseMatch;
    });

    if (exists) return true;

    return false;
  } catch (error) {
    console.error(
      "Something went wrong while fetching the liquidity pool",
      error
    );
    return true;
  }
};

const createPool = async ({
  raydium,
  mintA,
  mintAAmount,
  mintB,
  mintBAmount,
}: {
  raydium: Raydium;
  mintA: ApiV3Token;
  mintAAmount: bigint;
  mintB: ApiV3Token;
  mintBAmount: bigint;
}) => {
  try {
    const feeConfigs = await raydium.api.getCpmmConfigs();
    console.log("Creating pool with Raydium SDK...");

    const { execute, extInfo } = await raydium.cpmm.createPool({
      programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
      poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
      mintA,
      mintB,
      mintAAmount: new BN(mintAAmount),
      mintBAmount: new BN(mintBAmount),
      startTime: new BN(Math.floor(Date.now() / 1000)),
      txVersion: TxVersion.V0,
      feeConfig: feeConfigs[0],
      associatedOnly: true,
      ownerInfo: {
        useSOLBalance: false,
      },
    });

    const result = await execute();

    return {
      poolId: extInfo.address.poolId,
      lpMint: extInfo.address.lpMint,
      txId: result.txId,
    };
  } catch (error) {
    console.error("Error while creating the pool!: ", error);
  }
};

const callGraduateInstruction = async ({
  bonding_curve,
  token_mint,
  pool,
}: {
  bonding_curve: PublicKey;
  token_mint: PublicKey;
  pool: PublicKey;
}) => {
  try {
    const raydium = await initSdk();
    const connection = raydium.connection;

    const provider = new AnchorProvider(connection, new Wallet(owner), {
      commitment: "confirmed",
    });

    const program = new Program(idl, provider);

    const tx = await program.methods
      .graduate(pool)
      .accounts({
        tokenMint: token_mint,
        bondingCurve: bonding_curve,
        relayer: owner.publicKey,
      })
      .signers([owner])
      .rpc();

    console.log("GRADUATE TRANSACTION: ", tx);
  } catch (error) {
    console.error(
      "Something went wrong while calling graduate instruction",
      error
    );
  }
};
