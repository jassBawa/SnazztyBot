import { Telegraf } from "telegraf";
import "dotenv/config";

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  console.log("Bot Token not found");
  throw new Error("Bot token not found");
}

const bot = new Telegraf(botToken);

export default bot;
