/**
 * DCA Core Flow Functions
 * High-level functions for initiating DCA flows
 */

import { getTelegramId } from "../../utils/telegram";
import { getAllActiveTokenPairs, getUserByTelegramId, getUserDcaStrategies } from "../../services/db";
import { backToMainKeyboard } from "../../utils/keyboards";
import { getSessionKey, setSession, clearSession } from "./session";
import { buildTokenPairSelection, buildStrategyListMessage, buildStrategyManagementKeyboard } from "./messages";

/**
 * Start DCA setup flow
 * STEP 1: Show token pair selection
 * @param ctx - Telegram context
 */
export async function setupDcaFlow(ctx: any): Promise<void> {
  try {
    const sessionKey = getSessionKey(ctx);

    // Initialize new session
    setSession(sessionKey, { step: "selecting_pair" });

    // Fetch available token pairs
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

/**
 * Show user's DCA strategies
 * MANAGEMENT: View and manage existing strategies
 * @param ctx - Telegram context
 */
export async function showDcaList(ctx: any): Promise<void> {
  try {
    const telegramId = getTelegramId(ctx);

    // Verify user exists
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
    const keyboard = buildStrategyManagementKeyboard(strategies);

    await ctx.reply(message, { parse_mode: "Markdown", ...keyboard });
  } catch (error: any) {
    console.error(`[DCA] Error in showDcaList:`, error);
    await ctx.reply(`❌ Error: ${error?.message ?? "Failed to load strategies"}`);
  }
}
