import { Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { getOrCreateUserKeypair, getBalances } from "../services/solana";
import { getPublicKeyForUser, ensureDbUserWithWallet } from "../services/solana";

function buildOwnerLocatorFromTelegram(ctx: any): string {
  const userId = ctx.from?.id ?? "unknown";
  return `telegram:${userId}`;
}

export function registerStart(bot: Telegraf) {
  bot.start((ctx) => {
    const ownerLocator = buildOwnerLocatorFromTelegram(ctx);
    const pubkey = getPublicKeyForUser(ownerLocator);
    ensureDbUserWithWallet({
      telegramId: BigInt(ctx.from?.id ?? 0),
      username: ctx.from?.username ?? null,
      firstName: ctx.from?.first_name ?? null,
      lastName: ctx.from?.last_name ?? null,
      ownerLocator,
    }).catch(() => {});
    const inlineKb = Markup.inlineKeyboard([
      [Markup.button.callback("Wallet Balance", "ACTION_WALLET_BALANCE")],
      [Markup.button.callback("Send USDC", "ACTION_WALLET_SEND")],
      [Markup.button.callback("Who am I", "ACTION_WHOAMI")],
    ]);
    ctx.reply(
      `Welcome! Your Solana wallet is ready.\naddress: ${pubkey.toBase58()}\n\nUse the buttons below to get started.`,
      inlineKb
    );
  });

  bot.action("ACTION_WALLET_BALANCE", async (ctx) => {
    try {
      const ownerLocator = buildOwnerLocatorFromTelegram(ctx);
      const kp = getOrCreateUserKeypair(ownerLocator);
      const balances = await getBalances(kp.publicKey);
      const native = Number(balances.nativeSol).toFixed(6);
      const usdc = Number(balances.usdc).toFixed(2);
      await ctx.reply(`Address: ${kp.publicKey.toBase58()}\nSOL: ${native}\nUSDC: ${usdc}`);
    } catch (err: any) {
      await ctx.reply(`Failed to fetch balance: ${err?.message ?? "unknown error"}`);
    }
  });

  bot.action("ACTION_WALLET_SEND", async (ctx) => {
    await ctx.reply("Use /wallet_send <recipient> <amount>");
  });

  bot.action("ACTION_WHOAMI", async (ctx) => {
    await ctx.reply("I am SnazztyBot, your Solana assistant.");
  });
}


