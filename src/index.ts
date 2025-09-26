import { message } from "telegraf/filters";
import bot from "./bot";
import { exampleNews } from "./services/news";
import { Markup } from "telegraf";
import { viewAllCommandsResponse } from "./bot/utils/responses";

bot.start((ctx) => {
  ctx.reply("Hello there");
});


bot.help((ctx) => {
  ctx.replyWithMarkdownV2(
    "I support the following commands",
    Markup.inlineKeyboard([
      Markup.button.callback("View all Commands", "commands"),
      Markup.button.callback("How we work", "docs"),
    ])
  );
});

bot.hears("hi", (ctx) => ctx.reply("Hey there"));
bot.hears("help", (ctx) => ctx.reply("Use /help to understand how i work\n"));

bot.command("whoareyou", (ctx) => {
  ctx.reply("I am a soon to be web3 bot");
});

bot.command("news", (ctx) => {
  const newsResponse = exampleNews(); // replace with the actual function you created in services/news.ts

  newsResponse.news.forEach((news) => {
    ctx.reply(`title: ${news.title}\ndescription: ${news.description}`);
  });
});

bot.action("commands", (ctx) => {
  ctx.answerCbQuery("You chose to view all commands");
  viewAllCommandsResponse(ctx);
});

bot

bot.launch(() => {
  console.log("Bot has been launched 🚀🚀🚀");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
