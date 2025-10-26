import { Telegraf, Markup } from "telegraf";
import { pauseDcaStrategy, resumeDcaStrategy, cancelDcaStrategy } from "../../../services/db";
import { backToMainKeyboard } from "../../../utils/keyboards";
import { getStrategyWithExecutions } from "../../../services/db/dca/execution";
import { calculateStrategyAnalytics } from "../analytics";
import { buildStrategyDetailMessage, buildStrategyDetailKeyboard } from "../messages";

export function registerManagementHandlers(bot: Telegraf) {

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
      } else {
        await ctx.editMessageText("✅ Strategy updated! Use /dca\\_list to see the latest status.", {
          parse_mode: "Markdown",
        });
      }
    } catch (error: any) {
      console.error(`[DCA] Error pausing/resuming strategy:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  // Old handlers removed - now using new detail view handlers in analytics.ts
}
