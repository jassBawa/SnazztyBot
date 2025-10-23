import { Telegraf, Markup } from "telegraf";
import { getOrCreateUserKeypair, getBalances, isValidSolanaAddress, getTokenBalance } from "../services/solana";
import { getTelegramId } from "../utils/telegram";
import { backToMainKeyboard, swapOptionsKeyboard } from "../utils/keyboards";
import { swapSolForToken, swapTokenForSol, previewSolForToken, previewTokenForSol } from "../services/raydium";

// Store user swap sessions
interface SwapSession {
  action: "buy" | "sell";
  tokenAddress?: string;
  amount?: string;
  tokenBalance?: number; // For sell action - store available token balance
  step: "awaiting_token" | "awaiting_amount" | "confirming";
}

const userSessions = new Map<string, SwapSession>();

export function registerSwapCommands(bot: Telegraf) {
  // Buy token action
  bot.action("ACTION_SWAP_BUY", async (ctx) => {
    const telegramId = getTelegramId(ctx);
    const sessionKey = telegramId.toString();

    // Initialize buy session
    userSessions.set(sessionKey, {
      action: "buy",
      step: "awaiting_token",
    });

    await ctx.reply(
      `🟢 *Buy Token*\n\n` +
        `Please send the token contract address you want to buy.\n\n` +
        `You will swap SOL for this token.\n\n` +
        `Example:\n` +
        `\`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`\n\n` +
        `Or send /cancel to cancel this operation.`,
      { parse_mode: "Markdown", ...backToMainKeyboard() }
    );
  });

  // Sell token action
  bot.action("ACTION_SWAP_SELL", async (ctx) => {
    const telegramId = getTelegramId(ctx);
    const sessionKey = telegramId.toString();

    // Initialize sell session
    userSessions.set(sessionKey, {
      action: "sell",
      step: "awaiting_token",
    });

    await ctx.reply(
      `🔴 *Sell Token*\n\n` +
        `Please send the token contract address you want to sell.\n\n` +
        `You will swap this token for SOL.\n\n` +
        `Example:\n` +
        `\`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`\n\n` +
        `Or send /cancel to cancel this operation.`,
      { parse_mode: "Markdown", ...backToMainKeyboard() }
    );
  });

  // Handle swap command
  bot.command("swap", async (ctx) => {
    await ctx.reply(
      `🔄 *Token Swap*\n\n` +
        `Choose an action:\n\n` +
        `🟢 *Buy Token* - Swap SOL for a token\n` +
        `🔴 *Sell Token* - Swap a token for SOL`,
      { parse_mode: "Markdown", ...swapOptionsKeyboard() }
    );
  });

  // Cancel swap action
  bot.action(/^CANCEL_SWAP_(.+)$/, async (ctx) => {
    const sessionKey = ctx.match[1];

    if (userSessions.has(sessionKey)) {
      userSessions.delete(sessionKey);
      await ctx.editMessageText("❌ Swap cancelled.", { ...backToMainKeyboard() });
    } else {
      await ctx.answerCbQuery("No active swap to cancel.");
    }
  });

  // Handle text messages for swap flow
  bot.on("text", async (ctx) => {
    const telegramId = getTelegramId(ctx);
    const sessionKey = telegramId.toString();
    const session = userSessions.get(sessionKey);

    if (!session) return; // No active session

    const text = ctx.message.text.trim();

    // Check if it's a command
    if (text.startsWith("/")) return;

    try {
      if (session.step === "awaiting_token") {
        // Validate token address using proper Solana validation
        if (!isValidSolanaAddress(text)) {
          await ctx.reply("❌ Invalid token address. Please send a valid Solana token address.");
          return;
        }

        // Update session
        session.tokenAddress = text;

        // For sell action, check if user holds this token
        if (session.action === "sell") {
          const kp = await getOrCreateUserKeypair(telegramId);
          const tokenBalance = await getTokenBalance(kp.publicKey, text);

          if (!tokenBalance || tokenBalance.amount === 0) {
            await ctx.reply(
              `❌ You don't hold any of this token!\n\n` +
                `Token address: \`${text}\`\n` +
                `Your balance: 0\n\n` +
                `Please enter a different token address or use /swap to start over.`,
              { parse_mode: "Markdown" }
            );
            return;
          }

          // Store token balance in session
          session.tokenBalance = tokenBalance.amount;

          await ctx.reply(
            `✅ Token address validated!\n\n` +
              `Token: \`${text}\`\n` +
              `Your balance: ${tokenBalance.amount.toFixed(6)} tokens\n\n` +
              `Now, how many tokens do you want to sell?\n\n` +
              `Example: \`0.1\` or \`10\`\n\n` +
              `Or send /cancel to cancel.`,
            { parse_mode: "Markdown" }
          );
        } else {
          // For buy action, just confirm the address
          await ctx.reply(
            `✅ Token address received!\n\n` +
              `Token: \`${text}\`\n\n` +
              `Now, how much SOL do you want to spend?\n\n` +
              `Example: \`0.1\` or \`10\`\n\n` +
              `Or send /cancel to cancel.`,
            { parse_mode: "Markdown" }
          );
        }

        session.step = "awaiting_amount";
        userSessions.set(sessionKey, session);
      } else if (session.step === "awaiting_amount") {
        const amount = parseFloat(text);

        if (isNaN(amount) || amount <= 0) {
          await ctx.reply("❌ Invalid amount. Please send a valid number.");
          return;
        }

        // Get user's balance
        const kp = await getOrCreateUserKeypair(telegramId);
        const balances = await getBalances(kp.publicKey);
        const solBalance = Number(balances.nativeSol);

        // Validate balance based on action
        if (session.action === "buy") {
          // Check SOL balance for buy
          if (amount > solBalance) {
            await ctx.reply(
              `❌ Insufficient SOL balance!\n\n` +
                `You want to spend: ${amount} SOL\n` +
                `Your balance: ${solBalance} SOL\n\n` +
                `Please enter a lower amount.`
            );
            return;
          }
        } else {
          // Check token balance for sell
          const tokenBalance = session.tokenBalance || 0;
          if (amount > tokenBalance) {
            await ctx.reply(
              `❌ Insufficient token balance!\n\n` +
                `You want to sell: ${amount} tokens\n` +
                `Your balance: ${tokenBalance.toFixed(6)} tokens\n\n` +
                `Please enter a lower amount.`
            );
            return;
          }
        }

        // Update session
        session.amount = amount.toString();
        session.step = "confirming";
        userSessions.set(sessionKey, session);

        // Show confirmation with buttons
        const actionEmoji = session.action === "buy" ? "🟢" : "🔴";
        const fromToken = session.action === "buy" ? "SOL" : "Token";

        const confirmKeyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Confirm Swap", `CONFIRM_SWAP_${sessionKey}`),
            Markup.button.callback("❌ Cancel", `CANCEL_SWAP_${sessionKey}`),
          ],
        ]);

        // Calculate expected output
        let expectedOutput = "Calculating...";
        let priceImpact = "N/A";
        let routeInfo = "";
        try {
          if (session.action === "buy") {
            const preview = await previewSolForToken({
              tokenMint: session.tokenAddress!,
              solAmount: amount,
            });
            expectedOutput = `~${preview.outputAmount} Token`;
            priceImpact = `${preview.priceImpact}%`;
            if (preview.routeType && preview.poolIds) {
              routeInfo = `\nRoute: ${preview.routeType}\nPools: ${preview.poolIds.substring(0, 40)}...`;
            }
          } else {
            const preview = await previewTokenForSol({
              tokenMint: session.tokenAddress!,
              tokenAmount: amount,
            });
            expectedOutput = `~${preview.outputAmount} SOL`;
            priceImpact = `${preview.priceImpact}%`;
            if (preview.routeType && preview.poolIds) {
              routeInfo = `\nRoute: ${preview.routeType}\nPools: ${preview.poolIds.substring(0, 40)}...`;
            }
          }
        } catch (error: any) {
          expectedOutput = "Unable to calculate";
          console.error("[SWAP] Preview error:", error.message);
        }

        // Build balance info
        const balanceInfo = session.action === "buy"
          ? `Available: ${solBalance} SOL`
          : `Available: ${session.tokenBalance?.toFixed(6)} tokens`;

        await ctx.reply(
          `${actionEmoji} *Confirm Swap*\n\n` +
            `Action: ${session.action.toUpperCase()}\n` +
            `Token: \`${session.tokenAddress}\`\n` +
            `${balanceInfo}\n` +
            `Amount to swap: ${amount} ${fromToken}\n` +
            `Expected output: ${expectedOutput}\n` +
            `Price impact: ${priceImpact}${routeInfo}\n\n` +
            `⚠️ *Note:* Actual amount may vary due to slippage.\n` +
            `⚠️ Pool fees and price impact apply.\n\n` +
            `Click Confirm to execute the swap.`,
          { parse_mode: "Markdown", ...confirmKeyboard }
        );
      }
    } catch (error: any) {
      await ctx.reply(`❌ Error: ${error?.message ?? "Unknown error"}`);
      userSessions.delete(sessionKey);
    }
  });

  // Confirm swap action
  bot.action(/^CONFIRM_SWAP_(.+)$/, async (ctx) => {
    const sessionKey = ctx.match[1];
    const telegramId = BigInt(sessionKey);
    const session = userSessions.get(sessionKey);

    if (!session || session.step !== "confirming") {
      await ctx.answerCbQuery("No active swap to confirm.");
      return;
    }

    try {
      await ctx.editMessageText("🔄 Processing swap... This may take a few moments.");
      console.log("[SWAP] Starting swap process");
      console.log("[SWAP] Session:", { action: session.action, token: session.tokenAddress, amount: session.amount });

      const userKeypair = await getOrCreateUserKeypair(telegramId);
      console.log("[SWAP] User keypair loaded, public key:", userKeypair.publicKey.toBase58());

      const amount = parseFloat(session.amount!);
      console.log("[SWAP] Parsed amount:", amount);

      let result;

      if (session.action === "buy") {
        console.log("[SWAP] Executing BUY: SOL -> Token");
        // Buy token with SOL
        result = await swapSolForToken({
          userKeypair,
          tokenMint: session.tokenAddress!,
          solAmount: amount,
          slippage: 0.01, // 1% slippage (decimal format)
        });
        console.log("[SWAP] BUY result:", result);
      } else {
        console.log("[SWAP] Executing SELL: Token -> SOL");
        // Sell token for SOL
        result = await swapTokenForSol({
          userKeypair,
          tokenMint: session.tokenAddress!,
          tokenAmount: amount,
          slippage: 0.01, // 1% slippage (decimal format)
        });
        console.log("[SWAP] SELL result:", result);
      }

      console.log("[SWAP] Transaction successful! TX:", result.signature);

      const actionEmoji = session.action === "buy" ? "🟢" : "🔴";
      await ctx.editMessageText(
        `✅ ${actionEmoji} *Swap Successful!*\n\n` +
          `Swapped: ${result.inputAmount} ${session.action === "buy" ? "SOL" : "Token"}\n` +
          `Received: ${result.outputAmount} ${session.action === "buy" ? "Token" : "SOL"}\n\n` +
          `🔗 [View Transaction](${result.explorerLink})`,
        { parse_mode: "Markdown", ...backToMainKeyboard() }
      );

      // Clear session
      userSessions.delete(sessionKey);
      console.log("[SWAP] Session cleared");
    } catch (error: any) {
      console.error("[SWAP] Error occurred:", error);
      console.error("[SWAP] Error stack:", error.stack);

      await ctx.editMessageText(
        `❌ Swap failed: ${error?.message ?? "Unknown error"}\n\n` +
          `This could be due to:\n` +
          `• No liquidity pool exists for this token\n` +
          `• Insufficient balance\n` +
          `• Network issues\n` +
          `• Invalid token address\n\n` +
          `Please try again with /swap`,
        { ...backToMainKeyboard() }
      );
      userSessions.delete(sessionKey);
      console.log("[SWAP] Session cleared after error");
    }
  });
}
