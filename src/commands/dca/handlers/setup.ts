/**
 * DCA Setup Flow Handlers
 * Handles the step-by-step DCA strategy creation process
 */

import { Telegraf } from "telegraf";
import { getAllActiveTokenPairs, createDcaStrategy, getUserByTelegramId } from "../../../services/db";
import { backToMainKeyboard } from "../../../utils/keyboards";
import { getSessionKey, getSession, setSession, clearSession } from "../session";
import { DcaFrequency } from "../types";
import { calculateNextExecutionTime, safeEditOrReply } from "../utils";
import {
  buildAmountPrompt,
  buildFrequencyKeyboard,
  buildFrequencyPrompt,
  buildConfirmationMessage,
  buildConfirmationKeyboard,
  buildSuccessMessage
} from "../messages";

/**
 * Register setup flow handlers
 * @param bot - Telegraf bot instance
 */
export function registerSetupHandlers(bot: Telegraf) {

  /**
   * STEP 2: Handle token pair selection
   * Updates session and prompts for amount input
   */
  bot.action(/^DCA_SELECT_PAIR_(.+)$/, async (ctx) => {
    try {
      const pairId = ctx.match[1];
      const sessionKey = getSessionKey(ctx);
      const session = getSession(sessionKey);

      if (!session || session.step !== "selecting_pair") {
        await ctx.answerCbQuery("Session expired. Please use /dca to start again.");
        return;
      }

      // Fetch and validate token pair
      const tokenPairs = await getAllActiveTokenPairs();
      const selectedPair = tokenPairs.find(p => p.id === pairId);

      if (!selectedPair) {
        await ctx.answerCbQuery("Token pair not found");
        return;
      }

      // Update session with selected pair
      session.tokenPairId = pairId;
      session.baseToken = selectedPair.baseToken;
      session.targetToken = selectedPair.targetToken;
      session.baseMint = selectedPair.baseMint;
      session.targetMint = selectedPair.targetMint;
      session.step = "awaiting_amount";
      setSession(sessionKey, session);

      const message = buildAmountPrompt(selectedPair.baseToken, selectedPair.targetToken);
      await ctx.editMessageText(message, { parse_mode: "Markdown" });
      await ctx.answerCbQuery();
    } catch (error: any) {
      console.error(`[DCA] Error in token pair selection:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * STEP 3: Handle text input for amount
   * Validates amount and prompts for frequency selection
   */
  bot.on("text", async (ctx, next) => {
    const sessionKey = getSessionKey(ctx);
    const session = getSession(sessionKey);

    // Pass to next handler if no active DCA session
    if (!session) return next();
    if (ctx.message.text.startsWith("/")) return next();

    try {
      if (session.step === "awaiting_amount") {
        const text = ctx.message.text.trim();
        const amount = parseFloat(text);

        // Validate amount
        if (isNaN(amount) || amount <= 0) {
          await ctx.reply("❌ Invalid amount. Please send a valid positive number.");
          return;
        }

        // Update session
        session.amountPerInterval = amount.toString();
        session.step = "selecting_frequency";
        setSession(sessionKey, session);

        // Show frequency selection
        const keyboard = buildFrequencyKeyboard(sessionKey);
        const message = buildFrequencyPrompt(amount, session.baseToken!);
        await ctx.reply(message, { parse_mode: "Markdown", ...keyboard });
      }
    } catch (error: any) {
      console.error(`[DCA] Error processing amount:`, error);
      await ctx.reply(`❌ Error: ${error?.message ?? "Unknown error"}`);
      clearSession(sessionKey);
    }
  });

  /**
   * STEP 4: Handle frequency selection
   * Shows confirmation screen with all details
   */
  bot.action(/^DCA_FREQ_(.+)_(.+)$/, async (ctx) => {
    try {
      const frequency = ctx.match[1] as DcaFrequency;
      const sessionKey = ctx.match[2];
      const session = getSession(sessionKey);

      if (!session || session.step !== "selecting_frequency") {
        await ctx.answerCbQuery("Session expired. Please use /dca to start again.");
        return;
      }

      // Update session
      session.frequency = frequency;
      session.step = "confirming";
      setSession(sessionKey, session);

      // Build confirmation screen
      const confirmMessage = buildConfirmationMessage(session, frequency);
      const confirmKeyboard = buildConfirmationKeyboard(sessionKey);

      await safeEditOrReply(ctx, confirmMessage, {
        parse_mode: "Markdown",
        ...confirmKeyboard
      });
      await ctx.answerCbQuery();
    } catch (error: any) {
      console.error(`[DCA] Error in frequency selection:`, error);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
      await ctx.reply(`❌ Error: ${error?.message ?? "Unknown error"}\n\nPlease use /dca to start again.`);
    }
  });

  /**
   * STEP 5: Handle confirmation
   * Creates DCA strategy in database
   */
  bot.action(/^DCA_CONFIRM_(.+)$/, async (ctx) => {
    const sessionKey = ctx.match[1];

    try {
      const telegramId = BigInt(sessionKey);
      const session = getSession(sessionKey);

      if (!session || session.step !== "confirming") {
        await ctx.answerCbQuery("Session expired. Please use /dca to start again.");
        return;
      }

      // Show loading state
      await safeEditOrReply(ctx, "⏳ Creating your DCA strategy...");

      // Verify user exists
      const user = await getUserByTelegramId(telegramId);
      if (!user) {
        await safeEditOrReply(
          ctx,
          `❌ Please create a wallet first using /start`,
          { ...backToMainKeyboard() }
        );
        clearSession(sessionKey);
        await ctx.answerCbQuery("User not found");
        return;
      }

      // Create strategy in database
      const nextExecutionTime = calculateNextExecutionTime(session.frequency!);
      const strategy = await createDcaStrategy({
        userId: user.id,
        baseToken: session.baseToken!,
        targetToken: session.targetToken!,
        amountPerInterval: session.amountPerInterval!,
        frequency: session.frequency!,
        nextExecutionTime,
      });

      // Show success message
      const successMessage = buildSuccessMessage(strategy);
      await safeEditOrReply(ctx, successMessage, {
        parse_mode: "Markdown",
        ...backToMainKeyboard()
      });

      clearSession(sessionKey);
      await ctx.answerCbQuery("✅ DCA strategy created!");
    } catch (error: any) {
      console.error(`[DCA] Error creating strategy:`, error);
      await safeEditOrReply(
        ctx,
        `❌ Failed to create DCA strategy: ${error?.message}\n\nPlease try again with /dca`,
        { ...backToMainKeyboard() }
      );
      clearSession(sessionKey);
      await ctx.answerCbQuery(`Error: ${error?.message}`);
    }
  });

  /**
   * Handle cancellation during setup
   */
  bot.action(/^DCA_CANCEL_(.+)$/, async (ctx) => {
    const sessionKey = ctx.match[1];
    clearSession(sessionKey);
    await ctx.editMessageText(
      `❌ DCA setup cancelled.\n\nUse /dca to start again.`,
      { ...backToMainKeyboard() }
    );
    await ctx.answerCbQuery("Cancelled");
  });

  /**
   * Handle /cancel command during setup
   */
  bot.command("cancel", async (ctx) => {
    const sessionKey = getSessionKey(ctx);
    const session = getSession(sessionKey);

    if (session) {
      clearSession(sessionKey);
      await ctx.reply(
        `❌ DCA setup cancelled.\n\nUse /dca to start again.`,
        { ...backToMainKeyboard() }
      );
    }
  });
}
