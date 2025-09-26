import { Telegraf } from "telegraf";

export function registerStart(bot: Telegraf) {
  bot.start((ctx) => {
    ctx.reply("Welcome! Use /wallet_create to create a custodial wallet, /wallet_balance to view balances, or /whoami to learn more.");
  });
}


