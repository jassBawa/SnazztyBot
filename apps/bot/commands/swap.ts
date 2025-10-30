import { Telegraf, Markup } from "telegraf";
import { getOrCreateUserKeypair, getBalances, isValidSolanaAddress, getTokenBalance } from "@repo/services/solana";
import { getTelegramId } from "../utils/telegram";
import { backToMainKeyboard, swapOptionsKeyboard } from "../utils/keyboards";
import { swapTokenForToken, previewTokenForToken } from "@repo/services/raydium";
import { getQuoteBuy, getQuoteSell } from "@repo/services/quote";
import { executeBuy, executeSell } from "@repo/services/trade";

// Store user swap sessions
import { userSessions } from "./swap.session";

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
        `\`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`\n\n`,
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
        `\`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`\n\n`,
      { parse_mode: "Markdown", ...backToMainKeyboard() }
    );
  });

  // Token-to-token swap action
  bot.action("ACTION_SWAP_TOKEN_TO_TOKEN", async (ctx) => {
    const telegramId = getTelegramId(ctx);
    const sessionKey = telegramId.toString();

    // Initialize exchange session
    userSessions.set(sessionKey, {
      action: "exchange",
      step: "awaiting_token",
    });

    await ctx.reply(
      `🔄 *Token-to-Token Swap*\n\n` +
        `Please send the *input token* contract address (the token you want to swap FROM).\n\n` +
        `Example:\n` +
        `\`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`\n\n`,
      { parse_mode: "Markdown", ...backToMainKeyboard() }
    );
  });

  // Handle swap command
  bot.command("swap", async (ctx) => {
    await ctx.reply(
      `🔄 *Token Swap*\n\n` +
        `Choose an action:\n\n` +
        `🟢 *Buy Token* - Swap SOL for a token\n` +
        `🔴 *Sell Token* - Swap a token for SOL\n` +
        `🔄 *Swap Tokens* - Swap one token for another\n\n` +
        `💡 *Quick commands:*\n` +
        `/buy - Buy tokens directly\n` +
        `/sell - Sell tokens directly\n` +
        `/exchange - Token-to-token swap\n`, 
      { parse_mode: "Markdown", ...swapOptionsKeyboard() }
    );
  });

  // Direct buy command
  bot.command("buy", async (ctx) => {
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
        `\`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`\n\n`,
      { parse_mode: "Markdown", ...backToMainKeyboard() }
    );
  });

  // Direct sell command
  bot.command("sell", async (ctx) => {
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
        `\`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`\n\n`,
      { parse_mode: "Markdown", ...backToMainKeyboard() }
    );
  });

  // Direct exchange command (token-to-token)
  bot.command("exchange", async (ctx) => {
    const telegramId = getTelegramId(ctx);
    const sessionKey = telegramId.toString();

    // Initialize exchange session
    userSessions.set(sessionKey, {
      action: "exchange",
      step: "awaiting_token",
    });

    await ctx.reply(
      `🔄 *Token-to-Token Swap*\n\n` +
        `Please send the *input token* contract address (the token you want to swap FROM).\n\n` +
        `Example:\n` +
        `\`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`\n\n`,
      { parse_mode: "Markdown", ...backToMainKeyboard() }
    );
  });

  // Removed /cancel command to prefer inline cancel buttons

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
  bot.on("text", async (ctx, next) => {
    const telegramId = getTelegramId(ctx);
    const sessionKey = telegramId.toString();
    const session = userSessions.get(sessionKey);

    if (!session) return next(); // No active swap session, pass to next handler

    const text = ctx.message.text.trim();

    // Check if it's a command
    if (text.startsWith("/")) return next();

    try {
      const cancelKb = () =>
        Markup.inlineKeyboard([
          [Markup.button.callback("❌ Cancel", `CANCEL_SWAP_${sessionKey}`)],
        ]);
      if (session.step === "awaiting_token") {
        // Validate token address using proper Solana validation
        if (!isValidSolanaAddress(text)) {
          await ctx.reply(
            "❌ Invalid token address. Please send a valid Solana token address.",
            {
              ...Markup.inlineKeyboard([
                [Markup.button.callback("❌ Exit", `CANCEL_SWAP_${sessionKey}`)],
              ]),
            }
          );
          return;
        }

        // Update session
        session.tokenAddress = text;

        // For sell or exchange action, check if user holds this token
        if (session.action === "sell" || session.action === "exchange") {
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

          if (session.action === "sell") {
            await ctx.reply(
              `✅ Token address validated!\n\n` +
                `Token: \`${text}\`\n` +
                `Your balance: ${tokenBalance.amount.toFixed(6)} tokens\n\n` +
                `Now, how many tokens do you want to sell?\n\n` +
                `Example: \`0.1\` or \`10\`\n\n`,
              { parse_mode: "Markdown", ...cancelKb() }
            );
            session.step = "awaiting_amount";
          } else {
            // For exchange, ask for output token
            await ctx.reply(
              `✅ Input token validated!\n\n` +
                `Token: \`${text}\`\n` +
                `Your balance: ${tokenBalance.amount.toFixed(6)} tokens\n\n` +
                `Now, please send the *output token* contract address (the token you want to receive).\n\n` +
                `Example:\n` +
                `\`So11111111111111111111111111111111111111112\` (for SOL)\n\n`,
              { parse_mode: "Markdown", ...cancelKb() }
            );
            session.step = "awaiting_output_token";
          }
        } else {
          // For buy action, just confirm the address
          await ctx.reply(
            `✅ Token address received!\n\n` +
              `Token: \`${text}\`\n\n` +
              `Now, how much SOL do you want to spend?\n\n` +
              `Example: \`0.1\` or \`10\`\n\n`,
            { parse_mode: "Markdown", ...cancelKb() }
          );
          session.step = "awaiting_amount";
        }

        userSessions.set(sessionKey, session);
      } else if (session.step === "awaiting_output_token") {
        if (!isValidSolanaAddress(text)) {
          await ctx.reply("❌ Invalid token address. Please send a valid Solana token address.");
          return;
        }

        if (text === session.tokenAddress) {
          await ctx.reply("❌ Output token must be different from input token. Please send a different token address.");
          return;
        }

        // Update session
        session.outputTokenAddress = text;

        await ctx.reply(
          `✅ Output token received!\n\n` +
            `Output Token: \`${text}\`\n\n` +
            `Now, how many INPUT tokens do you want to swap?\n\n` +
            `Available: ${session.tokenBalance?.toFixed(6)} tokens\n\n` +
            `Example: \`0.1\` or \`10\`\n\n`,
          { parse_mode: "Markdown", ...cancelKb() }
        );

        session.step = "awaiting_amount";
        userSessions.set(sessionKey, session);
      } else if (session.step === "awaiting_amount") {
        const amount = parseFloat(text);

        if (isNaN(amount) || amount <= 0) {
          await ctx.reply("❌ Invalid amount. Please send a valid number.", { ...cancelKb() });
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
                `Please enter a lower amount.`,
              { ...cancelKb() }
            );
            return;
          }
        } else {
          // Check token balance for sell and exchange
          const tokenBalance = session.tokenBalance || 0;
          if (amount > tokenBalance) {
            await ctx.reply(
              `❌ Insufficient token balance!\n\n` +
                `You want to swap: ${amount} tokens\n` +
                `Your balance: ${tokenBalance.toFixed(6)} tokens\n\n` +
                `Please enter a lower amount.`,
              { ...cancelKb() }
            );
            return;
          }
        }

        // Update session
        session.amount = amount.toString();
        session.step = "confirming";
        userSessions.set(sessionKey, session);

        // Show confirmation with buttons
        const actionEmoji = session.action === "buy" ? "🟢" : session.action === "sell" ? "🔴" : "🔄";
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
          const fmt = (routeType?: string, poolIds?: string) => {
            const rt = routeType ? `\nRoute: \`${routeType}\`` : "";
            const pools = poolIds ? `\nPools: \`${poolIds.substring(0, 40)}...\`` : "";
            return `${rt}${pools}`;
          };
          if (session.action === "buy") {
            const loadingMsg = await ctx.reply("⏳ Finding the best route... this may take a few seconds.");
            const quote = await getQuoteBuy({ mint: session.tokenAddress!, solAmount: amount });
            try {
              await ctx.telegram.editMessageText(ctx.chat!.id, loadingMsg.message_id, undefined, "✅ Best route found");
            } catch {}
            expectedOutput = `~${quote.outputAmount} Token`;
            priceImpact = quote.priceImpact ? `${quote.priceImpact}%` : "-";
            routeInfo = fmt(quote.routeType, quote.poolIds);
          } else if (session.action === "sell") {
            const loadingMsg = await ctx.reply("⏳ Finding the best route... this may take a few seconds.");
            const quote = await getQuoteSell({ mint: session.tokenAddress!, tokenAmount: amount });
            try {
              await ctx.telegram.editMessageText(ctx.chat!.id, loadingMsg.message_id, undefined, "✅ Best route found");
            } catch {}
            expectedOutput = `~${quote.outputAmount} SOL`;
            priceImpact = quote.priceImpact ? `${quote.priceImpact}%` : "-";
            routeInfo = fmt(quote.routeType, quote.poolIds);
          } else {
            // Exchange action
            const preview = await previewTokenForToken({
              inputTokenMint: session.tokenAddress!,
              outputTokenMint: session.outputTokenAddress!,
              inputTokenAmount: amount,
            });
            expectedOutput = `~${preview.outputAmount} Token`;
            priceImpact = `${preview.priceImpact}%`;
            routeInfo = fmt(preview.routeType, preview.poolIds);
          }
        } catch (error: any) {
          expectedOutput = "Unable to calculate";
          console.error("[SWAP] Preview error:", error.message);
        }

        // Build balance info
        const balanceInfo = session.action === "buy"
          ? `Available: ${solBalance} SOL`
          : `Available: ${session.tokenBalance?.toFixed(6)} tokens`;

        let confirmMessage = `${actionEmoji} *Confirm Swap*\n\n` +
          `Action: ${session.action.toUpperCase()}\n`;

        if (session.action === "exchange") {
          confirmMessage += `Input Token: \`${session.tokenAddress}\`\n` +
            `Output Token: \`${session.outputTokenAddress}\`\n` +
            `${balanceInfo}\n` +
            `Amount to swap: ${amount} input tokens\n`;
        } else {
          confirmMessage += `Token: \`${session.tokenAddress}\`\n` +
            `${balanceInfo}\n` +
            `Amount to swap: ${amount} ${fromToken}\n`;
        }

        confirmMessage += `Expected output: ${expectedOutput}\n` +
          `Price impact: ${priceImpact}${routeInfo}\n\n` +
          `⚠️ *Note:* Actual amount may vary due to slippage.\n` +
          `⚠️ Pool fees and price impact apply.\n\n` +
          `Click Confirm to execute the swap.`;

        await ctx.reply(confirmMessage, { parse_mode: "Markdown", ...confirmKeyboard });
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
        console.log("[SWAP] Executing BUY (router)");
        result = await executeBuy({
          userKeypair,
          mint: session.tokenAddress!,
          solAmount: amount,
          slippage: 0.01,
        });
        console.log("[SWAP] BUY result:", result);
      } else if (session.action === "sell") {
        console.log("[SWAP] Executing SELL (router)");
        result = await executeSell({
          userKeypair,
          mint: session.tokenAddress!,
          tokenAmount: amount,
          slippage: 0.01,
        });
        console.log("[SWAP] SELL result:", result);
      } else {
        console.log("[SWAP] Executing EXCHANGE: Token -> Token");
        // Exchange token for another token
        result = await swapTokenForToken({
          userKeypair,
          inputTokenMint: session.tokenAddress!,
          outputTokenMint: session.outputTokenAddress!,
          inputTokenAmount: amount,
          slippage: 0.01, // 1% slippage (decimal format)
        });
        console.log("[SWAP] EXCHANGE result:", result);
      }

      console.log("[SWAP] Transaction successful! TX:", result.signature);

      const actionEmoji = session.action === "buy" ? "🟢" : session.action === "sell" ? "🔴" : "🔄";
      let swapMessage = `${actionEmoji} *Swap Successful!*\n\n`;

      if (session.action === "exchange") {
        swapMessage += `Swapped: ${result.inputAmount} Input Token\n` +
          `Received: ${result.outputAmount} Output Token\n\n`;
      } else {
        swapMessage += `Swapped: ${result.inputAmount} ${session.action === "buy" ? "SOL" : "Token"}\n` +
          `Received: ${result.outputAmount} ${session.action === "buy" ? "Token" : "SOL"}\n\n`;
      }

      swapMessage += `🔗 [View Transaction](${result.explorerLink})`;

      await ctx.editMessageText(swapMessage, { parse_mode: "Markdown", ...backToMainKeyboard() });

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
