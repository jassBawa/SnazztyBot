import { Telegraf } from "telegraf";
import { registerStart } from "./start";
import { registerAbout } from "./about";
import { registerWalletCreate } from "./wallet.create";
import { registerWalletBalance } from "./wallet.balance";
import { registerWalletSend } from "./wallet.send";
import { registerSwapCommands } from "./swap";
import { registerQuickCommands } from "./quick";
import { registerDcaCommands } from "./dca";
import { registerPriceCommand } from "./price";
import { registerPortfolio } from "./portfolio";

export function registerCommands(bot: Telegraf) {
  registerStart(bot);
  registerAbout(bot);
  registerWalletCreate(bot);
  registerWalletBalance(bot);
  registerWalletSend(bot);
  registerSwapCommands(bot);
  registerQuickCommands(bot);
  registerDcaCommands(bot);
  registerPriceCommand(bot);
  registerPortfolio(bot);
}


