import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  Raydium,
  TxVersion,
  CpmmPoolInfoLayout,
  ALL_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
  CurveCalculator,
  FeeOn,
  Token,
  TokenAmount,
  toApiV3Token,
} from "@raydium-io/raydium-sdk-v2";
import { getConnection } from "./solana";
import BN from "bn.js";

// Native SOL mint (WSOL)
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

/**
 * Initialize Raydium SDK instance with user's keypair
 */
async function getRaydiumInstance(owner: Keypair): Promise<Raydium> {
  console.log("[RAYDIUM] Getting Raydium instance...");
  const connection = getConnection();
  const cluster = (process.env.SOLANA_CLUSTER || "devnet") as "mainnet" | "devnet";
  console.log("[RAYDIUM] Cluster:", cluster);
  console.log("[RAYDIUM] RPC URL:", connection.rpcEndpoint);
  console.log("[RAYDIUM] Owner pubkey:", owner.publicKey.toBase58());

  // Create a new instance for each user to ensure proper signing
  console.log("[RAYDIUM] Loading Raydium SDK...");
  const raydium = await Raydium.load({
    owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: false,
  });
  console.log("[RAYDIUM] Raydium SDK loaded successfully");

  return raydium;
}

/**
 * Fetch CPMM pools for a specific token pair
 */
async function fetchCpmmPools(
  connection: Connection,
  tokenMint: string,
  isDevnet: boolean
): Promise<any[]> {
  console.log("[RAYDIUM] Fetching CPMM pools...");

  const programId = isDevnet
    ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM
    : ALL_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM;

  console.log("[RAYDIUM] Using program ID:", programId.toBase58());

  // Fetch all CPMM pools
  const cpmmPoolsData = await connection.getProgramAccounts(programId, {
    filters: [{ dataSize: CpmmPoolInfoLayout.span }],
  });

  console.log("[RAYDIUM] Found", cpmmPoolsData.length, "CPMM pools");

  // Native SOL mint (WSOL)
  const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
  const tokenMintPk = new PublicKey(tokenMint);

  // Decode and filter for SOL/Token pair
  const pools = cpmmPoolsData
    .map((c) => ({
      poolId: c.pubkey,
      ...CpmmPoolInfoLayout.decode(c.account.data),
    }))
    .filter((pool) => {
      const hasSOL = pool.mintA.equals(SOL_MINT) || pool.mintB.equals(SOL_MINT);
      const hasToken = pool.mintA.equals(tokenMintPk) || pool.mintB.equals(tokenMintPk);
      return hasSOL && hasToken;
    });

  console.log("[RAYDIUM] Found", pools.length, "pools for SOL/Token pair");

  if (pools.length > 0) {
    console.log("[RAYDIUM] Pool details:", {
      poolId: pools[0].poolId.toBase58(),
      mintA: pools[0].mintA.toBase58(),
      mintB: pools[0].mintB.toBase58(),
    });
  }

  return pools;
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
}): Promise<{
  signature: string;
  explorerLink: string;
  inputAmount: string;
  outputAmount: string;
}> {
  const { userKeypair, tokenMint, solAmount, slippage = 0.01 } = params; // 1% default slippage

  console.log("[RAYDIUM] swapSolForToken called");
  console.log("[RAYDIUM] Params:", { tokenMint, solAmount, slippage });

  try {
    console.log("[RAYDIUM] Getting Raydium instance...");
    const raydium = await getRaydiumInstance(userKeypair);

    // Fetch chain time
    await raydium.fetchChainTime();
    console.log("[RAYDIUM] Chain time fetched");

    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";

    // Fetch pool data from all pool types
    console.log("[RAYDIUM] Fetching pool data from all sources...");
    const poolData = await raydium.tradeV2.fetchRoutePoolBasicInfo({
      amm: isDevnet ? DEVNET_PROGRAM_ID.AMM_V4 : ALL_PROGRAM_ID.AMM_V4,
      clmm: isDevnet ? DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID : ALL_PROGRAM_ID.CLMM_PROGRAM_ID,
      cpmm: isDevnet ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM : ALL_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
    });
    console.log("[RAYDIUM] Pool data fetched");

    const inputMint = SOL_MINT;
    const outputMint = new PublicKey(tokenMint);

    // Get all possible routes
    console.log("[RAYDIUM] Finding all routes...");
    const routes = raydium.tradeV2.getAllRoute({
      inputMint,
      outputMint,
      ...poolData,
    });
    console.log("[RAYDIUM] Found routes:", routes.directPath.length, "direct paths");

    if (routes.directPath.length === 0) {
      throw new Error("No trading routes found for this token pair. Make sure the token has liquidity pools on this network.");
    }

    // Fetch route data
    console.log("[RAYDIUM] Fetching route data...");
    const routeData = await raydium.tradeV2.fetchSwapRoutesData({
      routes,
      inputMint,
      outputMint,
    });
    console.log("[RAYDIUM] Route data fetched");

    // Convert SOL amount to lamports
    const inputAmount = Math.floor(solAmount * 1_000_000_000).toString();

    // Create token info for input (SOL)
    const inputToken = new Token({
      mint: inputMint.toBase58(),
      decimals: 9,
      isToken2022: false,
    });

    // Create token amount
    const inputTokenAmount = new TokenAmount(inputToken, inputAmount);

    // Get epoch info
    const epochInfo = await raydium.connection.getEpochInfo();

    // Calculate quotes for all routes and get the best one
    console.log("[RAYDIUM] Computing best route...");
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
        decimals: 9,
        programId: "TokenkGPmanGNXRCf56LSXt8y6LYouGxvPjSzkMGQJx",
      }),
      chainTime: Math.floor(raydium.chainTimeData?.chainTime ?? Date.now() / 1000),
      slippage,
      epochInfo,
    });

    if (!swapRoutes || swapRoutes.length === 0) {
      throw new Error("No valid swap routes found");
    }

    // Best route is first (sorted by output amount)
    const bestRoute = swapRoutes[0];
    console.log("[RAYDIUM] Best route selected:", {
      outputAmount: bestRoute.amountOut.amount.toExact(),
      priceImpact: bestRoute.priceImpact,
      routeType: bestRoute.routeType,
      poolIds: bestRoute.poolInfoList.map((p) => p.id).join(" → "),
    });

    // Execute swap using the best route
    console.log("[RAYDIUM] Building swap transaction...");
    const routeProgram = isDevnet ? DEVNET_PROGRAM_ID.Router : ALL_PROGRAM_ID.Router;
    const { execute } = await raydium.tradeV2.swap({
      swapInfo: bestRoute,
      txVersion: TxVersion.V0,
      routeProgram,
      ownerInfo: {
        associatedOnly: true,
        checkCreateATAOwner: true,
      },
      computeBudgetConfig: {
        units: 600000,
        microLamports: 100000,
      },
    });
    console.log("[RAYDIUM] Swap transaction built");

    // Execute and get transaction ID
    console.log("[RAYDIUM] Executing transaction...");
    const { txIds } = await execute({ sendAndConfirm: true, sequentially: true });
    const txId = txIds[0];
    console.log("[RAYDIUM] Transaction successful! TX:", txId);

    const cluster = process.env.SOLANA_CLUSTER || "devnet";
    const explorerLink = `https://explorer.solana.com/tx/${txId}${
      cluster !== "mainnet-beta" ? `?cluster=${cluster}` : ""
    }`;

    return {
      signature: txId,
      explorerLink,
      inputAmount: solAmount.toString(),
      outputAmount: bestRoute.amountOut.amount.toExact(),
    };
  } catch (error: any) {
    console.error("[RAYDIUM] Swap error:", error);
    console.error("[RAYDIUM] Error message:", error.message);
    console.error("[RAYDIUM] Error stack:", error.stack);
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
}): Promise<{
  signature: string;
  explorerLink: string;
  inputAmount: string;
  outputAmount: string;
}> {
  const { userKeypair, tokenMint, tokenAmount, slippage = 0.01 } = params; // 1% default slippage

  console.log("[RAYDIUM] swapTokenForSol called");
  console.log("[RAYDIUM] Params:", { tokenMint, tokenAmount, slippage });

  try {
    console.log("[RAYDIUM] Getting Raydium instance...");
    const raydium = await getRaydiumInstance(userKeypair);

    // Fetch chain time
    await raydium.fetchChainTime();
    console.log("[RAYDIUM] Chain time fetched");

    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";

    // Fetch pool data from all pool types
    console.log("[RAYDIUM] Fetching pool data from all sources...");
    const poolData = await raydium.tradeV2.fetchRoutePoolBasicInfo({
      amm: isDevnet ? DEVNET_PROGRAM_ID.AMM_V4 : ALL_PROGRAM_ID.AMM_V4,
      clmm: isDevnet ? DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID : ALL_PROGRAM_ID.CLMM_PROGRAM_ID,
      cpmm: isDevnet ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM : ALL_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
    });
    console.log("[RAYDIUM] Pool data fetched");

    const inputMint = new PublicKey(tokenMint);
    const outputMint = SOL_MINT;

    // Get all possible routes
    console.log("[RAYDIUM] Finding all routes...");
    const routes = raydium.tradeV2.getAllRoute({
      inputMint,
      outputMint,
      ...poolData,
    });
    console.log("[RAYDIUM] Found routes:", routes.directPath.length, "direct paths");

    if (routes.directPath.length === 0) {
      throw new Error("No trading routes found for this token pair. Make sure the token has liquidity pools on this network.");
    }

    // Fetch route data
    console.log("[RAYDIUM] Fetching route data...");
    const routeData = await raydium.tradeV2.fetchSwapRoutesData({
      routes,
      inputMint,
      outputMint,
    });
    console.log("[RAYDIUM] Route data fetched");

    // Convert token amount to base units (assuming 9 decimals)
    const inputAmount = Math.floor(tokenAmount * 1_000_000_000).toString();

    // Create token info for input
    const inputToken = new Token({
      mint: inputMint.toBase58(),
      decimals: 9,
      isToken2022: false,
    });

    // Create token amount
    const inputTokenAmount = new TokenAmount(inputToken, inputAmount);

    // Get epoch info
    const epochInfo = await raydium.connection.getEpochInfo();

    // Calculate quotes for all routes and get the best one
    console.log("[RAYDIUM] Computing best route...");
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
        decimals: 9,
        programId: "TokenkGPmanGNXRCf56LSXt8y6LYouGxvPjSzkMGQJx",
      }),
      chainTime: Math.floor(raydium.chainTimeData?.chainTime ?? Date.now() / 1000),
      slippage,
      epochInfo,
    });

    if (!swapRoutes || swapRoutes.length === 0) {
      throw new Error("No valid swap routes found");
    }

    // Best route is first (sorted by output amount)
    const bestRoute = swapRoutes[0];
    console.log("[RAYDIUM] Best route selected:", {
      outputAmount: bestRoute.amountOut.amount.toExact(),
      priceImpact: bestRoute.priceImpact,
      routeType: bestRoute.routeType,
      poolIds: bestRoute.poolInfoList.map((p) => p.id).join(" → "),
    });

    // Execute swap using the best route
    console.log("[RAYDIUM] Building swap transaction...");
    const routeProgram = isDevnet ? DEVNET_PROGRAM_ID.Router : ALL_PROGRAM_ID.Router;
    const { execute } = await raydium.tradeV2.swap({
      swapInfo: bestRoute,
      txVersion: TxVersion.V0,
      routeProgram,
      ownerInfo: {
        associatedOnly: true,
        checkCreateATAOwner: true,
      },
      computeBudgetConfig: {
        units: 600000,
        microLamports: 100000,
      },
    });
    console.log("[RAYDIUM] Swap transaction built");

    // Execute and get transaction ID
    console.log("[RAYDIUM] Executing transaction...");
    const { txIds } = await execute({ sendAndConfirm: true, sequentially: true });
    const txId = txIds[0];
    console.log("[RAYDIUM] Transaction successful! TX:", txId);

    const cluster = process.env.SOLANA_CLUSTER || "devnet";
    const explorerLink = `https://explorer.solana.com/tx/${txId}${
      cluster !== "mainnet-beta" ? `?cluster=${cluster}` : ""
    }`;

    return {
      signature: txId,
      explorerLink,
      inputAmount: tokenAmount.toString(),
      outputAmount: bestRoute.amountOut.amount.toExact(),
    };
  } catch (error: any) {
    console.error("[RAYDIUM] Swap error:", error);
    console.error("[RAYDIUM] Error message:", error.message);
    console.error("[RAYDIUM] Error stack:", error.stack);
    throw new Error(`Swap failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Check if a CPMM pool exists for a token
 */
export async function checkPoolExists(tokenMint: string): Promise<boolean> {
  try {
    const connection = getConnection();
    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";
    const pools = await fetchCpmmPools(connection, tokenMint, isDevnet);
    return pools.length > 0;
  } catch (error) {
    console.error("[RAYDIUM] Error checking pool:", error);
    return false;
  }
}

/**
 * Get best price quote for SOL to Token swap using all available routes
 */
export async function getBestPriceQuoteSolForToken(params: {
  tokenMint: string;
  solAmount: number;
}): Promise<{
  outputAmount: string;
  priceImpact: string;
  routeType: string;
  poolIds: string;
}> {
  const { tokenMint, solAmount } = params;

  try {
    console.log("[RAYDIUM] Getting best price quote for SOL -> Token");

    // Create temporary keypair for quote (not used for signing)
    const tempKeypair = Keypair.generate();
    const raydium = await getRaydiumInstance(tempKeypair);

    // Fetch chain time
    await raydium.fetchChainTime();
    console.log("[RAYDIUM] Chain time fetched");

    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";

    // Fetch pool data from all pool types
    console.log("[RAYDIUM] Fetching pool data from all sources...");
    const poolData = await raydium.tradeV2.fetchRoutePoolBasicInfo({
      amm: isDevnet ? DEVNET_PROGRAM_ID.AMM_V4 : ALL_PROGRAM_ID.AMM_V4,
      clmm: isDevnet ? DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID : ALL_PROGRAM_ID.CLMM_PROGRAM_ID,
      cpmm: isDevnet ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM : ALL_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
    });
    console.log("[RAYDIUM] Pool data fetched");

    const inputMint = SOL_MINT;
    const outputMint = new PublicKey(tokenMint);

    // Get all possible routes
    console.log("[RAYDIUM] Finding all routes...");
    const routes = raydium.tradeV2.getAllRoute({
      inputMint,
      outputMint,
      ...poolData,
    });
    console.log("[RAYDIUM] Found routes:", routes.directPath.length, "direct paths");

    if (routes.directPath.length === 0) {
      throw new Error("No trading routes found for this token pair");
    }

    // Fetch route data
    console.log("[RAYDIUM] Fetching route data...");
    const routeData = await raydium.tradeV2.fetchSwapRoutesData({
      routes,
      inputMint,
      outputMint,
    });
    console.log("[RAYDIUM] Route data fetched");

    // Convert SOL amount to lamports
    const inputAmount = Math.floor(solAmount * 1_000_000_000).toString();

    // Create token info for input (SOL)
    const inputToken = new Token({
      mint: inputMint.toBase58(),
      decimals: 9,
      isToken2022: false,
    });

    // Create token amount
    const inputTokenAmount = new TokenAmount(inputToken, inputAmount);

    // Get epoch info
    const epochInfo = await raydium.connection.getEpochInfo();

    // Calculate quotes for all routes
    console.log("[RAYDIUM] Computing best route...");
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
        decimals: 9, // Default for most Solana tokens
        programId: "TokenkGPmanGNXRCf56LSXt8y6LYouGxvPjSzkMGQJx",
      }),
      chainTime: Math.floor(raydium.chainTimeData?.chainTime ?? Date.now() / 1000),
      slippage: 0.01, // 1% slippage
      epochInfo,
    });

    if (!swapRoutes || swapRoutes.length === 0) {
      throw new Error("No valid swap routes found");
    }

    // Best route is first (sorted by output amount)
    const bestRoute = swapRoutes[0];
    console.log("[RAYDIUM] Best route found:", {
      outputAmount: bestRoute.amountOut.amount.toExact(),
      priceImpact: bestRoute.priceImpact,
      routeType: bestRoute.routeType,
    });

    return {
      outputAmount: bestRoute.amountOut.amount.toExact(),
      priceImpact: (Number(bestRoute.priceImpact) * 100).toFixed(2),
      routeType: bestRoute.routeType,
      poolIds: bestRoute.poolInfoList.map((p) => p.id).join(" → "),
    };
  } catch (error: any) {
    console.error("[RAYDIUM] Best price quote error:", error);
    throw new Error(`Quote failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Get best price quote for Token to SOL swap using all available routes
 */
export async function getBestPriceQuoteTokenForSol(params: {
  tokenMint: string;
  tokenAmount: number;
}): Promise<{
  outputAmount: string;
  priceImpact: string;
  routeType: string;
  poolIds: string;
}> {
  const { tokenMint, tokenAmount } = params;

  try {
    console.log("[RAYDIUM] Getting best price quote for Token -> SOL");

    // Create temporary keypair for quote (not used for signing)
    const tempKeypair = Keypair.generate();
    const raydium = await getRaydiumInstance(tempKeypair);

    // Fetch chain time
    await raydium.fetchChainTime();
    console.log("[RAYDIUM] Chain time fetched");

    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";

    // Fetch pool data from all pool types
    console.log("[RAYDIUM] Fetching pool data from all sources...");
    const poolData = await raydium.tradeV2.fetchRoutePoolBasicInfo({
      amm: isDevnet ? DEVNET_PROGRAM_ID.AMM_V4 : ALL_PROGRAM_ID.AMM_V4,
      clmm: isDevnet ? DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID : ALL_PROGRAM_ID.CLMM_PROGRAM_ID,
      cpmm: isDevnet ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM : ALL_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
    });
    console.log("[RAYDIUM] Pool data fetched");

    const inputMint = new PublicKey(tokenMint);
    const outputMint = SOL_MINT;

    // Get all possible routes
    console.log("[RAYDIUM] Finding all routes...");
    const routes = raydium.tradeV2.getAllRoute({
      inputMint,
      outputMint,
      ...poolData,
    });
    console.log("[RAYDIUM] Found routes:", routes.directPath.length, "direct paths");

    if (routes.directPath.length === 0) {
      throw new Error("No trading routes found for this token pair");
    }

    // Fetch route data
    console.log("[RAYDIUM] Fetching route data...");
    const routeData = await raydium.tradeV2.fetchSwapRoutesData({
      routes,
      inputMint,
      outputMint,
    });
    console.log("[RAYDIUM] Route data fetched");

    // Convert token amount to base units (assuming 9 decimals)
    const inputAmount = Math.floor(tokenAmount * 1_000_000_000).toString();

    // Create token info for input
    const inputToken = new Token({
      mint: inputMint.toBase58(),
      decimals: 9,
      isToken2022: false,
    });

    // Create token amount
    const inputTokenAmount = new TokenAmount(inputToken, inputAmount);

    // Get epoch info
    const epochInfo = await raydium.connection.getEpochInfo();

    // Calculate quotes for all routes
    console.log("[RAYDIUM] Computing best route...");
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
        decimals: 9,
        programId: "TokenkGPmanGNXRCf56LSXt8y6LYouGxvPjSzkMGQJx",
      }),
      chainTime: Math.floor(raydium.chainTimeData?.chainTime ?? Date.now() / 1000),
      slippage: 0.01, // 1% slippage
      epochInfo,
    });

    if (!swapRoutes || swapRoutes.length === 0) {
      throw new Error("No valid swap routes found");
    }

    // Best route is first (sorted by output amount)
    const bestRoute = swapRoutes[0];
    console.log("[RAYDIUM] Best route found:", {
      outputAmount: bestRoute.amountOut.amount.toExact(),
      priceImpact: bestRoute.priceImpact,
      routeType: bestRoute.routeType,
    });

    return {
      outputAmount: bestRoute.amountOut.amount.toExact(),
      priceImpact: (Number(bestRoute.priceImpact) * 100).toFixed(2),
      routeType: bestRoute.routeType,
      poolIds: bestRoute.poolInfoList.map((p) => p.id).join(" → "),
    };
  } catch (error: any) {
    console.error("[RAYDIUM] Best price quote error:", error);
    throw new Error(`Quote failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Preview swap output for SOL to Token
 * Returns expected output amount without executing the swap
 */
export async function previewSolForToken(params: {
  tokenMint: string;
  solAmount: number;
}): Promise<{
  outputAmount: string;
  priceImpact: string;
  routeType?: string;
  poolIds?: string;
}> {
  const { tokenMint, solAmount } = params;

  try {
    // Try to use best price quote first
    const quote = await getBestPriceQuoteSolForToken({ tokenMint, solAmount });
    return quote;
  } catch (error: any) {
    console.error("[RAYDIUM] Best price quote failed, falling back to CPMM:", error.message);

    // Fallback to CPMM pools only
    const connection = getConnection();
    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";

    // Fetch CPMM pools
    const cpmmPools = await fetchCpmmPools(connection, tokenMint, isDevnet);

    if (cpmmPools.length === 0) {
      throw new Error("No liquidity pool found");
    }

    const manualPool = cpmmPools[0];

    // Create a temporary keypair for the preview (not used for signing)
    const tempKeypair = Keypair.generate();
    const raydium = await getRaydiumInstance(tempKeypair);

    // Fetch pool info from RPC
    const { poolInfo, rpcData } = await raydium.cpmm.getPoolInfoFromRpc(manualPool.poolId);

    // Convert SOL to lamports
    const amountInLamports = new BN(solAmount * 1_000_000_000);

    // Determine if SOL is mintA or mintB
    const baseIn = SOL_MINT.toBase58() === poolInfo.mintA.address;

    // Compute swap result
    const swapResult = CurveCalculator.swapBaseInput(
      amountInLamports,
      baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
      baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
      rpcData.configInfo!.tradeFeeRate,
      rpcData.configInfo!.creatorFeeRate,
      rpcData.configInfo!.protocolFeeRate,
      rpcData.configInfo!.fundFeeRate,
      rpcData.feeOn === FeeOn.BothToken || rpcData.feeOn === FeeOn.OnlyTokenB
    );

    // Calculate output amount (assuming 9 decimals for most tokens)
    const outputAmount = (Number(swapResult.outputAmount.toString()) / 1_000_000_000).toFixed(6);

    // Calculate price impact
    const inputReserve = baseIn ? rpcData.baseReserve : rpcData.quoteReserve;
    const priceImpact = (Number(amountInLamports.toString()) / Number(inputReserve.toString()) * 100).toFixed(2);

    return {
      outputAmount,
      priceImpact,
    };
  }
}

/**
 * Preview swap output for Token to SOL
 * Returns expected output amount without executing the swap
 */
export async function previewTokenForSol(params: {
  tokenMint: string;
  tokenAmount: number;
}): Promise<{
  outputAmount: string;
  priceImpact: string;
  routeType?: string;
  poolIds?: string;
}> {
  const { tokenMint, tokenAmount } = params;

  try {
    // Try to use best price quote first
    const quote = await getBestPriceQuoteTokenForSol({ tokenMint, tokenAmount });
    return quote;
  } catch (error: any) {
    console.error("[RAYDIUM] Best price quote failed, falling back to CPMM:", error.message);

    // Fallback to CPMM pools only
    const connection = getConnection();
    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";

    // Fetch CPMM pools
    const cpmmPools = await fetchCpmmPools(connection, tokenMint, isDevnet);

    if (cpmmPools.length === 0) {
      throw new Error("No liquidity pool found");
    }

    const manualPool = cpmmPools[0];

    // Create a temporary keypair for the preview (not used for signing)
    const tempKeypair = Keypair.generate();
    const raydium = await getRaydiumInstance(tempKeypair);

    // Fetch pool info from RPC
    const { poolInfo, rpcData } = await raydium.cpmm.getPoolInfoFromRpc(manualPool.poolId);

    // Determine token decimals (assuming 9 for most Solana tokens)
    const decimals = 9;
    const amountInTokens = new BN(tokenAmount * Math.pow(10, decimals));

    // Determine if token is mintA or mintB
    const baseIn = tokenMint === poolInfo.mintA.address;

    // Compute swap result
    const swapResult = CurveCalculator.swapBaseInput(
      amountInTokens,
      baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
      baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
      rpcData.configInfo!.tradeFeeRate,
      rpcData.configInfo!.creatorFeeRate,
      rpcData.configInfo!.protocolFeeRate,
      rpcData.configInfo!.fundFeeRate,
      rpcData.feeOn === FeeOn.BothToken || rpcData.feeOn === FeeOn.OnlyTokenB
    );

    // Calculate output amount in SOL
    const outputAmount = (Number(swapResult.outputAmount.toString()) / 1_000_000_000).toFixed(6);

    // Calculate price impact
    const inputReserve = baseIn ? rpcData.baseReserve : rpcData.quoteReserve;
    const priceImpact = (Number(amountInTokens.toString()) / Number(inputReserve.toString()) * 100).toFixed(2);

    return {
      outputAmount,
      priceImpact,
    };
  }
}
