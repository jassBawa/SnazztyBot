import { message } from "telegraf/filters";
import bot from "./bot";
import { getNews } from "./services/news";

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

bot.command("news", async (ctx) => {
  const newsResponse = await getNews();

  if(newsResponse.length === 0){
    ctx.reply("No news available at the moment.");
    return;
  }

  newsResponse.news.forEach((news: any) => {
    ctx.reply(`title: ${news.title}\ndescription: ${news.description}`);
  });
});

bot.launch(() => {
  console.log("Bot has been launched 🚀🚀🚀");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
