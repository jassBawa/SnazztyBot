import { Telegraf } from "telegraf";
import { registerStart } from "./start.js";
import { registerAbout } from "./about.js";
import { registerWalletCreate } from "./wallet.create.js";
import { registerWalletBalance } from "./wallet.balance.js";
import { registerWalletSend } from "./wallet.send.js";
import { registerSwapCommands } from "./swap.js";
import { registerQuickCommands } from "./quick.js";
import { registerDcaCommands } from "./dca/index.js";
import { registerPriceCommand } from "./price.js";
import { registerPortfolio } from "./portfolio.js";
import { registerTokenCommands } from "./token.js";

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
  registerTokenCommands(bot);
}
