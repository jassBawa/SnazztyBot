import { Telegraf } from "telegraf";

export function registerWhoAmI(bot: Telegraf) {
  bot.command("whoami", (ctx) => {
    ctx.reply("I am SnazztyBot, your web3 assistant using Crossmint custodial wallets.");
  });
}


