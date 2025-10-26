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

// src/portfolio.ts
var portfolio_exports = {};
__export(portfolio_exports, {
  calculatePortfolioValue: () => calculatePortfolioValue
});
module.exports = __toCommonJS(portfolio_exports);

// src/solana.ts
var import_web3 = require("@solana/web3.js");
var import_spl_token = require("@solana/spl-token");
var import_user = require("@repo/database/user");
function getConnection() {
  const rpc = process.env.SOLANA_RPC_URL || (0, import_web3.clusterApiUrl)(process.env.SOLANA_CLUSTER || "devnet");
  return new import_web3.Connection(rpc, "confirmed");
}
function formatSol(lamports) {
  return (lamports / 1e9).toFixed(6);
}
async function getBalances(pubkey) {
  const connection = getConnection();
  const nativeLamports = await connection.getBalance(pubkey);
  const nativeSol = formatSol(nativeLamports);
  return { nativeSol };
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
async function getTokenProgramId(tokenMint) {
  const is2022 = await isToken2022(tokenMint);
  return is2022 ? "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" : "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
}
var TOKEN_SYMBOLS = {
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
  "So11111111111111111111111111111111111111112": "SOL"
};
async function getTokenBalances(walletAddress) {
  const connection = getConnection();
  const pubKey = new import_web3.PublicKey(walletAddress);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
    programId: new import_web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
  });
  const balances = tokenAccounts.value.map((accountInfo) => {
    const data = accountInfo.account.data.parsed.info;
    const mint = data.mint;
    const amount = Number(data.tokenAmount.amount) / Math.pow(10, data.tokenAmount.decimals);
    const symbol = TOKEN_SYMBOLS[mint] || mint.substring(0, 4).toUpperCase();
    return {
      mint,
      amount,
      decimals: data.tokenAmount.decimals,
      symbol
    };
  });
  return balances;
}

// src/raydium.ts
var import_web32 = require("@solana/web3.js");
var import_raydium_sdk_v2 = require("@raydium-io/raydium-sdk-v2");
var SOL_MINT = new import_web32.PublicKey("So11111111111111111111111111111111111111112");
var DEFAULT_SLIPPAGE = 0.01;
var DEFAULT_TOKEN_DECIMALS = 9;
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

// src/price.ts
async function getSolPriceUSD() {
  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
    if (!response.ok) {
      console.error("[Price] Binance API error:", response.status);
      return null;
    }
    const data = await response.json();
    const price = parseFloat(data.price);
    if (isNaN(price)) {
      console.error("[Price] Invalid price from Binance:", data.price);
      return null;
    }
    return price;
  } catch (error) {
    console.error("[Price] Error fetching SOL price:", error);
    return null;
  }
}

// src/portfolio.ts
async function calculatePortfolioValue(publicKey) {
  const balances = await getBalances(publicKey);
  const solBalance = Number(balances.nativeSol);
  const solPriceUsd = await getSolPriceUSD();
  const tokenBalances = await getTokenBalances(publicKey.toBase58());
  const tokens = [];
  let totalTokenValueSol = 0;
  for (const token of tokenBalances) {
    try {
      const tokenAmount = token.amount;
      if (tokenAmount === 0) {
        continue;
      }
      const quote = await previewTokenForSol({
        tokenMint: token.mint,
        tokenAmount
      });
      const valueInSol = parseFloat(quote.outputAmount);
      const valueInUsd = solPriceUsd ? valueInSol * solPriceUsd : 0;
      tokens.push({
        symbol: token.symbol || "Unknown",
        mint: token.mint,
        balance: tokenAmount,
        decimals: token.decimals,
        valueInSol,
        valueInUsd
      });
      totalTokenValueSol += valueInSol;
    } catch (error) {
      console.error(
        `[Portfolio] Failed to get price for token ${token.symbol || token.mint}:`,
        error?.message
      );
      tokens.push({
        symbol: token.symbol || "Unknown",
        mint: token.mint,
        balance: token.amount,
        decimals: token.decimals,
        valueInSol: 0,
        valueInUsd: 0
      });
    }
  }
  const totalTokenValueUsd = solPriceUsd ? totalTokenValueSol * solPriceUsd : 0;
  const totalPortfolioSol = solBalance + totalTokenValueSol;
  const totalPortfolioUsd = solPriceUsd ? totalPortfolioSol * solPriceUsd : 0;
  return {
    solBalance,
    solValueUsd: solPriceUsd ? solBalance * solPriceUsd : 0,
    tokens,
    totalTokenValueSol,
    totalTokenValueUsd,
    totalPortfolioSol,
    totalPortfolioUsd,
    solPriceUsd
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculatePortfolioValue
});
