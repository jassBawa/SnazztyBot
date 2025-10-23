import { Telegraf } from "telegraf";
import { getOrCreateUserKeypair, getBalances, getTokenBalances } from "../services/solana";
import { getTelegramId } from "../utils/telegram";

export function registerWalletBalance(bot: Telegraf) {
  bot.command("wallet_balance", async (ctx) => {
    try {
      const telegramId = getTelegramId(ctx);
      const kp = await getOrCreateUserKeypair(telegramId);
      const balances = await getBalances(kp.publicKey);
      const tokenBalances = await getTokenBalances(kp.publicKey.toBase58());

      const native = Number(balances.nativeSol).toFixed(6);

      let message = `💰 *Wallet Balance*\n\n` +
        `📍 Address:\n\`${kp.publicKey.toBase58()}\`\n\n` +
        `💎 *Native Balance:*\n` +
        `• SOL: \`${native}\`\n`;

      // Add token balances
      if (tokenBalances.length > 0) {
        message += `\n🪙 *Token Balances:*\n`;
        tokenBalances.forEach((token) => {
          const amount = token.amount.toFixed(token.decimals);
          message += `• ${token.symbol}: \`${amount}\`\n`;
        });
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err: any) {
      await ctx.reply(`❌ Failed to fetch balance: ${err?.message ?? "unknown error"}`);
    }
  });
}


