/**
 * DCA Analytics and PnL Calculation Utilities
 */

import { previewTokenForToken } from "../../services/raydium";
import { getTokenPairBySymbols } from "../../services/db/tokenPair/operations";

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
 */
export async function calculateStrategyAnalytics(
  strategy: any,
  executions: any[]
): Promise<StrategyAnalytics> {
  // Calculate total tokens received from successful executions
  const successfulExecutions = executions.filter((e) => e.status === "SUCCESS");
  const failedExecutions = executions.filter((e) => e.status === "FAILED");

  const totalTokensReceived = successfulExecutions.reduce(
    (sum, e) => sum + Number(e.tokensReceived),
    0
  );

  const totalInvested = Number(strategy.totalInvested);
  const averageBuyPrice = totalInvested > 0 && totalTokensReceived > 0
    ? totalInvested / totalTokensReceived
    : 0;

  // Get current price
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

      // Get current price by checking how much we'd get for selling 1 target token
      const quote = await previewTokenForToken({
        inputTokenMint: tokenPair.targetMint,
        outputTokenMint: tokenPair.baseMint,
        inputTokenAmount: 1, // Get price for 1 token
      });

      currentPrice = parseFloat(quote.outputAmount);
      currentValue = totalTokensReceived * currentPrice;
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
      totalInvested += Number(strategy.totalInvested);
      totalCurrentValue += Number(strategy.totalInvested);
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
 * Format PnL with sign and color indicator
 */
export function formatPnL(pnl: number, percentage: number): string {
  const sign = pnl >= 0 ? "+" : "";
  const emoji = pnl >= 0 ? "🟢" : "🔴";
  return `${emoji} ${sign}${formatNumber(pnl, 4)} (${sign}${formatNumber(percentage, 2)}%)`;
}
