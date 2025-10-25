import { Telegraf } from "telegraf";
import { setupDcaFlow, showDcaList, showPortfolioStats, showHistorySelector } from "./flows";
import { registerSetupHandlers } from "./handlers/setup";
import { registerManagementHandlers } from "./handlers/management";
import { registerAnalyticsHandlers } from "./handlers/analytics";

/**
 * Register all DCA-related commands and action handlers
 * @param bot - Telegraf bot instance
 */
export function registerDcaCommands(bot: Telegraf): void {

  bot.command("dca", setupDcaFlow);

  bot.command("dca_list", showDcaList);
  bot.command("dcas", showDcaList);
  bot.command("dca_stats", showPortfolioStats);
  bot.command("dca_history", showHistorySelector);
  bot.command("dca_txns", showHistorySelector);

  bot.action("ACTION_DCA_SETUP", async (ctx) => {
    await ctx.answerCbQuery();
    await setupDcaFlow(ctx);
  });

  bot.action("ACTION_DCA_LIST", async (ctx) => {
    await ctx.answerCbQuery();
    await showDcaList(ctx);
  });

  bot.action("DCA_NEW", async (ctx) => {
    await ctx.answerCbQuery();
    await setupDcaFlow(ctx);
  });

  registerSetupHandlers(bot);
  registerManagementHandlers(bot);
  registerAnalyticsHandlers(bot);
}
