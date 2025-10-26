import { getTelegramId } from "../../utils/telegram";
import { getAllActiveTokenPairs, getUserByTelegramId } from "@repo/database";
import { getUserDcaStrategies } from "@repo/database/dca";
import { backToMainKeyboard } from "../../utils/keyboards";
import { getSessionKey, setSession, clearSession } from "./session";
import {
  buildTokenPairSelection,
  buildStrategyListMessage,
  buildStrategyListKeyboard,
  buildPortfolioStatsMessage,
  buildPortfolioStatsKeyboard,
  buildHistorySelectorMessage,
  buildHistorySelectorKeyboard
} from "./messages";
import { getUserExecutions } from "@repo/database/dca";
import { calculatePortfolioAnalytics } from "./analytics";

export async function setupDcaFlow(ctx: any): Promise<void> {
  try {
    const sessionKey = getSessionKey(ctx);

    setSession(sessionKey, { step: "selecting_pair" });

    const tokenPairs = await getAllActiveTokenPairs();

    if (tokenPairs.length === 0) {
      await ctx.reply(
        `❌ No token pairs available for DCA at the moment.\n\n` +
        `Please contact the administrator to add token pairs.`,
        { ...backToMainKeyboard() }
      );
      clearSession(sessionKey);
      return;
    }

    const { message, keyboard } = buildTokenPairSelection(tokenPairs, sessionKey);
    await ctx.reply(message, { parse_mode: "Markdown", ...keyboard });
  } catch (error: any) {
    console.error(`[DCA] Error in setupDcaFlow:`, error);
    await ctx.reply(`❌ Error: ${error?.message ?? "Failed to load token pairs"}`);
  }
}

export async function showDcaList(ctx: any): Promise<void> {
  try {
    const telegramId = getTelegramId(ctx);

    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply(
        `❌ Please create a wallet first using /start`,
        { ...backToMainKeyboard() }
      );
      return;
    }

    const strategies = await getUserDcaStrategies(user.id);

    if (strategies.length === 0) {
      await ctx.reply(
        `📊 *Your DCA Strategies*\n\n` +
        `You don't have any active DCA strategies.\n\n` +
        `Use /dca to create one!`,
        { parse_mode: "Markdown", ...backToMainKeyboard() }
      );
      return;
    }

    const message = buildStrategyListMessage(strategies);
    const keyboard = buildStrategyListKeyboard(strategies);

    await ctx.reply(message, { parse_mode: "Markdown", ...keyboard });
  } catch (error: any) {
    console.error(`[DCA] Error in showDcaList:`, error);
    await ctx.reply(`❌ Error: ${error?.message ?? "Failed to load strategies"}`);
  }
}

export async function showPortfolioStats(ctx: any): Promise<void> {
  try {
    const telegramId = getTelegramId(ctx);

    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply(
        `❌ Please create a wallet first using /start`,
        { ...backToMainKeyboard() }
      );
      return;
    }

    const strategies = await getUserDcaStrategies(user.id);

    if (strategies.length === 0) {
      await ctx.reply(
        `📊 *Portfolio Analytics*\n\n` +
        `You don't have any DCA strategies yet.\n\n` +
        `Use /dca to create one!`,
        { parse_mode: "Markdown", ...backToMainKeyboard() }
      );
      return;
    }

    const allExecutions = await getUserExecutions(user.id, 1000);

    const message = await buildPortfolioStatsMessage(strategies, allExecutions);
    const keyboard = buildPortfolioStatsKeyboard();

    await ctx.reply(message, { parse_mode: "Markdown", ...keyboard });
  } catch (error: any) {
    console.error(`[DCA] Error in showPortfolioStats:`, error);
    await ctx.reply(`❌ Error: ${error?.message ?? "Failed to load portfolio stats"}`);
  }
}

export async function showHistorySelector(ctx: any): Promise<void> {
  try {
    const telegramId = getTelegramId(ctx);

    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply(
        `❌ Please create a wallet first using /start`,
        { ...backToMainKeyboard() }
      );
      return;
    }

    const strategies = await getUserDcaStrategies(user.id);

    if (strategies.length === 0) {
      await ctx.reply(
        `📜 *Transaction History*\n\n` +
        `You don't have any DCA strategies yet.\n\n` +
        `Use /dca to create one!`,
        { parse_mode: "Markdown", ...backToMainKeyboard() }
      );
      return;
    }

    const message = buildHistorySelectorMessage();
    const keyboard = buildHistorySelectorKeyboard(strategies);

    await ctx.reply(message, { parse_mode: "Markdown", ...keyboard });
  } catch (error: any) {
    console.error(`[DCA] Error in showHistorySelector:`, error);
    await ctx.reply(`❌ Error: ${error?.message ?? "Failed to load transaction history"}`);
  }
}
