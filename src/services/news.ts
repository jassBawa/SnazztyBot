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
    return response.data || [];
  } catch (err) {
    console.error("Error fetching news:", err);
    return [];
  }
}

getNews();
