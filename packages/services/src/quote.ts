import { previewSolForToken, previewTokenForSol } from "./raydium";
import { getAvailableTokens, calculateTokensOut, calculateSolOut, calculateTokenPrice, LAMPORTS_PER_SOL, TOKEN_MULTIPLIER } from "./token";
import { getConnection } from "./solana";
import { PublicKey } from "@solana/web3.js";

type QuoteBuyInput = { mint: string; solAmount: number };
type QuoteSellInput = { mint: string; tokenAmount: number };

export type QuoteResult = {
  outputAmount: number | string;
  priceImpact?: number | string;
  routeType?: "bonding_curve" | "raydium";
  poolIds?: string;
};

function calcTokensOutBigInt(params: { lamportsIn: bigint; solReserves: bigint; tokenReserves: bigint }): bigint {
  const { lamportsIn, solReserves, tokenReserves } = params;
  if (solReserves === 0n || tokenReserves === 0n) return 0n;
  const k = solReserves * tokenReserves;
  const newSolReserves = solReserves + lamportsIn;
  const newTokenReserves = k / newSolReserves;
  const tokensOut = tokenReserves - newTokenReserves;
  return tokensOut;
}

async function isBondingCurveMint(mint: string): Promise<boolean> {
  try {
    const connection = getConnection();
    const programId = new PublicKey(process.env.PROGRAM_ID!);
    const tokens = await getAvailableTokens({ connection, programId });
    // Only treat as bonding-curve if token exists and is NOT graduated
    return tokens.some((t) => t.tokenMint === mint && !t.graduated);
  } catch {
    return false;
  }
}

export async function getQuoteBuy({ mint, solAmount }: QuoteBuyInput): Promise<QuoteResult> {
  try {
    if (await isBondingCurveMint(mint)) {
      const connection = getConnection();
      const programId = new PublicKey(process.env.PROGRAM_ID!);
      const tokens = await getAvailableTokens({ connection, programId });
      const tok = tokens.find((t) => t.tokenMint === mint);
      if (!tok) return { outputAmount: 0, priceImpact: "-", routeType: "bonding_curve" };

      const estimatedTokens = tok.currentPrice > 0 ? solAmount / tok.currentPrice : 0;

      return { outputAmount: Number(estimatedTokens.toFixed(6)), priceImpact: "-", routeType: "bonding_curve" };
    }

    const preview = await previewSolForToken({ tokenMint: mint, solAmount });
    return {
      outputAmount: preview.outputAmount,
      priceImpact: preview.priceImpact,
      routeType: "raydium",
      poolIds: preview.poolIds,
    };
  } catch (e) {
    try {
      const preview = await previewSolForToken({ tokenMint: mint, solAmount });
      return { outputAmount: preview.outputAmount, priceImpact: preview.priceImpact, routeType: "raydium", poolIds: preview.poolIds };
    } catch {
      return { outputAmount: 0, priceImpact: "-", routeType: undefined };
    }
  }
}

export async function getQuoteSell({ mint, tokenAmount }: QuoteSellInput): Promise<QuoteResult> {
  try {
    if (await isBondingCurveMint(mint)) {
      const connection = getConnection();
      const programId = new PublicKey(process.env.PROGRAM_ID!);
      const tokens = await getAvailableTokens({ connection, programId });
      const tok = tokens.find((t) => t.tokenMint === mint);
      if (!tok) return { outputAmount: 0, priceImpact: "-", routeType: "bonding_curve" };

      const tokensInSmallest = BigInt(Math.floor(tokenAmount * Number(TOKEN_MULTIPLIER)));
      const lamportsOut = calculateSolOut(tokensInSmallest, tok.virtualSolReserves, tok.virtualTokenReserves);
      const solOut = Number(lamportsOut) / Number(LAMPORTS_PER_SOL);

      const currentPrice = calculateTokenPrice(tok.virtualSolReserves, tok.virtualTokenReserves);
      const k = tok.virtualSolReserves * tok.virtualTokenReserves;
      const newTokenReserves = tok.virtualTokenReserves + tokensInSmallest;
      const newSolReserves = k / newTokenReserves;
      const newPrice = calculateTokenPrice(newSolReserves, newTokenReserves);
      const impact = currentPrice > 0 ? ((Number(currentPrice) - Number(newPrice)) / Number(currentPrice)) * 100 : 0;

      return { outputAmount: Number(solOut.toFixed(9)), priceImpact: Number(impact.toFixed(2)), routeType: "bonding_curve" };
    }

    const preview = await previewTokenForSol({ tokenMint: mint, tokenAmount });
    return {
      outputAmount: preview.outputAmount,
      priceImpact: preview.priceImpact,
      routeType: "raydium",
      poolIds: preview.poolIds,
    };
  } catch (e) {
    try {
      const preview = await previewTokenForSol({ tokenMint: mint, tokenAmount });
      return { outputAmount: preview.outputAmount, priceImpact: preview.priceImpact, routeType: "raydium", poolIds: preview.poolIds };
    } catch {
      return { outputAmount: 0, priceImpact: "-", routeType: undefined };
    }
  }
}
