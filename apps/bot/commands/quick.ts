import { Telegraf } from "telegraf";
import { getOrCreateUserKeypair, getBalances, getTokenBalances } from "@repo/services/solana";
import { getTelegramId } from "../utils/telegram.js";
import { backToMainKeyboard } from "../utils/keyboards.js";

/**
 * Register quick/shortcut commands for better UX
 */
export function registerQuickCommands(bot: Telegraf) {
  // /balance command removed - use the wallet button in main menu instead

  // Show wallet address with QR-friendly format
  bot.command(["address", "addr", "wallet"], async (ctx) => {
    try {
      const telegramId = getTelegramId(ctx);
      const kp = await getOrCreateUserKeypair(telegramId);
      const address = kp.publicKey.toBase58();

      await ctx.reply(
        `📍 *Your Wallet Address*\n\n` +
          `\`${address}\`\n\n` +
          `Tap to copy, or scan QR code below:`,
        { parse_mode: "Markdown" }
      );

      // Send QR code
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${address}`;
      console.log(qrUrl)
      await ctx.replyWithPhoto({ url: qrUrl }, {
        caption: `✅ Send SOL or tokens to this address`,
      });
    } catch (err: any) {
      await ctx.reply(`❌ Failed to fetch address: ${err?.message ?? "unknown error"}`);
    }
  });

  // Refresh - re-fetch all data
  bot.command(["refresh", "r"], async (ctx) => {
    try {
      await ctx.reply("🔄 Refreshing your data...");

      const telegramId = getTelegramId(ctx);
      const kp = await getOrCreateUserKeypair(telegramId);
      const balances = await getBalances(kp.publicKey);
      const tokenBalances = await getTokenBalances(kp.publicKey.toBase58());

      const native = Number(balances.nativeSol).toFixed(6);

      let message = `✅ *Data Refreshed*\n\n` +
        `💎 SOL: \`${native}\`\n`;

      if (tokenBalances.length > 0) {
        message += `🪙 Tokens: ${tokenBalances.length}\n`;
      }

      message += `\nUse the 💰 Wallet Balance button in the main menu for full details`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err: any) {
      await ctx.reply(`❌ Refresh failed: ${err?.message ?? "unknown error"}`);
    }
  });

}
