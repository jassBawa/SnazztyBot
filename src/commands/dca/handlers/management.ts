/**
 * DCA Strategy Management Handlers
 * Handles pause, resume, and cancel operations for existing strategies
 */

import { Telegraf, Markup } from "telegraf";
import { pauseDcaStrategy, resumeDcaStrategy, cancelDcaStrategy } from "../../../services/db";
import { backToMainKeyboard } from "../../../utils/keyboards";

/**
 * Register management handlers
 * @param bot - Telegraf bot instance
 */
export function registerManagementHandlers(bot: Telegraf) {

  /**
   * Handle pause/resume strategy
   */
  bot.action(/^DCA_(PAUSE|RESUME)_(.+)$/, async (ctx) => {
    try {
      const action = ctx.match[1];
      const strategyId = ctx.match[2];

      if (action === "PAUSE") {
        await pauseDcaStrategy(strategyId);
        await ctx.answerCbQuery("✅ Strategy paused");
      } else {
        await resumeDcaStrategy(strategyId);
        await ctx.answerCbQuery("✅ Strategy resumed");
      }

      await ctx.editMessageText("✅ Strategy updated! Use /dca\\_list to see the latest status.");
    } catch (error: any) {
      console.error(`[DCA] Error pausing/resuming strategy:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Handle cancel strategy request
   * Shows confirmation dialog
   */
  bot.action(/^DCA_CANCEL_STRATEGY_(.+)$/, async (ctx) => {
    try {
      const strategyId = ctx.match[1];
      const confirmKeyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Yes, Cancel Strategy", `DCA_CONFIRM_CANCEL_${strategyId}`),
          Markup.button.callback("❌ No, Keep It", "DCA_KEEP_STRATEGY")
        ]
      ]);

      await ctx.editMessageText(
        `⚠️ *Confirm Cancellation*\n\n` +
        `Are you sure you want to cancel this DCA strategy?\n\n` +
        `This action cannot be undone.`,
        { parse_mode: "Markdown", ...confirmKeyboard }
      );
      await ctx.answerCbQuery();
    } catch (error: any) {
      console.error(`[DCA] Error showing cancel confirmation:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Confirm strategy cancellation
   */
  bot.action(/^DCA_CONFIRM_CANCEL_(.+)$/, async (ctx) => {
    try {
      const strategyId = ctx.match[1];
      await cancelDcaStrategy(strategyId);

      await ctx.editMessageText(
        `✅ DCA strategy cancelled successfully.\n\n` +
        `Use /dca\\_list to view your remaining strategies.`,
        { ...backToMainKeyboard() }
      );
      await ctx.answerCbQuery("✅ Strategy cancelled");
    } catch (error: any) {
      console.error(`[DCA] Error cancelling strategy:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Keep strategy (cancel the cancellation)
   */
  bot.action("DCA_KEEP_STRATEGY", async (ctx) => {
    await ctx.editMessageText(
      `✅ Strategy kept.\n\nUse /dca\\_list to view your strategies.`,
      { ...backToMainKeyboard() }
    );
    await ctx.answerCbQuery("Strategy kept");
  });
}
