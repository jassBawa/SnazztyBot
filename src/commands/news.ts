import { Telegraf } from "telegraf";
import { getNews } from "../services/news";

export function registerNews(bot: Telegraf) {
  bot.command("news", async (ctx: any) => {
    try {
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
    } catch (err: any) {
      ctx.reply(`Failed to fetch news: ${err?.message ?? "unknown error"}`);
    }
  });
}
