import { Telegraf } from "telegraf";
import {
  getOrCreateUserKeypair,
  getBalances,
  getTokenBalances,
} from "@repo/services/solana";
import { getTelegramId } from "../utils/telegram";
import { getSolPriceUSD, formatUSD } from "@repo/services/price";

export function registerWalletBalance(bot: Telegraf) {
  bot.command("wallet_balance", async (ctx) => {
    try {
      await ctx.reply("⏳ Loading wallet balance...");

      const telegramId = getTelegramId(ctx);
      const kp = await getOrCreateUserKeypair(telegramId);
      const balances = await getBalances(kp.publicKey);
      const tokenBalances = await getTokenBalances(kp.publicKey.toBase58());

      const native = Number(balances.nativeSol);

      // Fetch SOL price
      const solPrice = await getSolPriceUSD();

      let message = `💰 *Your Wallet*\n\n`;
      message += `📍 *Address*\n\`${kp.publicKey.toBase58()}\`\n\n`;

      message += `💎 *SOL Balance*\n`;
      message += `┌─ 💰 Amount: ${native.toFixed(4)} SOL\n`;

      if (solPrice !== null) {
        const valueUSD = native * solPrice;
        message += `└─ 💵 Value: ${formatUSD(valueUSD)}\n`;
      } else {
        message += `└─ 💵 Value: Price unavailable\n`;
      }

      // Add token balances
      if (tokenBalances.length > 0) {
        message += `\n🪙 *Token Balances*\n`;
        tokenBalances.forEach((token, index) => {
          const amount = token.amount.toFixed(token.decimals);
          const isLast = index === tokenBalances.length - 1;
          const prefix = isLast ? "└─" : "├─";
          message += `${prefix} ${token.symbol || "Unknown"}: ${amount}\n`;
        });
      } else {
        message += `\n🪙 *Token Balances*\n`;
        message += `└─ No tokens found\n`;
      }

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err: any) {
      await ctx.reply(
        `❌ Failed to fetch balance: ${err?.message ?? "unknown error"}`
      );
    }
  });

  // Also handle action from wallet button
  bot.action("WALLET_BALANCE", async (ctx) => {
    try {
      await ctx.editMessageText("⏳ Loading wallet balance...", {
        parse_mode: "Markdown",
      });

      const telegramId = getTelegramId(ctx);
      const kp = await getOrCreateUserKeypair(telegramId);
      const balances = await getBalances(kp.publicKey);
      const tokenBalances = await getTokenBalances(kp.publicKey.toBase58());

      const native = Number(balances.nativeSol);

      // Fetch SOL price
      const solPrice = await getSolPriceUSD();

      let message = `💰 *Your Wallet*\n\n`;
      message += `📍 *Address*\n\`${kp.publicKey.toBase58()}\`\n\n`;

      message += `💎 *SOL Balance*\n`;
      message += `┌─ 💰 Amount: ${native.toFixed(4)} SOL\n`;

      if (solPrice !== null) {
        const valueUSD = native * solPrice;
        message += `└─ 💵 Value: ${formatUSD(valueUSD)}\n`;
      } else {
        message += `└─ 💵 Value: Price unavailable\n`;
      }

      // Add token balances
      if (tokenBalances.length > 0) {
        message += `\n🪙 *Token Balances*\n`;
        tokenBalances.forEach((token, index) => {
          const amount = token.amount.toFixed(token.decimals);
          const isLast = index === tokenBalances.length - 1;
          const prefix = isLast ? "└─" : "├─";
          message += `${prefix} ${token.symbol || "Unknown"}: ${amount}\n`;
        });
      } else {
        message += `\n🪙 *Token Balances*\n`;
        message += `└─ No tokens found\n`;
      }

      // Import keyboard dynamically to avoid circular dependency
      const { backToMainKeyboard } = await import("../utils/keyboards");

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...backToMainKeyboard(),
      });
      await ctx.answerCbQuery();
    } catch (err: any) {
      await ctx.editMessageText(
        `❌ Failed to fetch balance: ${err?.message ?? "unknown error"}`,
        {
          parse_mode: "Markdown",
        }
      );
      await ctx.answerCbQuery();
    }
  });
}
