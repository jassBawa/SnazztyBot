import { Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { getOrCreateUserKeypair, getBalances, getTokenBalances } from "../services/solana";
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
      [Markup.button.callback("💰 Wallet Balance", "ACTION_WALLET_BALANCE")],
      [Markup.button.callback("📤 Send USDC", "ACTION_WALLET_SEND")],
      [Markup.button.callback("ℹ️ Who am I", "ACTION_WHOAMI")],
      [Markup.button.callback("🔄 Refresh", "ACTION_REFRESH")],
    ]);
    ctx.reply(
      `🚀 *Welcome to SnazztyBot!*\n\nYour Solana wallet is ready:\n\n` +
      `📍 Address:\n\`${pubkey.toBase58()}\`\n\n` +
      `Use the buttons below to get started:`,
      { parse_mode: 'Markdown', ...inlineKb }
    );
  });

  bot.action("ACTION_WALLET_BALANCE", async (ctx) => {
    try {
      const ownerLocator = buildOwnerLocatorFromTelegram(ctx);
      const kp = getOrCreateUserKeypair(ownerLocator);
      const balances = await getBalances(kp.publicKey);
      const tokenBalances = await getTokenBalances(kp.publicKey.toBase58());

      const native = Number(balances.nativeSol).toFixed(6);
      
      let message = `💰 *Wallet Balance*\n\n` +
        `📍 Address:\n\`${kp.publicKey.toBase58()}\`\n\n` +
        `💎 *Native Balance:*\n` +
        `• SOL: \`${native}\`\n`;

      // Add token balances at the bottom
      if (tokenBalances.length > 0) {
        message += `\n🪙 *Token Balances:*\n`;
        tokenBalances.forEach((token) => {
          const amount = token.amount.toFixed(token.decimals);
          message += `• ${token.symbol}: \`${amount}\`\n`;
        });
      }

      const refreshKb = Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Refresh Balance", "ACTION_WALLET_BALANCE")],
        [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
      ]);

      await ctx.reply(message, { parse_mode: 'Markdown', ...refreshKb });
    } catch (err: any) {
      await ctx.reply(`❌ Failed to fetch balance: ${err?.message ?? "unknown error"}`);
    }
  });

  bot.action("ACTION_WALLET_SEND", async (ctx) => {
    const sendKb = Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
    ]);
    await ctx.reply(
      `📤 *Send USDC*\n\n` +
      `To send USDC, use the command:\n` +
      `\`/wallet_send <recipient_address> <amount>\`\n\n` +
      `Example:\n` +
      `\`/wallet_send 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 10.5\``,
      { parse_mode: 'Markdown', ...sendKb }
    );
  });

  bot.action("ACTION_WHOAMI", async (ctx) => {
    const whoamiKb = Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
    ]);
    await ctx.reply(
      `ℹ️ *About SnazztyBot*\n\n` +
      `I am your Solana wallet assistant! 🤖\n\n` +
      `✨ *Features:*\n` +
      `• Create & manage Solana wallets\n` +
      `• Check balances (SOL, USDC, tokens)\n` +
      `• Send USDC transfers\n` +
      `• View transaction history\n\n` +
      `Built with ❤️ for the Solana ecosystem`,
      { parse_mode: 'Markdown', ...whoamiKb }
    );
  });

  bot.action("ACTION_REFRESH", async (ctx) => {
    const ownerLocator = buildOwnerLocatorFromTelegram(ctx);
    const pubkey = getPublicKeyForUser(ownerLocator);
    const inlineKb = Markup.inlineKeyboard([
      [Markup.button.callback("💰 Wallet Balance", "ACTION_WALLET_BALANCE")],
      [Markup.button.callback("📤 Send USDC", "ACTION_WALLET_SEND")],
      [Markup.button.callback("ℹ️ Who am I", "ACTION_WHOAMI")],
      [Markup.button.callback("🔄 Refresh", "ACTION_REFRESH")],
    ]);
    ctx.reply(
      `🔄 *Refreshed!*\n\nYour Solana wallet:\n\n` +
      `📍 Address:\n\`${pubkey.toBase58()}\`\n\n` +
      `Use the buttons below:`,
      { parse_mode: 'Markdown', ...inlineKb }
    );
  });

  bot.action("ACTION_MAIN_MENU", async (ctx) => {
    const ownerLocator = buildOwnerLocatorFromTelegram(ctx);
    const pubkey = getPublicKeyForUser(ownerLocator);
    const inlineKb = Markup.inlineKeyboard([
      [Markup.button.callback("💰 Wallet Balance", "ACTION_WALLET_BALANCE")],
      [Markup.button.callback("📤 Send USDC", "ACTION_WALLET_SEND")],
      [Markup.button.callback("ℹ️ Who am I", "ACTION_WHOAMI")],
      [Markup.button.callback("🔄 Refresh", "ACTION_REFRESH")],
    ]);
    ctx.reply(
      `🏠 *Main Menu*\n\nYour Solana wallet:\n\n` +
      `📍 Address:\n\`${pubkey.toBase58()}\`\n\n` +
      `Choose an action:`,
      { parse_mode: 'Markdown', ...inlineKb }
    );
  });
}


