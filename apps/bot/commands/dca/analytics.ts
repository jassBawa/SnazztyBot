/**
 * DCA Analytics and PnL Calculation Utilities
 */

import { previewTokenForToken } from "@repo/services/raydium";
import { getTokenPairBySymbols } from "@repo/database/tokenPair";
import { fromSmallestUnit } from "./utils.js";

export interface StrategyAnalytics {
  totalInvested: number;
  totalTokensReceived: number;
  averageBuyPrice: number;
  currentValue: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
}

export interface PortfolioAnalytics {
  totalInvested: number;
  totalCurrentValue: number;
  overallPnl: number;
  overallPnlPercentage: number;
  totalStrategies: number;
  activeStrategies: number;
  pausedStrategies: number;
  totalExecutions: number;
  successfulExecutions: number;
  successRate: number;
}

/**
 * Calculate analytics for a single DCA strategy
 *
 * All values are calculated in terms of the base token (e.g., SOL).
 * The current value is determined by fetching the real-time market price
 * from Raydium and converting the token holdings to base token value.
 */
export async function calculateStrategyAnalytics(
  strategy: any,
  executions: any[]
): Promise<StrategyAnalytics> {
  // Calculate total tokens received from successful executions
  const successfulExecutions = executions.filter((e) => e.status === "SUCCESS");
  const failedExecutions = executions.filter((e) => e.status === "FAILED");

  console.log(`[Analytics] Strategy ${strategy.id} - Raw execution data:`);
  successfulExecutions.forEach((e, idx) => {
    const investedAmount = fromSmallestUnit(e.amountInvested, strategy.baseTokenDecimals);
    const receivedAmount = fromSmallestUnit(e.tokensReceived, strategy.targetTokenDecimals);
    const price = investedAmount / receivedAmount;
    console.log(`[Analytics]   Execution ${idx + 1}:`);
    console.log(`[Analytics]     - Invested: ${investedAmount}`);
    console.log(`[Analytics]     - Received: ${receivedAmount} tokens`);
    console.log(`[Analytics]     - Price paid: ${price.toFixed(8)} ${strategy.baseToken}/token`);
  });

  const totalTokensReceived = successfulExecutions.reduce(
    (sum, e) => sum + fromSmallestUnit(e.tokensReceived, strategy.targetTokenDecimals),
    0
  );

  const totalInvested = fromSmallestUnit(strategy.totalInvested, strategy.baseTokenDecimals);
  const averageBuyPrice = totalInvested > 0 && totalTokensReceived > 0
    ? totalInvested / totalTokensReceived
    : 0;

  console.log(`[Analytics] Strategy ${strategy.id} (${strategy.baseToken} → ${strategy.targetToken}):`);
  console.log(`[Analytics]   - Total invested: ${totalInvested} ${strategy.baseToken}`);
  console.log(`[Analytics]   - Total tokens received (summed): ${totalTokensReceived} ${strategy.targetToken}`);
  console.log(`[Analytics]   - Average buy price: ${averageBuyPrice} ${strategy.baseToken}/${strategy.targetToken}`);

  // Get current price in base token terms (e.g., SOL per target token)
  let currentPrice = 0;
  let currentValue = 0;

  try {
    if (totalTokensReceived > 0) {
      // Look up the token pair to get mint addresses
      const tokenPair = await getTokenPairBySymbols(
        strategy.baseToken,
        strategy.targetToken
      );

      if (!tokenPair) {
        throw new Error("Token pair not found");
      }

      console.log(`[Analytics] Token pair lookup:`);
      console.log(`[Analytics]   - Base: ${tokenPair.baseToken} (${tokenPair.baseMint})`);
      console.log(`[Analytics]   - Target: ${tokenPair.targetToken} (${tokenPair.targetMint})`);
      console.log(`[Analytics] Querying: Sell ${totalTokensReceived} ${tokenPair.targetToken} for ${tokenPair.baseToken}`);

      // Get current market price from Raydium by simulating selling totalTokensReceived for base token
      // This gives us the TOTAL current value directly
      const quote = await previewTokenForToken({
        inputTokenMint: tokenPair.targetMint,
        outputTokenMint: tokenPair.baseMint,
        inputTokenAmount: totalTokensReceived, // Use actual holdings amount
      });

      console.log(`[Analytics] Strategy ${strategy.id} (${strategy.targetToken}):`);
      console.log(`[Analytics]   - Total tokens: ${totalTokensReceived}`);
      console.log(`[Analytics]   - Quote output: ${quote.outputAmount} ${strategy.baseToken}`);

      // currentValue is the direct quote output (what we'd get if we sold all tokens now)
      currentValue = parseFloat(quote.outputAmount);

      // currentPrice per token = total value / total tokens
      currentPrice = currentValue / totalTokensReceived;

      console.log(`[Analytics]   - Current value: ${currentValue} ${strategy.baseToken}`);
      console.log(`[Analytics]   - Current price per token: ${currentPrice} ${strategy.baseToken}`);
      console.log(`[Analytics]   - Average buy price: ${averageBuyPrice} ${strategy.baseToken}`);
    }
  } catch (error) {
    console.error("[Analytics] Error fetching current price:", error);
    // If we can't get current price, use average buy price as fallback
    currentPrice = averageBuyPrice;
    currentValue = totalInvested;
  }

  const pnl = currentValue - totalInvested;
  const pnlPercentage = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
  const successRate = executions.length > 0
    ? (successfulExecutions.length / executions.length) * 100
    : 0;

  return {
    totalInvested,
    totalTokensReceived,
    averageBuyPrice,
    currentValue,
    currentPrice,
    pnl,
    pnlPercentage,
    successfulExecutions: successfulExecutions.length,
    failedExecutions: failedExecutions.length,
    successRate,
  };
}

/**
 * Calculate portfolio-wide analytics for all user strategies
 */
export async function calculatePortfolioAnalytics(
  strategies: any[],
  allExecutions: any[]
): Promise<PortfolioAnalytics> {
  let totalInvested = 0;
  let totalCurrentValue = 0;
  let totalExecutions = allExecutions.length;
  let successfulExecutions = 0;

  // Calculate analytics for each strategy
  for (const strategy of strategies) {
    const strategyExecutions = allExecutions.filter(
      (e) => e.strategyId === strategy.id
    );

    try {
      const analytics = await calculateStrategyAnalytics(
        strategy,
        strategyExecutions
      );
      totalInvested += analytics.totalInvested;
      totalCurrentValue += analytics.currentValue;
      successfulExecutions += analytics.successfulExecutions;
    } catch (error) {
      console.error(`[Analytics] Error calculating analytics for strategy ${strategy.id}:`, error);
      // Fallback to just adding total invested
      totalInvested += fromSmallestUnit(strategy.totalInvested, strategy.baseTokenDecimals);
      totalCurrentValue += fromSmallestUnit(strategy.totalInvested, strategy.baseTokenDecimals);
    }
  }

  const overallPnl = totalCurrentValue - totalInvested;
  const overallPnlPercentage = totalInvested > 0
    ? (overallPnl / totalInvested) * 100
    : 0;
  const successRate = totalExecutions > 0
    ? (successfulExecutions / totalExecutions) * 100
    : 0;

  const activeStrategies = strategies.filter((s) => s.status === "ACTIVE").length;
  const pausedStrategies = strategies.filter((s) => s.status === "PAUSED").length;

  return {
    totalInvested,
    totalCurrentValue,
    overallPnl,
    overallPnlPercentage,
    totalStrategies: strategies.length,
    activeStrategies,
    pausedStrategies,
    totalExecutions,
    successfulExecutions,
    successRate,
  };
}

/**
 * Format number with proper decimal places
 */
export function formatNumber(num: number, decimals: number = 4): string {
  return num.toFixed(decimals);
}

/**
 * Format large token amounts with abbreviations (M, K)
 */
export function formatTokenAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return formatNumber(amount, 2);
}

/**
 * Format PnL with sign and color indicator
 */
export function formatPnL(pnl: number, percentage: number): string {
  const sign = pnl >= 0 ? "+" : "";
  const emoji = pnl >= 0 ? "🟢" : "🔴";
  return `${emoji} ${sign}${formatNumber(pnl, 4)} (${sign}${formatNumber(percentage, 2)}%)`;
}
