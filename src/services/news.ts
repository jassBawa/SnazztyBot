import { AINews } from "@chaingpt/ainews";
import "dotenv/config";

const ainews = new AINews({
  apiKey: process.env.CHAINGPT_API_KEY!,
});

export async function getNews() {
  try {
    const response = await ainews.getNews({
      limit: 10,
      subCategoryId: [22],
      tokenId: [85],
    });
    console.log(response.data);

    if (!response.data) {
      throw new Error("No news fetched");
    }

    const newsArray: { title: string; description: string; link: string }[] =
      [];

    response.data.forEach((news: any) => {
      const article_title = (news.title as unknown as string)
        .split(" ")
        .join("+");
      // console.log(article_title);

      const link = `https://www.google.com/search?q=${article_title}&ie=UTF-8`;
      newsArray.push({
        title: news.title,
        description: news.description,
        link,
      });
    });

    return newsArray;
  } catch (err) {
    console.error("Error fetching news:", err);
    return [];
  }
}