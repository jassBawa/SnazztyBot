/**
 * DCA Message Builders
 * All message formatting and keyboard building logic
 */

import { Markup } from "telegraf";
import { DcaSession, DcaFrequency } from "./types";
import { calculateNextExecutionTime, getFrequencyDisplay, getStatusEmoji } from "./utils";

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
    `This is how much ${baseToken} will be swapped for ${targetToken} at each interval.\n\n` +
    `Send /cancel to cancel this setup.`
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
  return (
    `✅ *DCA Strategy Created!*\n\n` +
    `🎯 *Strategy Details:*\n` +
    `Token Pair: ${strategy.baseToken} → ${strategy.targetToken}\n` +
    `Amount: ${strategy.amountPerInterval} ${strategy.baseToken}\n` +
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

    message += `${index + 1}. ${statusEmoji} *${strategy.baseToken} → ${strategy.targetToken}*\n`;
    message += `   Amount: ${strategy.amountPerInterval} ${strategy.baseToken}\n`;
    message += `   Frequency: ${getFrequencyDisplay(strategy.frequency)}\n`;
    message += `   Status: ${strategy.status}\n`;

    if (strategy.consecutiveFailures > 0) {
      message += `   ⚠️ Consecutive Failures: ${strategy.consecutiveFailures}/3\n`;
    }

    message += `   Total Invested: ${strategy.totalInvested} ${strategy.baseToken}\n`;
    message += `   Executions: ${strategy.executionCount}\n`;
    message += `   Next Run: ${new Date(strategy.nextExecutionTime).toLocaleString()}\n\n`;
  });

  return message;
}

/**
 * Build strategy management keyboard
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
