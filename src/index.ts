import { message } from "telegraf/filters";
import bot from "./bot";
import { registerCommands } from "./commands";

// minimal generic handlers kept simple
bot.help((ctx) => ctx.reply("Use /wallet_create, /wallet_balance, /whoami"));
bot.on(message("sticker"), (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

// register modular commands
registerCommands(bot);

bot.launch(() => {
  console.log("Bot has been launched 🚀🚀🚀");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
