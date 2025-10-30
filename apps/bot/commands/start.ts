import { Telegraf } from "telegraf";
import { getOrCreateUserKeypair, getBalances, getTokenBalances, getPublicKeyForUser, ensureDbUserWithWallet, claimAirdrop } from "@repo/services/solana";
import { getUserDataFromContext, getTelegramId } from "../utils/telegram";
import { mainMenuKeyboard, balanceKeyboard, backToMainKeyboard, sendInstructionsKeyboard } from "../utils/keyboards";

export function registerStart(bot: Telegraf) {
  bot.start(async (ctx) => {
    const userData = getUserDataFromContext(ctx);

    // Ensure user exists in DB with wallet
    await ensureDbUserWithWallet(userData);

    const pubkey = await getPublicKeyForUser(userData.telegramId);

    ctx.reply(
      `🚀 *Welcome to BlowUpBot!*\n\nYour Solana wallet is ready:\n\n` +
      `📍 Address:\n\`${pubkey.toBase58()}\`\n\n` +
      `Use the buttons below to get started:`,
      { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );
  });

  bot.action("ACTION_WALLET_BALANCE", async (ctx) => {
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

      await ctx.reply(message, { parse_mode: 'Markdown', ...balanceKeyboard() });
    } catch (err: any) {
      await ctx.reply(`❌ Failed to fetch balance: ${err?.message ?? "unknown error"}`);
    }
  });

  bot.action("ACTION_WALLET_SEND", async (ctx) => {
    await ctx.reply(
      `📤 *Send Tokens*\n\n` +
      `To send any token, use the command:\n` +
      `\`/wallet_send <token> <recipient_address> <amount>\`\n\n` +
      `Examples:\n` +
      `\`/wallet_send USDC 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 10.5\`\n` +
      `\`/wallet_send BONK 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000\`\n\n` +
      `Supported tokens: USDC, USDT, BONK, RAY, or any mint address`,
      { parse_mode: 'Markdown', ...sendInstructionsKeyboard() }
    );
  });

  bot.action("ACTION_ABOUT", async (ctx) => {
    await ctx.reply(
      `ℹ️ *About BlowUpBot*\n\n` +
      `I am your Solana wallet assistant! 🤖\n\n` +
      `✨ *Features:*\n` +
      `• Create & manage Solana wallets\n` +
      `• Check balances (SOL & tokens)\n` +
      `• Send token transfers\n` +
      `• Secure encrypted storage\n\n` +
      `Built with ❤️ for the Solana ecosystem`,
      { parse_mode: 'Markdown', ...backToMainKeyboard() }
    );
  });

  bot.action("ACTION_AIRDROP", async (ctx) => {
    await ctx.answerCbQuery();
    try {
      const telegramId = getTelegramId(ctx);
      const kp = await getOrCreateUserKeypair(telegramId);

      const {explorerLink, signature} = await claimAirdrop(kp);

      await ctx.reply(`✅ Airdrop claimed successfully`, { parse_mode: 'Markdown', ...balanceKeyboard() });
      await ctx.reply(`🔗 [View Transaction](${explorerLink})\n\n` +
        `Transaction ID: \`${signature}\``, { parse_mode: 'Markdown' });
    } catch (err: any) {
      await ctx.reply(`❌ Failed to claim airdrop: ${err?.message ?? "unknown error"}`);
    } finally {
      await ctx.answerCbQuery();
    }

  });

  bot.action("ACTION_MAIN_MENU", async (ctx) => {
    const telegramId = getTelegramId(ctx);
    const pubkey = await getPublicKeyForUser(telegramId);

    ctx.reply(
      `🏠 *Main Menu*\n\nYour Solana wallet:\n\n` +
      `📍 Address:\n\`${pubkey.toBase58()}\`\n\n` +
      `Choose an action:`,
      { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );
  });
}


