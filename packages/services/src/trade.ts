import { Keypair, PublicKey } from "@solana/web3.js";
import { swapSolForToken, swapTokenForSol } from "./raydium";
import { buyTokens, sellTokens, getAvailableTokens, TOKEN_MULTIPLIER, LAMPORTS_PER_SOL } from "./token";
import { getConnection } from "./solana";
import BN from "bn.js";
import { getQuoteBuy, getQuoteSell } from "./quote";

type ExecuteBuyInput = {
  userKeypair: Keypair;
  mint: string;
  solAmount: number;
  slippage: number;
};

type ExecuteSellInput = {
  userKeypair: Keypair;
  mint: string;
  tokenAmount: number;
  slippage: number;
};

type ExecResult = {
  signature: string;
  explorerLink: string;
  inputAmount: number;
  outputAmount: number;
};

async function isBondingCurveMint(mint: string): Promise<boolean> {
  try {
    const connection = getConnection();
    const programId = new PublicKey(process.env.PROGRAM_ID!);
    const tokens = await getAvailableTokens({ connection, programId });
    return tokens.some((t) => t.tokenMint === mint && !t.graduated);
  } catch {
    return false;
  }
}

export async function executeBuy({ userKeypair, mint, solAmount, slippage }: ExecuteBuyInput): Promise<ExecResult> {
  if (await isBondingCurveMint(mint)) {
    const connection = getConnection();
    const programId = new PublicKey(process.env.PROGRAM_ID!);
    const tokens = await getAvailableTokens({ connection, programId });
    const tok = tokens.find((t) => t.tokenMint === mint);
    if (!tok) throw new Error("Bonding curve token not found");

    const quote = await getQuoteBuy({ mint, solAmount });

    const res = await buyTokens({
      connection,
      programId,
      buyerKeypair: userKeypair,
      tokenMint: new PublicKey(mint),
      amount: solAmount,
      creator: new PublicKey(tok.creator),
    });

    if (!res.success || !res.signature) {
      throw new Error(res.error || "Bonding curve buy failed");
    }

    const cluster = process.env.SOLANA_CLUSTER && process.env.SOLANA_CLUSTER !== "mainnet-beta" ? `?cluster=${process.env.SOLANA_CLUSTER}` : "";
    return {
      signature: res.signature,
      explorerLink: `https://solscan.io/tx/${res.signature}${cluster}`,
      inputAmount: solAmount,
      outputAmount: Number(quote.outputAmount),
    };
  }

  const res = await swapSolForToken({ userKeypair, tokenMint: mint, solAmount, slippage });
  return {
    signature: res.signature,
    explorerLink: res.explorerLink,
    inputAmount: Number(res.inputAmount),
    outputAmount: Number(res.outputAmount),
  };
}

export async function executeSell({ userKeypair, mint, tokenAmount, slippage }: ExecuteSellInput): Promise<ExecResult> {
  if (await isBondingCurveMint(mint)) {
    const connection = getConnection();
    const programId = new PublicKey(process.env.PROGRAM_ID!);
    const tokens = await getAvailableTokens({ connection, programId });
    const tok = tokens.find((t) => t.tokenMint === mint);
    if (!tok) throw new Error("Bonding curve token not found");

    const quote = await getQuoteSell({ mint, tokenAmount });

    const smallest = BigInt(Math.floor(tokenAmount * Number(TOKEN_MULTIPLIER)));
    const tokensIn = new BN(smallest.toString());

    const res = await sellTokens({
      connection,
      programId,
      sellerKeypair: userKeypair,
      tokenMint: new PublicKey(mint),
      tokensIn,
      creator: new PublicKey(tok.creator),
    });

    if (!res.success || !res.signature) {
      throw new Error(res.error || "Bonding curve sell failed");
    }

    const cluster = process.env.SOLANA_CLUSTER && process.env.SOLANA_CLUSTER !== "mainnet-beta" ? `?cluster=${process.env.SOLANA_CLUSTER}` : "";
    return {
      signature: res.signature,
      explorerLink: `https://solscan.io/tx/${res.signature}${cluster}`,
      inputAmount: tokenAmount,
      outputAmount: Number(quote.outputAmount),
    };
  }

  const res = await swapTokenForSol({ userKeypair, tokenMint: mint, tokenAmount, slippage });
  return {
    signature: res.signature,
    explorerLink: res.explorerLink,
    inputAmount: Number(res.inputAmount),
    outputAmount: Number(res.outputAmount),
  };
}


