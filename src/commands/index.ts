import { Telegraf } from "telegraf";
import { registerStart } from "./start";
import { registerWhoAmI } from "./whoami";
import { registerWalletCreate } from "./wallet.create";
import { registerWalletBalance } from "./wallet.balance";
import { registerNews } from "./news";
import { registerWalletSend } from "./wallet.send";

export function registerCommands(bot: Telegraf) {
  registerStart(bot);
  registerWhoAmI(bot);
  registerWalletCreate(bot);
  registerWalletBalance(bot);
  registerNews(bot);
  registerWalletSend(bot);
}


