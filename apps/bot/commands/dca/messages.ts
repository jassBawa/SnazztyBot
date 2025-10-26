/**
 * DCA Message Builders
 * All message formatting and keyboard building logic
 */

import { Markup } from "telegraf";
import { DcaSession, DcaFrequency } from "./types";
import { calculateNextExecutionTime, getFrequencyDisplay, getStatusEmoji, formatSmallestUnit } from "./utils";
import { StrategyAnalytics, formatNumber, formatPnL, formatTokenAmount, calculateStrategyAnalytics } from "./analytics";
import { getSolPriceUSD, formatUSD } from "@repo/services/price";

/**
 * Build token pair selection message and keyboard
 * @param tokenPairs - Available token pairs
 * @param sessionKey - User session key
 * @returns Message and keyboard object
 */
export function buildTokenPairSelection(tokenPairs: any[], sessionKey: string) {
  const pairButtons = tokenPairs.map(pair =>
    Markup.button.callback(
      `${pair.baseToken} → ${pair.targetToken}`,
      `DCA_SELECT_PAIR_${pair.id}`
    )
  );

  // Group buttons into rows of 2
  const buttonRows = [];
  for (let i = 0; i < pairButtons.length; i += 2) {
    buttonRows.push(pairButtons.slice(i, i + 2));
  }

  const keyboard = Markup.inlineKeyboard([
    ...buttonRows,
    [Markup.button.callback("❌ Cancel", `DCA_CANCEL_${sessionKey}`)]
  ]);

  const message =
    `📊 *Setup DCA Strategy*\n\n` +
    `DCA (Dollar Cost Averaging) lets you automatically invest a fixed amount at regular intervals.\n\n` +
    `*Step 1:* Select a token pair:\n\n` +
    `Choose which tokens you want to swap:`;

  return { message, keyboard };
}

/**
 * Build amount prompt message
 * @param baseToken - Base token symbol
 * @param targetToken - Target token symbol
 * @returns Formatted message
 */
export function buildAmountPrompt(baseToken: string, targetToken: string): string {
  return (
    `✅ Selected: *${baseToken} → ${targetToken}*\n\n` +
    `*Step 2:* Enter the amount of ${baseToken} to invest per interval.\n\n` +
    `Example: \`0.1\` or \`1.5\`\n\n` +
    `This is how much ${baseToken} will be swapped for ${targetToken} at each interval.\n\n` 
  );
}

/**
 * Build frequency selection keyboard
 * @param sessionKey - User session key
 * @returns Inline keyboard markup
 */
export function buildFrequencyKeyboard(sessionKey: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("⚡ Test (1 min)", `DCA_FREQ_TEST_${sessionKey}`),
      Markup.button.callback("⏰ Hourly", `DCA_FREQ_HOURLY_${sessionKey}`)
    ],
    [
      Markup.button.callback("📅 Daily", `DCA_FREQ_DAILY_${sessionKey}`),
      Markup.button.callback("📆 Weekly", `DCA_FREQ_WEEKLY_${sessionKey}`)
    ],
    [
      Markup.button.callback("🗓 Monthly", `DCA_FREQ_MONTHLY_${sessionKey}`)
    ],
    [
      Markup.button.callback("❌ Cancel", `DCA_CANCEL_${sessionKey}`)
    ]
  ]);
}

/**
 * Build frequency selection message
 * @param amount - Amount per interval
 * @param baseToken - Base token symbol
 * @returns Formatted message
 */
export function buildFrequencyPrompt(amount: number, baseToken: string): string {
  return (
    `✅ Amount set: *${amount} ${baseToken}*\n\n` +
    `*Step 3:* Select how often you want to execute this DCA:\n\n` +
    `⚡ *Test* - Every 1 minute (for testing)\n` +
    `⏰ *Hourly* - Every hour\n` +
    `📅 *Daily* - Every day\n` +
    `📆 *Weekly* - Every week\n` +
    `🗓 *Monthly* - Every month`
  );
}

/**
 * Build confirmation message
 * @param session - DCA session data
 * @param frequency - Selected frequency
 * @returns Formatted confirmation message
 */
export function buildConfirmationMessage(session: DcaSession, frequency: DcaFrequency): string {
  const nextExecution = calculateNextExecutionTime(frequency);

  return (
    `📊 *Confirm DCA Strategy*\n\n` +
    `*Token Pair:* ${session.baseToken} → ${session.targetToken}\n` +
    `*Amount per interval:* ${session.amountPerInterval} ${session.baseToken}\n` +
    `*Frequency:* ${getFrequencyDisplay(frequency)}\n` +
    `*First execution:* ${nextExecution.toLocaleString()}\n\n` +
    `⚠️ *Important:*\n` +
    `• Ensure you have sufficient ${session.baseToken} balance\n` +
    `• The strategy will run automatically\n` +
    `• You can pause or cancel anytime using /dca\\_list\n\n` +
    `Click the button below to activate your DCA strategy.`
  );
}

/**
 * Build confirmation keyboard
 * @param sessionKey - User session key
 * @returns Inline keyboard markup
 */
export function buildConfirmationKeyboard(sessionKey: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Confirm & Create", `DCA_CONFIRM_${sessionKey}`),
      Markup.button.callback("❌ Cancel", `DCA_CANCEL_${sessionKey}`)
    ]
  ]);
}

/**
 * Build success message after strategy creation
 * @param strategy - Created DCA strategy
 * @returns Formatted success message
 */
export function buildSuccessMessage(strategy: any): string {
  const formattedAmount = formatSmallestUnit(strategy.amountPerInterval, strategy.baseTokenDecimals);
  return (
    `✅ *DCA Strategy Created!*\n\n` +
    `🎯 *Strategy Details:*\n` +
    `Token Pair: ${strategy.baseToken} → ${strategy.targetToken}\n` +
    `Amount: ${formattedAmount} ${strategy.baseToken}\n` +
    `Frequency: ${getFrequencyDisplay(strategy.frequency)}\n` +
    `Status: ${strategy.status}\n` +
    `First execution: ${new Date(strategy.nextExecutionTime).toLocaleString()}\n\n` +
    `💡 Use /dca\\_list to view and manage your strategies.`
  );
}

/**
 * Build strategy list message
 * @param strategies - User's DCA strategies
 * @returns Formatted strategy list message
 */
export function buildStrategyListMessage(strategies: any[]): string {
  let message = `📊 *Your DCA Strategies*\n\n`;

  strategies.forEach((strategy, index) => {
    const statusEmoji = getStatusEmoji(strategy.status);
    const formattedAmount = formatSmallestUnit(strategy.amountPerInterval, strategy.baseTokenDecimals);
    const formattedTotalInvested = formatSmallestUnit(strategy.totalInvested, strategy.baseTokenDecimals);

    message += `${index + 1}. ${statusEmoji} *${strategy.baseToken} → ${strategy.targetToken}*\n`;
    message += `   Amount: ${formattedAmount} ${strategy.baseToken}\n`;
    message += `   Frequency: ${getFrequencyDisplay(strategy.frequency)}\n`;
    message += `   Status: ${strategy.status}\n`;

    if (strategy.consecutiveFailures > 0) {
      message += `   ⚠️ Consecutive Failures: ${strategy.consecutiveFailures}/3\n`;
    }

    message += `   Total Invested: ${formattedTotalInvested} ${strategy.baseToken}\n`;
    message += `   Executions: ${strategy.executionCount}\n`;
    message += `   Next Run: ${new Date(strategy.nextExecutionTime).toLocaleString()}\n\n`;
  });

  return message;
}

/**
 * Build strategy management keyboard (OLD - for backwards compatibility)
 * @param strategies - User's DCA strategies
 * @returns Inline keyboard markup
 */
export function buildStrategyManagementKeyboard(strategies: any[]) {
  const strategyButtons = strategies.map(strategy => {
    const label = strategy.status === "ACTIVE" ? "⏸ Pause" : "▶️ Resume";
    const action = strategy.status === "ACTIVE" ? "PAUSE" : "RESUME";
    return [
      Markup.button.callback(
        `${strategy.baseToken}→${strategy.targetToken}: ${label}`,
        `DCA_${action}_${strategy.id}`
      ),
      Markup.button.callback("🗑 Cancel", `DCA_CANCEL_STRATEGY_${strategy.id}`)
    ];
  });

  return Markup.inlineKeyboard([
    ...strategyButtons,
    [Markup.button.callback("➕ New DCA", "DCA_NEW")]
  ]);
}

/**
 * Build strategy list keyboard with clickable strategy buttons
 * @param strategies - User's DCA strategies
 * @returns Inline keyboard markup
 */
export function buildStrategyListKeyboard(strategies: any[]) {
  const strategyButtons = strategies.map(strategy => {
    const statusEmoji = getStatusEmoji(strategy.status);
    return [
      Markup.button.callback(
        `${statusEmoji} ${strategy.baseToken} → ${strategy.targetToken}`,
        `DCA_VIEW_${strategy.id}`
      )
    ];
  });

  return Markup.inlineKeyboard([
    ...strategyButtons,
    [
      Markup.button.callback("➕ New Strategy", "DCA_NEW"),
      Markup.button.callback("📊 Portfolio Stats", "DCA_PORTFOLIO_STATS")
    ],
    [Markup.button.callback("🔄 Refresh All", "DCA_REFRESH_LIST")]
  ]);
}

/**
 * Build strategy detail view message with full analytics
 * @param strategy - DCA strategy
 * @param analytics - Calculated analytics
 * @returns Formatted message
 */
export async function buildStrategyDetailMessage(
  strategy: any,
  analytics: StrategyAnalytics
): Promise<string> {
  const statusEmoji = getStatusEmoji(strategy.status);
  const formattedAmount = formatSmallestUnit(strategy.amountPerInterval, strategy.baseTokenDecimals);

  // Fetch SOL price in USD
  const solPrice = await getSolPriceUSD();
  const showUSD = solPrice !== null && strategy.baseToken === 'SOL';

  let message = `📊 *Strategy Overview*\n\n`;
  message += `${statusEmoji} *${strategy.baseToken} → ${strategy.targetToken}*\n\n`;

  message += `⚙️ *Configuration*\n`;
  message += `┌─ 💰 Amount: ${formattedAmount} ${strategy.baseToken}`;
  if (showUSD) {
    const amountUSD = parseFloat(formattedAmount) * solPrice;
    message += ` (${formatUSD(amountUSD)})`;
  }
  message += `\n`;
  message += `├─ ⏰ Frequency: ${getFrequencyDisplay(strategy.frequency)}\n`;
  message += `└─ 📍 Status: *${strategy.status}*`;

  if (strategy.status === "ACTIVE") {
    message += `\n   ⏳ Next: ${new Date(strategy.nextExecutionTime).toLocaleString()}`;
  }
  message += `\n`;

  if (strategy.consecutiveFailures > 0) {
    message += `\n⚠️ *Consecutive Failures: ${strategy.consecutiveFailures}/3*\n`;
  }

  message += `\n`;

  if (showUSD) {
    message += `📈 *Performance*\n`;
    message += `┌─ 💵 Invested: ${formatNumber(analytics.totalInvested)} ${strategy.baseToken} (${formatUSD(analytics.totalInvested * solPrice)})\n`;
    message += `├─ 🪙 Received: ${formatNumber(analytics.totalTokensReceived)} ${strategy.targetToken}\n`;
    message += `├─ 📊 Avg Price: ${formatNumber(analytics.averageBuyPrice, 6)} ${strategy.baseToken} (${formatUSD(analytics.averageBuyPrice * solPrice)})\n`;
    message += `├─ 💹 Current Price: ${formatNumber(analytics.currentPrice, 6)} ${strategy.baseToken} (${formatUSD(analytics.currentPrice * solPrice)})\n`;
    message += `├─ 💎 Current Value: ${formatNumber(analytics.currentValue)} ${strategy.baseToken} (${formatUSD(analytics.currentValue * solPrice)})\n`;

    const pnlUSD = analytics.pnl * solPrice;
    const pnlEmoji = pnlUSD >= 0 ? "📈" : "📉";
    const pnlSign = pnlUSD >= 0 ? "+" : "";
    message += `└─ ${pnlEmoji} *P&L: ${pnlSign}${formatNumber(Math.abs(analytics.pnl), 4)} ${strategy.baseToken} (${formatUSD(Math.abs(pnlUSD))} / ${pnlSign}${formatNumber(analytics.pnlPercentage, 2)}%)*\n\n`;
  } else {
    message += `📈 *Performance*\n`;
    message += `┌─ 💵 Invested: ${formatNumber(analytics.totalInvested)} ${strategy.baseToken}\n`;
    message += `├─ 🪙 Received: ${formatNumber(analytics.totalTokensReceived)} ${strategy.targetToken}\n`;
    message += `├─ 📊 Avg Price: ${formatNumber(analytics.averageBuyPrice)} ${strategy.baseToken}/${strategy.targetToken}\n`;
    message += `├─ 💹 Current Price: ${formatNumber(analytics.currentPrice)} ${strategy.baseToken}/${strategy.targetToken}\n`;
    message += `├─ 💎 Current Value: ${formatNumber(analytics.currentValue)} ${strategy.baseToken}\n`;
    message += `└─ ${formatPnL(analytics.pnl, analytics.pnlPercentage)} ${strategy.baseToken}\n\n`;
  }

  message += `📊 *Execution Statistics*\n`;
  message += `┌─ 🎯 Total: ${strategy.executionCount}\n`;
  message += `├─ ✅ Success: ${analytics.successfulExecutions}\n`;
  message += `├─ ❌ Failed: ${analytics.failedExecutions}\n`;
  message += `└─ 📈 Success Rate: *${formatNumber(analytics.successRate, 2)}%*\n`;

  return message;
}

/**
 * Build strategy detail view keyboard
 * @param strategy - DCA strategy
 * @returns Inline keyboard markup
 */
export function buildStrategyDetailKeyboard(strategy: any) {
  const isCancelled = strategy.status === "CANCELLED";
  const isPaused = strategy.status === "PAUSED";

  // If cancelled, show restart button
  if (isCancelled) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("📜 View History", `DCA_HISTORY_${strategy.id}`),
        Markup.button.callback("🔄 Refresh", `DCA_REFRESH_DETAIL_${strategy.id}`)
      ],
      [
        Markup.button.callback("🔄 Restart DCA", `DCA_RESTART_${strategy.id}`)
      ],
      [Markup.button.callback("« Back to List", "DCA_BACK_TO_LIST")]
    ]);
  }

  // For active/paused strategies
  const pauseResumeButton = isPaused
    ? Markup.button.callback("▶️ Resume", `DCA_RESUME_${strategy.id}`)
    : Markup.button.callback("⏸️ Pause", `DCA_PAUSE_${strategy.id}`);

  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📜 View History", `DCA_HISTORY_${strategy.id}`),
      Markup.button.callback("🔄 Refresh", `DCA_REFRESH_DETAIL_${strategy.id}`)
    ],
    [
      pauseResumeButton,
      Markup.button.callback("❌ Cancel", `DCA_CANCEL_${strategy.id}`)
    ],
    [Markup.button.callback("« Back to List", "DCA_BACK_TO_LIST")]
  ]);
}

/**
 * Build portfolio stats message showing individual strategy performance
 * @param strategies - User's DCA strategies
 * @param allExecutions - All execution history
 * @returns Formatted message
 */
export async function buildPortfolioStatsMessage(
  strategies: any[],
  allExecutions: any[]
): Promise<string> {
  // Fetch SOL price once for all strategies
  const solPrice = await getSolPriceUSD();
  const showUSD = solPrice !== null;

  // Calculate portfolio totals
  let totalInvestedSOL = 0;
  let totalValueSOL = 0;
  let totalPnLSOL = 0;
  let activeCount = 0;
  let pausedCount = 0;

  let message = `📊 *Portfolio Overview*\n\n`;

  if (showUSD) {
    message += `💵 *Market Price*\n`;
    message += `SOL: ${formatUSD(solPrice)}\n`;
    message += `\n`;
  }

  // Loop through each strategy and show individual performance
  let strategyDetails = '';
  for (const strategy of strategies) {
    const statusEmoji = getStatusEmoji(strategy.status);
    const strategyExecutions = allExecutions.filter(e => e.strategyId === strategy.id);
    const isSOL = strategy.baseToken === 'SOL';

    // Count active/paused strategies
    if (strategy.status === 'ACTIVE') activeCount++;
    if (strategy.status === 'PAUSED') pausedCount++;

    try {
      // Calculate analytics for this strategy
      const analytics = await calculateStrategyAnalytics(strategy, strategyExecutions);

      // Accumulate totals (only for SOL strategies)
      if (isSOL) {
        totalInvestedSOL += analytics.totalInvested;
        totalValueSOL += analytics.currentValue;
        totalPnLSOL += analytics.pnl;
      }

      // Format PnL emoji
      const pnlEmoji = analytics.pnl >= 0 ? "📈" : "📉";
      const pnlSign = analytics.pnl >= 0 ? "+" : "";

      // Build the strategy display
      strategyDetails += `\n${statusEmoji} *${strategy.baseToken} → ${strategy.targetToken}*\n`;
      strategyDetails += `┌─ 💰 Invested: ${formatNumber(analytics.totalInvested, 4)} ${strategy.baseToken}`;

      if (showUSD && isSOL) {
        const investedUSD = analytics.totalInvested * solPrice;
        strategyDetails += ` (${formatUSD(investedUSD)})`;
      }
      strategyDetails += `\n`;

      strategyDetails += `├─ 🪙 Holdings: ${formatTokenAmount(analytics.totalTokensReceived)} ${strategy.targetToken}\n`;
      strategyDetails += `├─ 📊 Value: ${formatNumber(analytics.currentValue, 4)} ${strategy.baseToken}`;

      if (showUSD && isSOL) {
        const valueUSD = analytics.currentValue * solPrice;
        strategyDetails += ` (${formatUSD(valueUSD)})`;
      }
      strategyDetails += `\n`;

      strategyDetails += `└─ ${pnlEmoji} P&L: ${pnlSign}${formatNumber(Math.abs(analytics.pnl), 4)} ${strategy.baseToken}`;

      if (showUSD && isSOL) {
        const pnlUSD = analytics.pnl * solPrice;
        strategyDetails += ` (${formatUSD(Math.abs(pnlUSD))})`;
      }
      strategyDetails += ` *${pnlSign}${formatNumber(analytics.pnlPercentage, 2)}%*\n`;

    } catch (error) {
      console.error(`[Messages] Error calculating analytics for strategy ${strategy.id}:`, error);
      // Fallback display if analytics fails
      strategyDetails += `\n${statusEmoji} *${strategy.baseToken} → ${strategy.targetToken}*\n`;
      strategyDetails += `├─ Calculating...\n`;
      strategyDetails += `└─ Please refresh\n`;
    }
  }

  // Add portfolio summary
  if (totalInvestedSOL > 0) {
    const portfolioPnLPercentage = (totalPnLSOL / totalInvestedSOL) * 100;
    const pnlEmoji = totalPnLSOL >= 0 ? "📈" : "📉";
    const pnlSign = totalPnLSOL >= 0 ? "+" : "";

    message += `📈 *Total Portfolio (SOL)*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 Invested: ${formatNumber(totalInvestedSOL, 4)} SOL`;
    if (showUSD) {
      message += ` (${formatUSD(totalInvestedSOL * solPrice)})`;
    }
    message += `\n`;

    message += `📊 Current: ${formatNumber(totalValueSOL, 4)} SOL`;
    if (showUSD) {
      message += ` (${formatUSD(totalValueSOL * solPrice)})`;
    }
    message += `\n`;

    message += `${pnlEmoji} P&L: ${pnlSign}${formatNumber(Math.abs(totalPnLSOL), 4)} SOL`;
    if (showUSD) {
      message += ` (${formatUSD(Math.abs(totalPnLSOL * solPrice))})`;
    }
    message += ` *${pnlSign}${formatNumber(portfolioPnLPercentage, 2)}%*\n\n`;
  }

  message += `🎯 *Active Strategies: ${activeCount}*`;
  if (pausedCount > 0) {
    message += ` | ⏸️ Paused: ${pausedCount}`;
  }
  message += `\n`;

  // Add individual strategy details
  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `*Individual Strategies*`;
  message += strategyDetails;

  return message;
}

/**
 * Build portfolio stats keyboard
 * @returns Inline keyboard markup
 */
export function buildPortfolioStatsKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📋 View Strategies", "DCA_BACK_TO_LIST"),
      Markup.button.callback("📜 All Transactions", "DCA_ALL_HISTORY")
    ],
    [Markup.button.callback("🔄 Refresh", "DCA_REFRESH_PORTFOLIO")]
  ]);
}

/**
 * Build transaction history selector message
 * @returns Formatted message
 */
export function buildHistorySelectorMessage(): string {
  let message = `📜 *Transaction History*\n\n`;
  message += `Select a strategy to view its execution history, or view all transactions:\n`;
  return message;
}

/**
 * Build transaction history selector keyboard
 * @param strategies - User's DCA strategies
 * @returns Inline keyboard markup
 */
export function buildHistorySelectorKeyboard(strategies: any[]) {
  const strategyButtons = strategies.map(strategy => [
    Markup.button.callback(
      `${strategy.baseToken} → ${strategy.targetToken}`,
      `DCA_HISTORY_${strategy.id}`
    )
  ]);

  return Markup.inlineKeyboard([
    ...strategyButtons,
    [Markup.button.callback("📜 All Transactions", "DCA_ALL_HISTORY")],
    [Markup.button.callback("« Back", "DCA_BACK_TO_LIST")]
  ]);
}

/**
 * Build execution history message for a strategy
 * @param strategy - DCA strategy
 * @param executions - Execution history
 * @returns Formatted message
 */
export function buildExecutionHistoryMessage(
  strategy: any,
  executions: any[]
): string {
  let message = `📜 *Execution History*\n\n`;
  message += `*Strategy:* ${strategy.baseToken} → ${strategy.targetToken}\n\n`;

  if (executions.length === 0) {
    message += `No executions yet.\n`;
    return message;
  }

  message += `Last ${executions.length} executions:\n\n`;

  executions.forEach((exec, index) => {
    const statusEmoji = exec.status === "SUCCESS" ? "✅" : "❌";
    message += `${index + 1}. ${statusEmoji} ${new Date(exec.executionTime).toLocaleString()}\n`;

    if (exec.status === "SUCCESS") {
      const formattedInvested = formatSmallestUnit(exec.amountInvested, strategy.baseTokenDecimals);
      const formattedReceived = formatSmallestUnit(exec.tokensReceived, strategy.targetTokenDecimals);
      const formattedPrice = formatSmallestUnit(exec.executionPrice, strategy.baseTokenDecimals);

      message += `   Invested: ${formattedInvested} ${strategy.baseToken}\n`;
      message += `   Received: ${formattedReceived} ${strategy.targetToken}\n`;
      message += `   Price: ${formattedPrice} ${strategy.baseToken}\n`;
      if (exec.txHash) {
        message += `   TX: \`${exec.txHash.substring(0, 8)}...${exec.txHash.substring(exec.txHash.length - 8)}\`\n`;
      }
    } else {
      message += `   Error: ${exec.errorMessage || "Unknown error"}\n`;
    }
    message += `\n`;
  });

  return message;
}

/**
 * Build execution history keyboard
 * @param strategyId - Strategy ID
 * @returns Inline keyboard markup
 */
export function buildExecutionHistoryKeyboard(strategyId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📊 Strategy Details", `DCA_VIEW_${strategyId}`)],
    [Markup.button.callback("« Back to List", "DCA_BACK_TO_LIST")]
  ]);
}

/**
 * Build all executions history message
 * @param executions - All execution history
 * @returns Formatted message
 */
export function buildAllExecutionsMessage(executions: any[]): string {
  let message = `📜 *All Transactions*\n\n`;

  if (executions.length === 0) {
    message += `No executions yet.\n`;
    return message;
  }

  message += `Last ${executions.length} executions across all strategies:\n\n`;

  executions.forEach((exec, index) => {
    const statusEmoji = exec.status === "SUCCESS" ? "✅" : "❌";
    const strategy = exec.strategy;

    message += `${index + 1}. ${statusEmoji} ${strategy.baseToken} → ${strategy.targetToken}\n`;
    message += `   ${new Date(exec.executionTime).toLocaleString()}\n`;

    if (exec.status === "SUCCESS") {
      const formattedInvested = formatSmallestUnit(exec.amountInvested, strategy.baseTokenDecimals);
      const formattedReceived = formatSmallestUnit(exec.tokensReceived, strategy.targetTokenDecimals);

      message += `   Invested: ${formattedInvested} ${strategy.baseToken}\n`;
      message += `   Received: ${formattedReceived} ${strategy.targetToken}\n`;
    } else {
      message += `   Error: ${exec.errorMessage || "Unknown error"}\n`;
    }
    message += `\n`;
  });

  return message;
}

/**
 * Build all executions history keyboard
 * @returns Inline keyboard markup
 */
export function buildAllExecutionsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("« Back", "DCA_HISTORY_SELECTOR")]
  ]);
}
