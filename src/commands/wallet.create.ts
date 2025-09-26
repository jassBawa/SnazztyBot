import { Telegraf } from "telegraf";
import { getPublicKeyForUser, ensureDbUserWithWallet } from "../services/solana";

function resolveDefaultChain() { return "solana" as const; }

function buildOwnerLocatorFromTelegram(ctx: any): string {
  const userId = ctx.from?.id ?? "unknown";
  return `telegram:${userId}`;
}

export function registerWalletCreate(bot: Telegraf) {
  bot.command("wallet_create", async (ctx) => {
    try {
      const ownerLocator = buildOwnerLocatorFromTelegram(ctx);
      resolveDefaultChain();
      const pubkey = getPublicKeyForUser(ownerLocator);
      await ensureDbUserWithWallet({
        telegramId: BigInt(ctx.from?.id ?? 0),
        username: ctx.from?.username ?? null,
        firstName: ctx.from?.first_name ?? null,
        lastName: ctx.from?.last_name ?? null,
        ownerLocator,
      });
      await ctx.reply(`Wallet (Solana)\naddress: ${pubkey.toBase58()}`);
    } catch (err: any) {
      await ctx.reply(`Failed to create wallet: ${err?.message ?? "unknown error"}`);
    }
  });
}


