import { message } from "telegraf/filters";
import bot from "./bot";
import { exampleNews } from "./services/news";

bot.start((ctx) => {
  ctx.reply("Hello there");
});
bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.on(message("sticker"), (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

bot.command("commands", (ctx) => {});

bot.command("whoami", (ctx) => {
  ctx.reply("I am a soon to be web3 bot");
});

bot.command("news", (ctx) => {
  const newsResponse = exampleNews(); // replace with the actual function you created in services/news.ts

  newsResponse.news.forEach((news) => {
    ctx.reply(`title: ${news.title}\ndescription: ${news.description}`);
  });
});

bot.launch(() => {
  console.log("Bot has been launched 🚀🚀🚀");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
