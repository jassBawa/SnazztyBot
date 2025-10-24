import { Keypair, PublicKey } from "@solana/web3.js";
import {
  Raydium,
  TxVersion,
  ALL_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
  Token,
  TokenAmount,
  toApiV3Token,
} from "@raydium-io/raydium-sdk-v2";
import { getConnection, getTokenDecimals, isToken2022, getTokenProgramId } from "./solana";

// Constants
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const DEFAULT_SLIPPAGE = 0.01; // 1%
const DEFAULT_TOKEN_DECIMALS = 9;
const LAMPORTS_PER_SOL = 1_000_000_000;

// Types
interface SwapResult {
  signature: string;
  explorerLink: string;
  inputAmount: string;
  outputAmount: string;
}

interface QuoteResult {
  outputAmount: string;
  priceImpact: string;
  routeType: string;
  poolIds: string;
}

/**
 * Initialize Raydium SDK instance with user's keypair
 */
async function getRaydiumInstance(owner: Keypair): Promise<Raydium> {
  const connection = getConnection();
  const cluster = (process.env.SOLANA_CLUSTER || "devnet") as "mainnet" | "devnet";

  const raydium = await Raydium.load({
    owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: false,
  });

  return raydium;
}

/**
 * Get program IDs based on cluster
 */
function getPoolProgramIds(isDevnet: boolean) {
  return {
    amm: isDevnet ? DEVNET_PROGRAM_ID.AMM_V4 : ALL_PROGRAM_ID.AMM_V4,
    clmm: isDevnet ? DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID : ALL_PROGRAM_ID.CLMM_PROGRAM_ID,
    cpmm: isDevnet ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM : ALL_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
    router: isDevnet ? DEVNET_PROGRAM_ID.Router : ALL_PROGRAM_ID.Router,
  };
}

/**
 * Create explorer link for a transaction
 */
function createExplorerLink(txId: string): string {
  const cluster = process.env.SOLANA_CLUSTER || "devnet";
  return `https://explorer.solana.com/tx/${txId}${
    cluster !== "mainnet-beta" ? `?cluster=${cluster}` : ""
  }`;
}

/**
 * Get best route for a swap
 */
async function getBestRoute(params: {
  raydium: Raydium;
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmount: string;
  inputDecimals: number;
  outputDecimals: number;
  slippage: number;
  isDevnet: boolean;
}) {
  const {
    raydium,
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals,
    outputDecimals,
    slippage,
    isDevnet,
  } = params;

  // Fetch chain time
  await raydium.fetchChainTime();

  // Get program IDs
  const programIds = getPoolProgramIds(isDevnet);

  // Fetch pool data from all pool types
  const poolData = await raydium.tradeV2.fetchRoutePoolBasicInfo({
    amm: programIds.amm,
    clmm: programIds.clmm,
    cpmm: programIds.cpmm,
  });

  // Get all possible routes
  const routes = raydium.tradeV2.getAllRoute({
    inputMint,
    outputMint,
    ...poolData,
  });

  if (routes.directPath.length === 0) {
    throw new Error(
      "No trading routes found for this token pair. Make sure the token has liquidity pools on this network."
    );
  }

  // Fetch route data
  const routeData = await raydium.tradeV2.fetchSwapRoutesData({
    routes,
    inputMint,
    outputMint,
  });

  // Check if tokens are Token-2022
  const isInputToken2022 = await isToken2022(inputMint.toBase58());
  const isOutputToken2022 = await isToken2022(outputMint.toBase58());
  const outputProgramId = await getTokenProgramId(outputMint.toBase58());

  console.log("[RAYDIUM] Token program check:", {
    input: { address: inputMint.toBase58(), isToken2022: isInputToken2022 },
    output: { address: outputMint.toBase58(), isToken2022: isOutputToken2022, programId: outputProgramId },
  });

  // Create token info
  const inputToken = new Token({
    mint: inputMint.toBase58(),
    decimals: inputDecimals,
    isToken2022: isInputToken2022,
  });

  const inputTokenAmount = new TokenAmount(inputToken, inputAmount);

  // Get epoch info
  const epochInfo = await raydium.connection.getEpochInfo();

  // Calculate quotes for all routes
  const swapRoutes = raydium.tradeV2.getAllRouteComputeAmountOut({
    inputTokenAmount,
    directPath: routes.directPath.map(
      (p) =>
        routeData.ammSimulateCache[p.id.toBase58()] ||
        routeData.computeClmmPoolInfo[p.id.toBase58()] ||
        routeData.computeCpmmData[p.id.toBase58()]
    ),
    routePathDict: routeData.routePathDict,
    simulateCache: routeData.ammSimulateCache,
    tickCache: routeData.computePoolTickData,
    mintInfos: routeData.mintInfos,
    outputToken: toApiV3Token({
      address: outputMint.toBase58(),
      decimals: outputDecimals,
      programId: outputProgramId,
    }),
    chainTime: Math.floor(raydium.chainTimeData?.chainTime ?? Date.now() / 1000),
    slippage,
    epochInfo,
  });

  if (!swapRoutes || swapRoutes.length === 0) {
    throw new Error("No valid swap routes found");
  }

  // Best route is first (sorted by output amount)
  return swapRoutes[0];
}

/**
 * Execute swap transaction
 */
async function executeSwap(params: {
  raydium: Raydium;
  bestRoute: any;
  isDevnet: boolean;
}): Promise<string> {
  const { raydium, bestRoute, isDevnet } = params;

  try {
    const programIds = getPoolProgramIds(isDevnet);

    console.log("[RAYDIUM] Preparing swap transaction...");
    const { execute } = await raydium.tradeV2.swap({
      swapInfo: bestRoute,
      txVersion: TxVersion.V0,
      routeProgram: programIds.router,
      ownerInfo: {
        associatedOnly: true,
        checkCreateATAOwner: true,
      },
      computeBudgetConfig: {
        units: 600000,
        microLamports: 100000,
      },
    });

    console.log("[RAYDIUM] Executing transaction...");
    const { txIds } = await execute({ sendAndConfirm: true, sequentially: true });
    console.log("[RAYDIUM] Transaction IDs:", txIds);
    return txIds[0];
  } catch (error: any) {
    console.error("[RAYDIUM] Execute swap error details:", error);
    console.error("[RAYDIUM] Error type:", typeof error);
    console.error("[RAYDIUM] Error message:", error?.message);
    console.error("[RAYDIUM] Error stack:", error?.stack);
    console.error("[RAYDIUM] Full error:", JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Swap SOL for a token using Raydium TradeV2 best route
 * Automatically finds and uses the best price across all pool types (AMM, CLMM, CPMM)
 */
export async function swapSolForToken(params: {
  userKeypair: Keypair;
  tokenMint: string;
  solAmount: number;
  slippage?: number;
}): Promise<SwapResult> {
  const { userKeypair, tokenMint, solAmount, slippage = DEFAULT_SLIPPAGE } = params;

  try {
    const raydium = await getRaydiumInstance(userKeypair);
    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";

    const inputMint = SOL_MINT;
    const outputMint = new PublicKey(tokenMint);
    const inputAmount = Math.floor(solAmount * LAMPORTS_PER_SOL).toString();

    // Fetch actual token decimals
    const outputDecimals = await getTokenDecimals(tokenMint);
    console.log("[RAYDIUM] Token decimals:", outputDecimals);

    // Get best route
    const bestRoute = await getBestRoute({
      raydium,
      inputMint,
      outputMint,
      inputAmount,
      inputDecimals: DEFAULT_TOKEN_DECIMALS, // SOL is always 9 decimals
      outputDecimals,
      slippage,
      isDevnet,
    });

    console.log("[RAYDIUM] Best route selected:", {
      type: bestRoute.routeType,
      output: bestRoute.amountOut.amount.toExact(),
      impact: bestRoute.priceImpact,
    });

    // Execute swap
    const txId = await executeSwap({ raydium, bestRoute, isDevnet });

    console.log("[RAYDIUM] Swap successful:", txId);

    return {
      signature: txId,
      explorerLink: createExplorerLink(txId),
      inputAmount: solAmount.toString(),
      outputAmount: bestRoute.amountOut.amount.toExact(),
    };
  } catch (error: any) {
    console.error("[RAYDIUM] Swap failed:", error.message);
    throw new Error(`Swap failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Swap token for SOL using Raydium TradeV2 best route
 * Automatically finds and uses the best price across all pool types (AMM, CLMM, CPMM)
 */
export async function swapTokenForSol(params: {
  userKeypair: Keypair;
  tokenMint: string;
  tokenAmount: number;
  slippage?: number;
}): Promise<SwapResult> {
  const { userKeypair, tokenMint, tokenAmount, slippage = DEFAULT_SLIPPAGE } = params;

  try {
    const raydium = await getRaydiumInstance(userKeypair);
    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";

    const inputMint = new PublicKey(tokenMint);
    const outputMint = SOL_MINT;

    // Fetch actual token decimals
    const inputDecimals = await getTokenDecimals(tokenMint);
    console.log("[RAYDIUM] Token decimals:", inputDecimals);

    const inputAmount = Math.floor(tokenAmount * Math.pow(10, inputDecimals)).toString();

    // Get best route
    const bestRoute = await getBestRoute({
      raydium,
      inputMint,
      outputMint,
      inputAmount,
      inputDecimals,
      outputDecimals: DEFAULT_TOKEN_DECIMALS, // SOL is always 9 decimals
      slippage,
      isDevnet,
    });

    console.log("[RAYDIUM] Best route selected:", {
      type: bestRoute.routeType,
      output: bestRoute.amountOut.amount.toExact(),
      impact: bestRoute.priceImpact,
    });

    // Execute swap
    const txId = await executeSwap({ raydium, bestRoute, isDevnet });

    console.log("[RAYDIUM] Swap successful:", txId);

    return {
      signature: txId,
      explorerLink: createExplorerLink(txId),
      inputAmount: tokenAmount.toString(),
      outputAmount: bestRoute.amountOut.amount.toExact(),
    };
  } catch (error: any) {
    console.error("[RAYDIUM] Swap failed:", error.message);
    throw new Error(`Swap failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Get best price quote without executing swap
 */
async function getBestPriceQuote(params: {
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmount: string;
  inputDecimals: number;
  outputDecimals: number;
}): Promise<QuoteResult> {
  const { inputMint, outputMint, inputAmount, inputDecimals, outputDecimals } = params;

  // Create temporary keypair for quote (not used for signing)
  const tempKeypair = Keypair.generate();
  const raydium = await getRaydiumInstance(tempKeypair);
  const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";

  // Get best route
  const bestRoute = await getBestRoute({
    raydium,
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals,
    outputDecimals,
    slippage: DEFAULT_SLIPPAGE,
    isDevnet,
  });

  return {
    outputAmount: bestRoute.amountOut.amount.toExact(),
    priceImpact: (Number(bestRoute.priceImpact) * 100).toFixed(2),
    routeType: bestRoute.routeType,
    poolIds: bestRoute.poolInfoList.map((p) => p.id).join(" → "),
  };
}

/**
 * Preview swap output for SOL to Token
 */
export async function previewSolForToken(params: {
  tokenMint: string;
  solAmount: number;
}): Promise<QuoteResult> {
  const { tokenMint, solAmount } = params;

  const inputMint = SOL_MINT;
  const outputMint = new PublicKey(tokenMint);
  const inputAmount = Math.floor(solAmount * LAMPORTS_PER_SOL).toString();

  // Fetch actual token decimals
  const outputDecimals = await getTokenDecimals(tokenMint);

  return getBestPriceQuote({
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals: DEFAULT_TOKEN_DECIMALS, // SOL is always 9 decimals
    outputDecimals,
  });
}

/**
 * Preview swap output for Token to SOL
 */
export async function previewTokenForSol(params: {
  tokenMint: string;
  tokenAmount: number;
}): Promise<QuoteResult> {
  const { tokenMint, tokenAmount } = params;

  const inputMint = new PublicKey(tokenMint);
  const outputMint = SOL_MINT;

  // Fetch actual token decimals
  const inputDecimals = await getTokenDecimals(tokenMint);
  const inputAmount = Math.floor(tokenAmount * Math.pow(10, inputDecimals)).toString();

  return getBestPriceQuote({
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals,
    outputDecimals: DEFAULT_TOKEN_DECIMALS, // SOL is always 9 decimals
  });
}

/**
 * Swap token for another token using Raydium TradeV2 best route
 * Automatically finds and uses the best price across all pool types (AMM, CLMM, CPMM)
 */
export async function swapTokenForToken(params: {
  userKeypair: Keypair;
  inputTokenMint: string;
  outputTokenMint: string;
  inputTokenAmount: number;
  slippage?: number;
}): Promise<SwapResult> {
  const { userKeypair, inputTokenMint, outputTokenMint, inputTokenAmount, slippage = DEFAULT_SLIPPAGE } = params;

  try {
    console.log("[RAYDIUM] Starting token-to-token swap:", {
      input: inputTokenMint,
      output: outputTokenMint,
      amount: inputTokenAmount,
      slippage,
    });

    const raydium = await getRaydiumInstance(userKeypair);
    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";

    const inputMint = new PublicKey(inputTokenMint);
    const outputMint = new PublicKey(outputTokenMint);

    // Fetch actual token decimals for both tokens
    const inputDecimals = await getTokenDecimals(inputTokenMint);
    const outputDecimals = await getTokenDecimals(outputTokenMint);
    console.log("[RAYDIUM] Input token decimals:", inputDecimals);
    console.log("[RAYDIUM] Output token decimals:", outputDecimals);

    const inputAmount = Math.floor(inputTokenAmount * Math.pow(10, inputDecimals)).toString();
    console.log("[RAYDIUM] Input amount (raw):", inputAmount);

    // Get best route
    const bestRoute = await getBestRoute({
      raydium,
      inputMint,
      outputMint,
      inputAmount,
      inputDecimals,
      outputDecimals,
      slippage,
      isDevnet,
    });

    console.log("[RAYDIUM] Best route selected:", {
      type: bestRoute.routeType,
      output: bestRoute.amountOut.amount.toExact(),
      impact: bestRoute.priceImpact,
    });

    // Execute swap
    const txId = await executeSwap({ raydium, bestRoute, isDevnet });

    console.log("[RAYDIUM] Swap successful:", txId);

    return {
      signature: txId,
      explorerLink: createExplorerLink(txId),
      inputAmount: inputTokenAmount.toString(),
      outputAmount: bestRoute.amountOut.amount.toExact(),
    };
  } catch (error: any) {
    console.error("[RAYDIUM] Token-to-token swap failed - Full error:", error);
    console.error("[RAYDIUM] Error message:", error?.message);
    console.error("[RAYDIUM] Error logs:", error?.logs);
    console.error("[RAYDIUM] Error code:", error?.code);

    // Try to get more meaningful error message
    let errorMessage = "Unknown error";
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.logs && Array.isArray(error.logs)) {
      errorMessage = error.logs.join("\n");
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    throw new Error(`Swap failed: ${errorMessage}`);
  }
}

/**
 * Preview swap output for Token to Token
 */
export async function previewTokenForToken(params: {
  inputTokenMint: string;
  outputTokenMint: string;
  inputTokenAmount: number;
}): Promise<QuoteResult> {
  const { inputTokenMint, outputTokenMint, inputTokenAmount } = params;

  const inputMint = new PublicKey(inputTokenMint);
  const outputMint = new PublicKey(outputTokenMint);

  // Fetch actual token decimals for both tokens
  const inputDecimals = await getTokenDecimals(inputTokenMint);
  const outputDecimals = await getTokenDecimals(outputTokenMint);
  const inputAmount = Math.floor(inputTokenAmount * Math.pow(10, inputDecimals)).toString();

  return getBestPriceQuote({
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals,
    outputDecimals,
  });
}
