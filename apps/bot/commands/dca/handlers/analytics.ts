/**
 * DCA Analytics Handlers
 * Handlers for strategy detail view, portfolio stats, and transaction history
 */

import { Telegraf, Markup } from "telegraf";
import { getTelegramId } from "../../../utils/telegram";
import { getUserByTelegramId } from "@repo/database";
import { getDcaStrategy, getUserDcaStrategies } from "@repo/database/dca";
import {
  getStrategyExecutions,
  getUserExecutions,
  getStrategyWithExecutions,
} from "@repo/database/dca";
import { calculateStrategyAnalytics, calculatePortfolioAnalytics } from "../analytics";
import {
  buildStrategyDetailMessage,
  buildStrategyDetailKeyboard,
  buildPortfolioStatsMessage,
  buildPortfolioStatsKeyboard,
  buildHistorySelectorMessage,
  buildHistorySelectorKeyboard,
  buildExecutionHistoryMessage,
  buildExecutionHistoryKeyboard,
  buildAllExecutionsMessage,
  buildAllExecutionsKeyboard,
} from "../messages";
import { backToMainKeyboard } from "../../../utils/keyboards";

export function registerAnalyticsHandlers(bot: Telegraf) {
  /**
   * View strategy detail with PnL analytics
   */
  bot.action(/^DCA_VIEW_(.+)$/, async (ctx) => {
    try {
      const strategyId = ctx.match[1];

      // Show loading message
      await ctx.editMessageText("⏳ *Loading strategy details...*\n\nFetching data and calculating analytics...", {
        parse_mode: "Markdown",
      });
      await ctx.answerCbQuery();

      // Fetch strategy with executions
      const strategyWithExecs = await getStrategyWithExecutions(strategyId);

      if (!strategyWithExecs) {
        await ctx.editMessageText("❌ Strategy not found", { parse_mode: "Markdown" });
        return;
      }

      // Calculate analytics
      const analytics = await calculateStrategyAnalytics(
        strategyWithExecs,
        strategyWithExecs.executions
      );

      const message = await buildStrategyDetailMessage(strategyWithExecs, analytics);
      const keyboard = buildStrategyDetailKeyboard(strategyWithExecs);

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });
    } catch (error: any) {
      console.error(`[DCA] Error viewing strategy detail:`, error);
      await ctx.editMessageText(`❌ Error: ${error?.message}`, { parse_mode: "Markdown" });
    }
  });

  /**
   * Refresh strategy detail view
   */
  bot.action(/^DCA_REFRESH_DETAIL_(.+)$/, async (ctx) => {
    try {
      const strategyId = ctx.match[1];

      // Fetch fresh data
      const strategyWithExecs = await getStrategyWithExecutions(strategyId);

      if (!strategyWithExecs) {
        await ctx.answerCbQuery("Strategy not found");
        return;
      }

      // Recalculate analytics
      const analytics = await calculateStrategyAnalytics(
        strategyWithExecs,
        strategyWithExecs.executions
      );

      const message = await buildStrategyDetailMessage(strategyWithExecs, analytics);
      const keyboard = buildStrategyDetailKeyboard(strategyWithExecs);

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });

      await ctx.answerCbQuery("✅ Refreshed");
    } catch (error: any) {
      console.error(`[DCA] Error refreshing strategy detail:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Confirm cancel strategy (MUST come before the CANCEL confirmation handler)
   */
  bot.action(/^DCA_CANCEL_OK_(.+)$/, async (ctx) => {
    try {
      const strategyId = ctx.match[1];

      const { cancelDcaStrategy } = await import("@repo/database/dca");
      await cancelDcaStrategy(strategyId);

      await ctx.editMessageText(
        `✅ DCA strategy cancelled successfully.\n\n` +
          `The strategy is now inactive. You can restart it anytime from /dca\\_list.`,
        {
          parse_mode: "Markdown",
          ...backToMainKeyboard(),
        }
      );
      await ctx.answerCbQuery("✅ Strategy cancelled");
    } catch (error: any) {
      console.error(`[DCA] Error cancelling strategy:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Cancel strategy confirmation
   */
  bot.action(/^DCA_CANCEL_(.+)$/, async (ctx) => {
    try {
      const strategyId = ctx.match[1];

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Yes, Cancel It", `DCA_CANCEL_OK_${strategyId}`),
          Markup.button.callback("❌ No, Keep It", `DCA_VIEW_${strategyId}`)
        ]
      ]);

      await ctx.editMessageText(
        `⚠️ *Confirm Cancellation*\n\n` +
          `Are you sure you want to cancel this DCA strategy?\n\n` +
          `The strategy will stop executing but can be restarted later. All execution history will be preserved.`,
        {
          parse_mode: "Markdown",
          ...keyboard
        }
      );
      await ctx.answerCbQuery();
    } catch (error: any) {
      console.error(`[DCA] Error showing cancel confirmation:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Restart cancelled strategy
   */
  bot.action(/^DCA_RESTART_(.+)$/, async (ctx) => {
    try {
      const strategyId = ctx.match[1];

      const { resumeDcaStrategy } = await import("@repo/database/dca");
      await resumeDcaStrategy(strategyId);

      // Refresh the detail view with updated strategy
      const strategyWithExecs = await getStrategyWithExecutions(strategyId);
      if (strategyWithExecs) {
        const analytics = await calculateStrategyAnalytics(
          strategyWithExecs,
          strategyWithExecs.executions
        );
        const message = await buildStrategyDetailMessage(strategyWithExecs, analytics);
        const keyboard = buildStrategyDetailKeyboard(strategyWithExecs);

        await ctx.editMessageText(message, {
          parse_mode: "Markdown",
          ...keyboard,
        });
        await ctx.answerCbQuery("✅ Strategy restarted");
      } else {
        await ctx.answerCbQuery("Strategy not found");
      }
    } catch (error: any) {
      console.error(`[DCA] Error restarting strategy:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * View strategy execution history
   */
  bot.action(/^DCA_HISTORY_(.+)$/, async (ctx) => {
    try {
      const strategyId = ctx.match[1];

      const strategy = await getDcaStrategy(strategyId);
      if (!strategy) {
        await ctx.answerCbQuery("Strategy not found");
        return;
      }

      const executions = await getStrategyExecutions(strategyId, 15);

      const message = buildExecutionHistoryMessage(strategy, executions);
      const keyboard = buildExecutionHistoryKeyboard(strategyId);

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });

      await ctx.answerCbQuery();
    } catch (error: any) {
      console.error(`[DCA] Error viewing execution history:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Show portfolio stats
   */
  bot.action("DCA_PORTFOLIO_STATS", async (ctx) => {
    try {
      // Show loading message
      await ctx.editMessageText("⏳ *Loading portfolio stats...*\n\nAnalyzing all strategies and calculating PnL...", {
        parse_mode: "Markdown",
      });
      await ctx.answerCbQuery();

      const telegramId = getTelegramId(ctx);
      const user = await getUserByTelegramId(telegramId);

      if (!user) {
        await ctx.editMessageText("❌ User not found", { parse_mode: "Markdown" });
        return;
      }

      const strategies = await getUserDcaStrategies(user.id);
      const allExecutions = await getUserExecutions(user.id, 1000); // Get all executions

      const message = await buildPortfolioStatsMessage(strategies, allExecutions);
      const keyboard = buildPortfolioStatsKeyboard();

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });
    } catch (error: any) {
      console.error(`[DCA] Error viewing portfolio stats:`, error);
      await ctx.editMessageText(`❌ Error: ${error?.message}`, { parse_mode: "Markdown" });
    }
  });

  /**
   * Refresh portfolio stats
   */
  bot.action("DCA_REFRESH_PORTFOLIO", async (ctx) => {
    try {
      const telegramId = getTelegramId(ctx);
      const user = await getUserByTelegramId(telegramId);

      if (!user) {
        await ctx.answerCbQuery("User not found");
        return;
      }

      const strategies = await getUserDcaStrategies(user.id);
      const allExecutions = await getUserExecutions(user.id, 1000);

      const message = await buildPortfolioStatsMessage(strategies, allExecutions);
      const keyboard = buildPortfolioStatsKeyboard();

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });

      await ctx.answerCbQuery("✅ Refreshed");
    } catch (error: any) {
      console.error(`[DCA] Error refreshing portfolio stats:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Show transaction history selector
   */
  bot.action("DCA_HISTORY_SELECTOR", async (ctx) => {
    try {
      const telegramId = getTelegramId(ctx);
      const user = await getUserByTelegramId(telegramId);

      if (!user) {
        await ctx.answerCbQuery("User not found");
        return;
      }

      const strategies = await getUserDcaStrategies(user.id);

      if (strategies.length === 0) {
        await ctx.editMessageText(
          `📜 *Transaction History*\n\n` +
            `You don't have any DCA strategies yet.\n\n` +
            `Use /dca to create one!`,
          {
            parse_mode: "Markdown",
            ...backToMainKeyboard(),
          }
        );
        await ctx.answerCbQuery();
        return;
      }

      const message = buildHistorySelectorMessage();
      const keyboard = buildHistorySelectorKeyboard(strategies);

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });

      await ctx.answerCbQuery();
    } catch (error: any) {
      console.error(`[DCA] Error showing history selector:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Show all transactions across all strategies
   */
  bot.action("DCA_ALL_HISTORY", async (ctx) => {
    try {
      const telegramId = getTelegramId(ctx);
      const user = await getUserByTelegramId(telegramId);

      if (!user) {
        await ctx.answerCbQuery("User not found");
        return;
      }

      const executions = await getUserExecutions(user.id, 20);

      const message = buildAllExecutionsMessage(executions);
      const keyboard = buildAllExecutionsKeyboard();

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });

      await ctx.answerCbQuery();
    } catch (error: any) {
      console.error(`[DCA] Error viewing all executions:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Back to list handler
   */
  bot.action("DCA_BACK_TO_LIST", async (ctx) => {
    try {
      // Re-import and call the showDcaList function
      const { showDcaList } = await import("../flows");
      await ctx.answerCbQuery();
      await showDcaList(ctx);
    } catch (error: any) {
      console.error(`[DCA] Error going back to list:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Refresh list handler
   */
  bot.action("DCA_REFRESH_LIST", async (ctx) => {
    try {
      const { showDcaList } = await import("../flows");
      await ctx.answerCbQuery("✅ Refreshed");
      await showDcaList(ctx);
    } catch (error: any) {
      console.error(`[DCA] Error refreshing list:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });
}
