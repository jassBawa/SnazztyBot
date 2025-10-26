"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/raydium.ts
var raydium_exports = {};
__export(raydium_exports, {
  getRaydiumInstance: () => getRaydiumInstance,
  previewSolForToken: () => previewSolForToken,
  previewTokenForSol: () => previewTokenForSol,
  previewTokenForToken: () => previewTokenForToken,
  swapSolForToken: () => swapSolForToken,
  swapTokenForSol: () => swapTokenForSol,
  swapTokenForToken: () => swapTokenForToken
});
module.exports = __toCommonJS(raydium_exports);
var import_web32 = require("@solana/web3.js");
var import_raydium_sdk_v2 = require("@raydium-io/raydium-sdk-v2");

// src/solana.ts
var import_web3 = require("@solana/web3.js");
var import_spl_token = require("@solana/spl-token");
var import_user = require("@repo/database/user");
function getConnection() {
  const rpc = process.env.SOLANA_RPC_URL || (0, import_web3.clusterApiUrl)(process.env.SOLANA_CLUSTER || "devnet");
  return new import_web3.Connection(rpc, "confirmed");
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

// src/raydium.ts
var SOL_MINT = new import_web32.PublicKey("So11111111111111111111111111111111111111112");
var DEFAULT_SLIPPAGE = 0.01;
var DEFAULT_TOKEN_DECIMALS = 9;
var LAMPORTS_PER_SOL = 1e9;
async function getRaydiumInstance(owner) {
  const connection = getConnection();
  const cluster = process.env.SOLANA_CLUSTER || "devnet";
  const raydium = await import_raydium_sdk_v2.Raydium.load({
    owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: false
  });
  return raydium;
}
function getPoolProgramIds(isDevnet) {
  return {
    amm: isDevnet ? import_raydium_sdk_v2.DEVNET_PROGRAM_ID.AMM_V4 : import_raydium_sdk_v2.ALL_PROGRAM_ID.AMM_V4,
    clmm: isDevnet ? import_raydium_sdk_v2.DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID : import_raydium_sdk_v2.ALL_PROGRAM_ID.CLMM_PROGRAM_ID,
    cpmm: isDevnet ? import_raydium_sdk_v2.DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM : import_raydium_sdk_v2.ALL_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
    router: isDevnet ? import_raydium_sdk_v2.DEVNET_PROGRAM_ID.Router : import_raydium_sdk_v2.ALL_PROGRAM_ID.Router
  };
}
function createExplorerLink(txId) {
  const cluster = process.env.SOLANA_CLUSTER || "devnet";
  return `https://explorer.solana.com/tx/${txId}${cluster !== "mainnet-beta" ? `?cluster=${cluster}` : ""}`;
}
async function getBestRoute(params) {
  const {
    raydium,
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals,
    outputDecimals,
    slippage,
    isDevnet
  } = params;
  await raydium.fetchChainTime();
  const programIds = getPoolProgramIds(isDevnet);
  const poolData = await raydium.tradeV2.fetchRoutePoolBasicInfo({
    amm: programIds.amm,
    clmm: programIds.clmm,
    cpmm: programIds.cpmm
  });
  const routes = raydium.tradeV2.getAllRoute({
    inputMint,
    outputMint,
    ...poolData
  });
  if (routes.directPath.length === 0) {
    throw new Error(
      "No trading routes found for this token pair. Make sure the token has liquidity pools on this network."
    );
  }
  const routeData = await raydium.tradeV2.fetchSwapRoutesData({
    routes,
    inputMint,
    outputMint
  });
  const isInputToken2022 = await isToken2022(inputMint.toBase58());
  const isOutputToken2022 = await isToken2022(outputMint.toBase58());
  const outputProgramId = await getTokenProgramId(outputMint.toBase58());
  console.log("[RAYDIUM] Token program check:", {
    input: { address: inputMint.toBase58(), isToken2022: isInputToken2022 },
    output: {
      address: outputMint.toBase58(),
      isToken2022: isOutputToken2022,
      programId: outputProgramId
    }
  });
  const inputToken = new import_raydium_sdk_v2.Token({
    mint: inputMint.toBase58(),
    decimals: inputDecimals,
    isToken2022: isInputToken2022
  });
  const inputTokenAmount = new import_raydium_sdk_v2.TokenAmount(inputToken, inputAmount);
  const epochInfo = await raydium.connection.getEpochInfo();
  const swapRoutes = raydium.tradeV2.getAllRouteComputeAmountOut({
    inputTokenAmount,
    directPath: routes.directPath.map(
      (p) => routeData.ammSimulateCache[p.id.toBase58()] || routeData.computeClmmPoolInfo[p.id.toBase58()] || routeData.computeCpmmData[p.id.toBase58()]
    ),
    routePathDict: routeData.routePathDict,
    simulateCache: routeData.ammSimulateCache,
    tickCache: routeData.computePoolTickData,
    mintInfos: routeData.mintInfos,
    outputToken: (0, import_raydium_sdk_v2.toApiV3Token)({
      address: outputMint.toBase58(),
      decimals: outputDecimals,
      programId: outputProgramId
    }),
    chainTime: Math.floor(
      raydium.chainTimeData?.chainTime ?? Date.now() / 1e3
    ),
    slippage,
    epochInfo
  });
  if (!swapRoutes || swapRoutes.length === 0) {
    throw new Error("No valid swap routes found");
  }
  console.log("[RAYDIUM] Total routes found:", swapRoutes.length);
  console.log(
    "[RAYDIUM] Route types:",
    swapRoutes.map((r) => r.routeType)
  );
  const directSwaps = swapRoutes.filter((route) => route.routeType !== "route");
  console.log("[RAYDIUM] Direct swaps (non-multi-hop):", directSwaps.length);
  if (directSwaps.length === 0) {
    throw new Error(
      "No direct swap routes available. Only multi-hop routes exist for this token pair. Please try a different token or check liquidity."
    );
  }
  const bestRoute = directSwaps[0];
  console.log("[RAYDIUM] Selected best route:");
  console.log("[RAYDIUM]   Type:", bestRoute.routeType);
  console.log(
    "[RAYDIUM]   Output amount:",
    bestRoute.amountOut.amount.toString()
  );
  return bestRoute;
}
async function executeSwap(params) {
  const {
    raydium,
    bestRoute,
    isDevnet,
    hasToken2022 = false,
    hasToken2022Extensions = false
  } = params;
  try {
    const programIds = getPoolProgramIds(isDevnet);
    console.log("[RAYDIUM] Preparing swap transaction...");
    const ownerInfo = hasToken2022 ? {
      associatedOnly: false,
      // MUST be false for Token2022
      checkCreateATAOwner: false
      // Don't try to create - we already did
    } : {
      associatedOnly: true,
      checkCreateATAOwner: true
    };
    const needsHigherCompute = hasToken2022Extensions;
    const computeBudgetConfig = needsHigherCompute ? {
      units: 8e5,
      // Token2022 with extensions needs more compute
      microLamports: 2e5
      // Higher priority fee
    } : {
      units: 6e5,
      // Direct swaps without extensions
      microLamports: 1e5
      // Standard priority fee
    };
    console.log("[RAYDIUM] Swap configuration:", {
      routeType: bestRoute.routeType,
      hasToken2022,
      hasToken2022Extensions,
      ownerInfo,
      computeBudget: computeBudgetConfig
    });
    const { execute } = await raydium.tradeV2.swap({
      swapInfo: bestRoute,
      txVersion: import_raydium_sdk_v2.TxVersion.V0,
      routeProgram: programIds.router,
      ownerInfo,
      computeBudgetConfig
    });
    console.log("[RAYDIUM] Executing transaction...");
    const { txIds } = await execute({
      sendAndConfirm: true,
      sequentially: true
    });
    console.log("[RAYDIUM] Transaction IDs:", txIds);
    return txIds[0];
  } catch (error) {
    console.error("[RAYDIUM] Execute swap error details:", error);
    console.error("[RAYDIUM] Error type:", typeof error);
    console.error("[RAYDIUM] Error message:", error?.message);
    console.error("[RAYDIUM] Error stack:", error?.stack);
    console.error("[RAYDIUM] Full error:", JSON.stringify(error, null, 2));
    throw error;
  }
}
async function swapSolForToken(params) {
  const {
    userKeypair,
    tokenMint,
    solAmount,
    slippage = DEFAULT_SLIPPAGE
  } = params;
  try {
    const raydium = await getRaydiumInstance(userKeypair);
    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";
    const inputMint = SOL_MINT;
    const outputMint = new import_web32.PublicKey(tokenMint);
    const inputAmount = Math.floor(solAmount * LAMPORTS_PER_SOL).toString();
    const outputDecimals = await getTokenDecimals(tokenMint);
    console.log("[RAYDIUM] Token decimals:", outputDecimals);
    const bestRoute = await getBestRoute({
      raydium,
      inputMint,
      outputMint,
      inputAmount,
      inputDecimals: DEFAULT_TOKEN_DECIMALS,
      // SOL is always 9 decimals
      outputDecimals,
      slippage,
      isDevnet
    });
    console.log("[RAYDIUM] Best route selected:", {
      type: bestRoute.routeType,
      output: bestRoute.amountOut.amount.toExact(),
      impact: bestRoute.priceImpact
    });
    const isOutputToken2022 = await isToken2022(tokenMint);
    console.log("OUTPUT TOKEN IS OF TYPE: ", isOutputToken2022);
    let hasToken2022 = isOutputToken2022;
    let hasToken2022Extensions = false;
    if (isOutputToken2022) {
      console.log("[RAYDIUM] Output is Token2022, checking extensions...");
      const extensions = await getToken2022Extensions(tokenMint);
      hasToken2022Extensions = extensions.length > 0;
      if (hasToken2022Extensions) {
        console.log("[RAYDIUM] \u26A0\uFE0F Token has extensions:", extensions);
        console.log(
          "[RAYDIUM] This may require additional handling or may not be fully supported"
        );
      }
      console.log("[RAYDIUM] Pre-creating output Token2022 account...");
      await ensureTokenAccount({
        owner: userKeypair,
        tokenMint
      });
    }
    const txId = await executeSwap({
      raydium,
      bestRoute,
      isDevnet,
      hasToken2022,
      hasToken2022Extensions
    });
    console.log("[RAYDIUM] Swap successful:", txId);
    return {
      signature: txId,
      explorerLink: createExplorerLink(txId),
      inputAmount: solAmount.toString(),
      outputAmount: bestRoute.amountOut.amount.toExact()
    };
  } catch (error) {
    console.error("[RAYDIUM] Swap failed:", error.message);
    throw new Error(`Swap failed: ${error.message || "Unknown error"}`);
  }
}
async function swapTokenForSol(params) {
  const {
    userKeypair,
    tokenMint,
    tokenAmount,
    slippage = DEFAULT_SLIPPAGE
  } = params;
  try {
    const raydium = await getRaydiumInstance(userKeypair);
    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";
    const inputMint = new import_web32.PublicKey(tokenMint);
    const outputMint = SOL_MINT;
    const inputDecimals = await getTokenDecimals(tokenMint);
    console.log("[RAYDIUM] Token decimals:", inputDecimals);
    const inputAmount = Math.floor(
      tokenAmount * Math.pow(10, inputDecimals)
    ).toString();
    const bestRoute = await getBestRoute({
      raydium,
      inputMint,
      outputMint,
      inputAmount,
      inputDecimals,
      outputDecimals: DEFAULT_TOKEN_DECIMALS,
      // SOL is always 9 decimals
      slippage,
      isDevnet
    });
    console.log("[RAYDIUM] Best route selected:", {
      type: bestRoute.routeType,
      output: bestRoute.amountOut.amount.toExact(),
      impact: bestRoute.priceImpact
    });
    const isInputToken2022 = await isToken2022(tokenMint);
    let hasToken2022 = isInputToken2022;
    let hasToken2022Extensions = false;
    if (isInputToken2022) {
      console.log("[RAYDIUM] Input is Token2022, checking extensions...");
      const extensions = await getToken2022Extensions(tokenMint);
      hasToken2022Extensions = extensions.length > 0;
      if (hasToken2022Extensions) {
        console.log("[RAYDIUM] \u26A0\uFE0F Token has extensions:", extensions);
      }
      console.log("[RAYDIUM] Ensuring input Token2022 account exists...");
      await ensureTokenAccount({
        owner: userKeypair,
        tokenMint
      });
    }
    const txId = await executeSwap({
      raydium,
      bestRoute,
      isDevnet,
      hasToken2022,
      hasToken2022Extensions
    });
    console.log("[RAYDIUM] Swap successful:", txId);
    return {
      signature: txId,
      explorerLink: createExplorerLink(txId),
      inputAmount: tokenAmount.toString(),
      outputAmount: bestRoute.amountOut.amount.toExact()
    };
  } catch (error) {
    console.error("[RAYDIUM] Swap failed:", error.message);
    throw new Error(`Swap failed: ${error.message || "Unknown error"}`);
  }
}
async function getBestPriceQuote(params) {
  const { inputMint, outputMint, inputAmount, inputDecimals, outputDecimals } = params;
  const tempKeypair = import_web32.Keypair.generate();
  const raydium = await getRaydiumInstance(tempKeypair);
  const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";
  const bestRoute = await getBestRoute({
    raydium,
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals,
    outputDecimals,
    slippage: DEFAULT_SLIPPAGE,
    isDevnet
  });
  return {
    outputAmount: bestRoute.amountOut.amount.toExact(),
    priceImpact: (Number(bestRoute.priceImpact) * 100).toFixed(2),
    routeType: bestRoute.routeType,
    poolIds: bestRoute.poolInfoList.map((p) => p.id).join(" \u2192 ")
  };
}
async function previewSolForToken(params) {
  const { tokenMint, solAmount } = params;
  const inputMint = SOL_MINT;
  const outputMint = new import_web32.PublicKey(tokenMint);
  const inputAmount = Math.floor(solAmount * LAMPORTS_PER_SOL).toString();
  const outputDecimals = await getTokenDecimals(tokenMint);
  return getBestPriceQuote({
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals: DEFAULT_TOKEN_DECIMALS,
    // SOL is always 9 decimals
    outputDecimals
  });
}
async function previewTokenForSol(params) {
  const { tokenMint, tokenAmount } = params;
  const inputMint = new import_web32.PublicKey(tokenMint);
  const outputMint = SOL_MINT;
  const inputDecimals = await getTokenDecimals(tokenMint);
  const inputAmount = Math.floor(
    tokenAmount * Math.pow(10, inputDecimals)
  ).toString();
  return getBestPriceQuote({
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals,
    outputDecimals: DEFAULT_TOKEN_DECIMALS
    // SOL is always 9 decimals
  });
}
async function swapTokenForToken(params) {
  const {
    userKeypair,
    inputTokenMint,
    outputTokenMint,
    inputTokenAmount,
    slippage = DEFAULT_SLIPPAGE
  } = params;
  try {
    console.log("[RAYDIUM] Starting token-to-token swap:", {
      input: inputTokenMint,
      output: outputTokenMint,
      amount: inputTokenAmount,
      slippage
    });
    const raydium = await getRaydiumInstance(userKeypair);
    const isDevnet = (process.env.SOLANA_CLUSTER || "devnet") === "devnet";
    const inputMint = new import_web32.PublicKey(inputTokenMint);
    const outputMint = new import_web32.PublicKey(outputTokenMint);
    const inputDecimals = await getTokenDecimals(inputTokenMint);
    const outputDecimals = await getTokenDecimals(outputTokenMint);
    console.log("[RAYDIUM] Input token decimals:", inputDecimals);
    console.log("[RAYDIUM] Output token decimals:", outputDecimals);
    const inputAmount = Math.floor(
      inputTokenAmount * Math.pow(10, inputDecimals)
    ).toString();
    console.log("[RAYDIUM] Input amount (raw):", inputAmount);
    const bestRoute = await getBestRoute({
      raydium,
      inputMint,
      outputMint,
      inputAmount,
      inputDecimals,
      outputDecimals,
      slippage,
      isDevnet
    });
    console.log("[RAYDIUM] Best route selected:", {
      type: bestRoute.routeType,
      output: bestRoute.amountOut.amount.toExact(),
      impact: bestRoute.priceImpact
    });
    const isInputToken2022 = await isToken2022(inputTokenMint);
    const isOutputToken2022 = await isToken2022(outputTokenMint);
    let hasToken2022 = isInputToken2022 || isOutputToken2022;
    let hasToken2022Extensions = false;
    if (isInputToken2022) {
      console.log("[RAYDIUM] Input is Token2022, checking extensions...");
      const inputExtensions = await getToken2022Extensions(inputTokenMint);
      if (inputExtensions.length > 0) {
        hasToken2022Extensions = true;
        console.log(
          "[RAYDIUM] \u26A0\uFE0F Input token has extensions:",
          inputExtensions
        );
      }
      console.log("[RAYDIUM] Ensuring input Token2022 account exists...");
      await ensureTokenAccount({
        owner: userKeypair,
        tokenMint: inputTokenMint
      });
    }
    if (isOutputToken2022) {
      console.log("[RAYDIUM] Output is Token2022, checking extensions...");
      const outputExtensions = await getToken2022Extensions(outputTokenMint);
      if (outputExtensions.length > 0) {
        hasToken2022Extensions = true;
        console.log(
          "[RAYDIUM] \u26A0\uFE0F Output token has extensions:",
          outputExtensions
        );
      }
      console.log("[RAYDIUM] Ensuring output Token2022 account exists...");
      await ensureTokenAccount({
        owner: userKeypair,
        tokenMint: outputTokenMint
      });
    }
    const txId = await executeSwap({
      raydium,
      bestRoute,
      isDevnet,
      hasToken2022,
      hasToken2022Extensions
    });
    console.log("[RAYDIUM] Swap successful:", txId);
    return {
      signature: txId,
      explorerLink: createExplorerLink(txId),
      inputAmount: inputTokenAmount.toString(),
      outputAmount: bestRoute.amountOut.amount.toExact()
    };
  } catch (error) {
    console.error("[RAYDIUM] Token-to-token swap failed - Full error:", error);
    console.error("[RAYDIUM] Error message:", error?.message);
    console.error("[RAYDIUM] Error logs:", error?.logs);
    console.error("[RAYDIUM] Error code:", error?.code);
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
async function previewTokenForToken(params) {
  const { inputTokenMint, outputTokenMint, inputTokenAmount } = params;
  const inputMint = new import_web32.PublicKey(inputTokenMint);
  const outputMint = new import_web32.PublicKey(outputTokenMint);
  const inputDecimals = await getTokenDecimals(inputTokenMint);
  const outputDecimals = await getTokenDecimals(outputTokenMint);
  const inputAmount = Math.floor(
    inputTokenAmount * Math.pow(10, inputDecimals)
  ).toString();
  console.log(`[RAYDIUM] previewTokenForToken:`);
  console.log(`[RAYDIUM]   Input: ${inputTokenAmount} tokens (human-readable)`);
  console.log(`[RAYDIUM]   Input decimals: ${inputDecimals}`);
  console.log(`[RAYDIUM]   Input amount (raw units): ${inputAmount}`);
  console.log(`[RAYDIUM]   Output decimals: ${outputDecimals}`);
  const result = await getBestPriceQuote({
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals,
    outputDecimals
  });
  console.log(`[RAYDIUM]   Output: ${result.outputAmount} (human-readable)`);
  console.log(`[RAYDIUM]   Route type: ${result.routeType}`);
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getRaydiumInstance,
  previewSolForToken,
  previewTokenForSol,
  previewTokenForToken,
  swapSolForToken,
  swapTokenForSol,
  swapTokenForToken
});
