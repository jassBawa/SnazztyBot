import { Telegraf } from "telegraf";

export function registerAbout(bot: Telegraf) {
  bot.command("about", (ctx) => {
    ctx.reply("I am SnazztyBot, your web3 assistant using Crossmint custodial wallets.");
  });
}


