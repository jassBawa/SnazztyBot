import { Telegraf } from "telegraf";
import { getPublicKeyForUser, ensureDbUserWithWallet } from "../services/solana";
import { getUserDataFromContext } from "../utils/telegram";

export function registerWalletCreate(bot: Telegraf) {
  bot.command("wallet_create", async (ctx) => {
    try {
      const userData = getUserDataFromContext(ctx);

      // Ensure user exists in DB with wallet
      await ensureDbUserWithWallet(userData);

      const pubkey = await getPublicKeyForUser(userData.telegramId);

      await ctx.reply(
        `🎉 *Wallet Created!*\n\n` +
        `📍 Address:\n\`${pubkey.toBase58()}\`\n\n` +
        `Your Solana wallet is ready to use! 🚀`,
        { parse_mode: 'Markdown' }
      );
    } catch (err: any) {
      await ctx.reply(`❌ Failed to create wallet: ${err?.message ?? "unknown error"}`);
    }
  });
}


