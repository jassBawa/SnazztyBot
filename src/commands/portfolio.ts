import { Telegraf } from "telegraf";
import { getOrCreateUserKeypair } from "../services/solana";
import { getTelegramId } from "../utils/telegram";
import { calculatePortfolioValue } from "../services/portfolio";
import { formatUSD } from "../services/price";
import { backToMainKeyboard } from "../utils/keyboards";

/**
 * Register portfolio command
 * Shows total portfolio value (SOL + all tokens) in SOL and USD
 */
export function registerPortfolio(bot: Telegraf) {
  bot.command(["portfolio", "p"], async (ctx) => {
    try {
      await ctx.reply("⏳ *Calculating portfolio value...*\n\nFetching balances and prices...", {
        parse_mode: "Markdown",
      });

      const telegramId = getTelegramId(ctx);
      const kp = await getOrCreateUserKeypair(telegramId);

      // Calculate portfolio value
      const portfolio = await calculatePortfolioValue(kp.publicKey);

      // Build message with improved formatting
      let message = `💼 *Portfolio Overview*\n\n`;

      // Total Portfolio Value - Big display at top
      message += `💰 *Total Value*\n`;
      message += `${portfolio.totalPortfolioSol.toFixed(4)} SOL`;
      if (portfolio.solPriceUsd !== null) {
        message += ` ≈ $${formatUSD(portfolio.totalPortfolioUsd)}`;
      }
      message += `\n\n`;

      // SOL Price reference
      if (portfolio.solPriceUsd !== null) {
        message += `💵 SOL Price: $${formatUSD(portfolio.solPriceUsd)}\n\n`;
      }

      // Breakdown section
      message += `📊 *Asset Breakdown*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;

      // SOL Balance
      message += `💎 SOL Balance\n`;
      message += `   ${portfolio.solBalance.toFixed(4)} SOL`;
      if (portfolio.solPriceUsd !== null) {
        message += ` ($${formatUSD(portfolio.solValueUsd)})`;
      }
      message += `\n\n`;

      // Token Holdings
      if (portfolio.tokens.length > 0) {
        const sortedTokens = [...portfolio.tokens].sort((a, b) => b.valueInSol - a.valueInSol);
        const tokensToShow = sortedTokens.slice(0, 10);

        message += `🪙 Token Holdings (${portfolio.tokens.length})\n`;
        message += `   Total: ${portfolio.totalTokenValueSol.toFixed(4)} SOL`;
        if (portfolio.solPriceUsd !== null) {
          message += ` ($${formatUSD(portfolio.totalTokenValueUsd)})`;
        }
        message += `\n\n`;

        tokensToShow.forEach((token, index) => {
          const balance = token.balance.toFixed(Math.min(token.decimals, 4));

          message += `   • *${token.symbol}*\n`;
          message += `      Balance: ${balance}\n`;
          message += `      Value: ${token.valueInSol.toFixed(4)} SOL`;

          if (portfolio.solPriceUsd !== null && token.valueInUsd > 0) {
            message += ` ($${formatUSD(token.valueInUsd)})`;
          }
          message += `\n`;

          if (index < tokensToShow.length - 1) {
            message += `\n`;
          }
        });

        if (sortedTokens.length > 10) {
          message += `\n   _+${sortedTokens.length - 10} more tokens_\n`;
        }
      } else {
        message += `🪙 Token Holdings\n`;
        message += `   No tokens found\n`;
      }

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...backToMainKeyboard(),
      });
    } catch (err: any) {
      console.error("[Portfolio] Error:", err);
      await ctx.reply(
        `❌ Failed to calculate portfolio: ${err?.message ?? "unknown error"}`,
        { parse_mode: "Markdown" }
      );
    }
  });

  // Action handler for portfolio button
  bot.action("ACTION_PORTFOLIO", async (ctx) => {
    try {
      await ctx.editMessageText(
        "⏳ *Calculating portfolio value...*\n\nFetching balances and prices...",
        { parse_mode: "Markdown" }
      );

      const telegramId = getTelegramId(ctx);
      const kp = await getOrCreateUserKeypair(telegramId);

      // Calculate portfolio value
      const portfolio = await calculatePortfolioValue(kp.publicKey);

      // Build message with improved formatting
      let message = `💼 *Portfolio Overview*\n\n`;

      // Total Portfolio Value - Big display at top
      message += `💰 *Total Value*\n`;
      message += `${portfolio.totalPortfolioSol.toFixed(4)} SOL`;
      if (portfolio.solPriceUsd !== null) {
        message += ` ≈ $${formatUSD(portfolio.totalPortfolioUsd)}`;
      }
      message += `\n\n`;

      // SOL Price reference
      if (portfolio.solPriceUsd !== null) {
        message += `💵 SOL Price: $${formatUSD(portfolio.solPriceUsd)}\n\n`;
      }

      // Breakdown section
      message += `📊 *Asset Breakdown*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;

      // SOL Balance
      message += `💎 SOL Balance\n`;
      message += `   ${portfolio.solBalance.toFixed(4)} SOL`;
      if (portfolio.solPriceUsd !== null) {
        message += ` ($${formatUSD(portfolio.solValueUsd)})`;
      }
      message += `\n\n`;

      // Token Holdings
      if (portfolio.tokens.length > 0) {
        const sortedTokens = [...portfolio.tokens].sort((a, b) => b.valueInSol - a.valueInSol);
        const tokensToShow = sortedTokens.slice(0, 10);

        message += `🪙 Token Holdings (${portfolio.tokens.length})\n`;
        message += `   Total: ${portfolio.totalTokenValueSol.toFixed(4)} SOL`;
        if (portfolio.solPriceUsd !== null) {
          message += ` ($${formatUSD(portfolio.totalTokenValueUsd)})`;
        }
        message += `\n\n`;

        tokensToShow.forEach((token, index) => {
          const balance = token.balance.toFixed(Math.min(token.decimals, 4));

          message += `   • *${token.symbol}*\n`;
          message += `      Balance: ${balance}\n`;
          message += `      Value: ${token.valueInSol.toFixed(4)} SOL`;

          if (portfolio.solPriceUsd !== null && token.valueInUsd > 0) {
            message += ` ($${formatUSD(token.valueInUsd)})`;
          }
          message += `\n`;

          if (index < tokensToShow.length - 1) {
            message += `\n`;
          }
        });

        if (sortedTokens.length > 10) {
          message += `\n   _+${sortedTokens.length - 10} more tokens_\n`;
        }
      } else {
        message += `🪙 Token Holdings\n`;
        message += `   No tokens found\n`;
      }

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...backToMainKeyboard(),
      });
      await ctx.answerCbQuery();
    } catch (err: any) {
      console.error("[Portfolio] Error:", err);
      await ctx.editMessageText(
        `❌ Failed to calculate portfolio: ${err?.message ?? "unknown error"}`,
        { parse_mode: "Markdown" }
      );
      await ctx.answerCbQuery();
    }
  });
}
