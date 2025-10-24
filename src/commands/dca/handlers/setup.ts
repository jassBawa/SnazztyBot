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

export function registerSetupHandlers(bot: Telegraf) {

  bot.action(/^DCA_SELECT_PAIR_(.+)$/, async (ctx) => {
    try {
      const pairId = ctx.match[1];
      const sessionKey = getSessionKey(ctx);
      const session = getSession(sessionKey);

      if (!session || session.step !== "selecting_pair") {
        await ctx.answerCbQuery("Session expired. Please use /dca to start again.");
        return;
      }

      const tokenPairs = await getAllActiveTokenPairs();
      const selectedPair = tokenPairs.find(p => p.id === pairId);

      if (!selectedPair) {
        await ctx.answerCbQuery("Token pair not found");
        return;
      }

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

  bot.on("text", async (ctx, next) => {
    const sessionKey = getSessionKey(ctx);
    const session = getSession(sessionKey);

    if (!session) return next();
    if (ctx.message.text.startsWith("/")) return next();

    try {
      if (session.step === "awaiting_amount") {
        const text = ctx.message.text.trim();
        const amount = parseFloat(text);

        if (isNaN(amount) || amount <= 0) {
          await ctx.reply("❌ Invalid amount. Please send a valid positive number.");
          return;
        }

        session.amountPerInterval = amount.toString();
        session.step = "selecting_frequency";
        setSession(sessionKey, session);

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

  bot.action(/^DCA_FREQ_(.+)_(.+)$/, async (ctx) => {
    try {
      const frequency = ctx.match[1] as DcaFrequency;
      const sessionKey = ctx.match[2];
      const session = getSession(sessionKey);

      if (!session || session.step !== "selecting_frequency") {
        await ctx.answerCbQuery("Session expired. Please use /dca to start again.");
        return;
      }

      session.frequency = frequency;
      session.step = "confirming";
      setSession(sessionKey, session);

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

  bot.action(/^DCA_CONFIRM_(.+)$/, async (ctx) => {
    const sessionKey = ctx.match[1];

    try {
      const telegramId = BigInt(sessionKey);
      const session = getSession(sessionKey);

      if (!session || session.step !== "confirming") {
        await ctx.answerCbQuery("Session expired. Please use /dca to start again.");
        return;
      }

      await safeEditOrReply(ctx, "⏳ Creating your DCA strategy...");

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

      const nextExecutionTime = calculateNextExecutionTime(session.frequency!);
      const strategy = await createDcaStrategy({
        userId: user.id,
        baseToken: session.baseToken!,
        targetToken: session.targetToken!,
        amountPerInterval: session.amountPerInterval!,
        frequency: session.frequency!,
        nextExecutionTime,
      });

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

  bot.action(/^DCA_CANCEL_(.+)$/, async (ctx) => {
    const sessionKey = ctx.match[1];
    clearSession(sessionKey);
    await ctx.editMessageText(
      `❌ DCA setup cancelled.\n\nUse /dca to start again.`,
      { ...backToMainKeyboard() }
    );
    await ctx.answerCbQuery("Cancelled");
  });

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
