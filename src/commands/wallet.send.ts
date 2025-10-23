import { Telegraf } from "telegraf";
import { getOrCreateUserKeypair, getBalances, sendToken } from "../services/solana";
import { getTelegramId } from "../utils/telegram";

export function registerWalletSend(bot: Telegraf) {
  bot.command("wallet_send", async (ctx) => {
    try {
      const parts = (ctx.message as any).text.trim().split(/\s+/);
      // expecting: /wallet_send <token> <recipient> <amount>
      if (parts.length < 4) {
        await ctx.reply(
          "Usage: /wallet_send <token> <recipient> <amount>\n\n" +
          "Example: /wallet_send USDC 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 10.5"
        );
        return;
      }

      const token = parts[1];
      const recipient = parts[2];
      const amount = parts[3];
      const telegramId = getTelegramId(ctx);

      // Get current balance
      const kp = await getOrCreateUserKeypair(telegramId);
      const balances = await getBalances(kp.publicKey);

      await ctx.reply(
        `💰 *Current Balance*\n\n` +
        `• SOL: \`${Number(balances.nativeSol).toFixed(6)}\`\n\n` +
        `Processing ${token} transfer...`,
        { parse_mode: 'Markdown' }
      );

      // Send the token
      const tx = await sendToken(telegramId, recipient, token, amount);

      await ctx.reply(
        `✅ *Transfer Successful!*\n\n` +
        `📤 Sent: \`${amount}\` ${token}\n` +
        `📍 To: \`${recipient}\`\n\n` +
        `🔗 [View Transaction](${tx.explorerLink})`,
        { parse_mode: 'Markdown' }
      );
    } catch (err: any) {
      await ctx.reply(`❌ Send failed: ${err?.message ?? "unknown error"}`);
    }
  });
}


