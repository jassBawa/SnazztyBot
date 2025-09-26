import { Telegraf } from "telegraf";
import { CrossmintWalletService } from "../services/crossmint";
import type { Chain } from "@crossmint/wallets-sdk/dist/chains/chains";

function resolveDefaultChain(): Chain {
  const chain = (process.env.CROSSMINT_DEFAULT_CHAIN ?? "solana").trim();
  return chain as Chain;
}

function buildOwnerLocatorFromTelegram(ctx: any): string {
  const userId = ctx.from?.id ?? "unknown";
  return `telegram:${userId}`;
}

export function registerWalletCreate(bot: Telegraf) {
  bot.command("wallet_create", async (ctx) => {
    try {
      const chain = resolveDefaultChain();
      const ownerLocator = buildOwnerLocatorFromTelegram(ctx);
      const service = CrossmintWalletService.getInstance();
      const wallet = await service.createWallet({ chain, ownerLocator });

      await ctx.reply(
        `Wallet created on ${wallet.chain}:\naddress: ${wallet.address}`
      );
    } catch (err: any) {
      await ctx.reply(`Failed to create wallet: ${err?.message ?? "unknown error"}`);
    }
  });
}


