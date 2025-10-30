import { Telegraf } from "telegraf";

export function registerAbout(bot: Telegraf) {
  bot.command("about", (ctx) => {
    ctx.reply("I am BlowUpBot, your web3 assistant using BlowUp wallets.");
  });
}


