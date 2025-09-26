import { Telegraf } from "telegraf";
import { getOrCreateUserKeypair, getBalances, sendUsdc } from "../services/solana";

function resolveDefaultChain() { return "solana" as const; }

function buildOwnerLocatorFromTelegram(ctx: any): string {
  const userId = ctx.from?.id ?? "unknown";
  return `telegram:${userId}`;
}

export function registerWalletSend(bot: Telegraf) {
  bot.command("wallet_send", async (ctx) => {
    try {
      const parts = (ctx.message as any).text.trim().split(/\s+/);
      // expecting: /wallet_send <recipient> <amount>
      if (parts.length < 3) {
        await ctx.reply("Usage: /wallet_send <recipient> <amount>");
        return;
      }

      const recipient = parts[1];
      const amount = parts[2];
      const ownerLocator = buildOwnerLocatorFromTelegram(ctx);
      resolveDefaultChain();
      const kp = getOrCreateUserKeypair(ownerLocator);
      const balances = await getBalances(kp.publicKey);
      await ctx.reply(
        `💰 *Current Balance*\n\n` +
        `• SOL: \`${Number(balances.nativeSol).toFixed(6)}\`\n\n` +
        `Processing transfer...`,
        { parse_mode: 'Markdown' }
      );

      const tx = await sendUsdc(ownerLocator, recipient, amount);
      await ctx.reply(
        `✅ *Transfer Successful!*\n\n` +
        `📤 Sent: \`${amount}\` USDC\n` +
        `📍 To: \`${recipient}\`\n\n` +
        `🔗 [View Transaction](${tx.explorerLink})`,
        { parse_mode: 'Markdown' }
      );
    } catch (err: any) {
      await ctx.reply(`Send failed: ${err?.message ?? "unknown error"}`);
    }
  });
}


