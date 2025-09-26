import { Telegraf } from "telegraf";
import { getOrCreateUserKeypair, getBalances } from "../services/solana";


function buildOwnerLocatorFromTelegram(ctx: any): string {
  const userId = ctx.from?.id ?? "unknown";
  return `telegram:${userId}`;
}

export function registerWalletBalance(bot: Telegraf) {
  bot.command("wallet_balance", async (ctx) => {
    try {
      const ownerLocator = buildOwnerLocatorFromTelegram(ctx);
      const kp = getOrCreateUserKeypair(ownerLocator);
      const balances = await getBalances(kp.publicKey);

      const native = Number(balances.nativeSol).toFixed(6);
      const usdc = Number(balances.usdc).toFixed(2);
      const lines = [
        `SOL: ${native}`,
        `USDC: ${usdc}`,
      ];

      await ctx.reply(`Address: ${kp.publicKey.toBase58()}\n` + lines.join("\n"));
    } catch (err: any) {
      await ctx.reply(`Failed to fetch balance: ${err?.message ?? "unknown error"}`);
    }
  });
}


