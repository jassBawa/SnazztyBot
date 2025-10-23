import { Telegraf } from "telegraf";
import { registerStart } from "./start";
import { registerWhoAmI } from "./whoami";
import { registerWalletCreate } from "./wallet.create";
import { registerWalletBalance } from "./wallet.balance";
import { registerWalletSend } from "./wallet.send";
import { registerSwapCommands } from "./swap";

export function registerCommands(bot: Telegraf) {
  registerStart(bot);
  registerWhoAmI(bot);
  registerWalletCreate(bot);
  registerWalletBalance(bot);
  registerWalletSend(bot);
  registerSwapCommands(bot);
}


