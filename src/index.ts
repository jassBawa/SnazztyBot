import { message } from "telegraf/filters";
import bot from "./bot";
import { Markup } from "telegraf";
import { viewAllCommandsResponse, sendNewsList } from "./bot/utils/responses";
import { getNews } from "./services/news";

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
bot.hears("help", (ctx) => ctx.reply("Use /help to see what i can do\n"));

bot.command("whoareyou", (ctx) => {
  ctx.reply("I am a soon to be web3 bot");
});

bot.command("news", async (ctx) => {
  // const newsResponse = await getNews();
  
  // ctx.react("👨‍💻");
  // if (newsResponse.length === 0) {
  //   ctx.reply("No news available at the moment.");
  //   return;
  // }

  // await sendNewsList(ctx, newsResponse, {
  //   heading: "Today’s Top Crypto Headlines",
  //   chunkSize: 5,
  //   maxDescriptionLen: 280,
  // });

  ctx.react("😴");
  ctx.reply("Credit nahi hai bhai surry.");
});

bot.action("commands", (ctx) => {
  ctx.answerCbQuery("You chose to view all commands");
  viewAllCommandsResponse(ctx);
});

bot.command("commands", (ctx) => {
  viewAllCommandsResponse(ctx);
});

bot.launch(() => {
  console.log("Bot has been launched 🚀🚀🚀");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
