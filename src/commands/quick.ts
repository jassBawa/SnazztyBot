import { Telegraf } from "telegraf";
import { getOrCreateUserKeypair, getBalances, getTokenBalances } from "../services/solana";
import { getTelegramId } from "../utils/telegram";
import { backToMainKeyboard } from "../utils/keyboards";

/**
 * Register quick/shortcut commands for better UX
 */
export function registerQuickCommands(bot: Telegraf) {
  // Quick balance check - alias for wallet_balance
  bot.command(["balance", "b"], async (ctx) => {
    try {
      const telegramId = getTelegramId(ctx);
      const kp = await getOrCreateUserKeypair(telegramId);
      const balances = await getBalances(kp.publicKey);
      const tokenBalances = await getTokenBalances(kp.publicKey.toBase58());

      const native = Number(balances.nativeSol).toFixed(6);

      let message = `💰 *Quick Balance*\n\n` +
        `💎 SOL: \`${native}\`\n`;

      // Add token balances (max 5 for quick view)
      if (tokenBalances.length > 0) {
        message += `\n🪙 *Tokens:*\n`;
        const tokensToShow = tokenBalances.slice(0, 5);
        tokensToShow.forEach((token) => {
          const amount = token.amount.toFixed(Math.min(token.decimals, 6));
          message += `• ${token.symbol}: \`${amount}\`\n`;
        });

        if (tokenBalances.length > 5) {
          message += `\n_...and ${tokenBalances.length - 5} more tokens_\n`;
        }
      }


      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err: any) {
      await ctx.reply(`❌ Failed to fetch balance: ${err?.message ?? "unknown error"}`);
    }
  });

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

      message += `\nUse /balance for details`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (err: any) {
      await ctx.reply(`❌ Refresh failed: ${err?.message ?? "unknown error"}`);
    }
  });

}
