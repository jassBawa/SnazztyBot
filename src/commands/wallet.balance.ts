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

export function registerWalletBalance(bot: Telegraf) {
  bot.command("wallet_balance", async (ctx) => {
    try {
      const chain = resolveDefaultChain();
      const ownerLocator = buildOwnerLocatorFromTelegram(ctx);
      const service = CrossmintWalletService.getInstance();
      const wallet = await service.getWallet(ownerLocator, chain);
      const balances = await wallet.balances();

      const lines = [
        `native: ${balances.nativeToken.amount} ${balances.nativeToken.symbol}`,
        `usdc: ${balances.usdc.amount} USDC`,
        ...balances.tokens.map(
          (t) => `${t.symbol}: ${t.amount}${t.contractAddress ? ` (${t.contractAddress})` : ""}`
        ),
      ];

      await ctx.reply(`Address: ${wallet.address}\n` + lines.join("\n"));
    } catch (err: any) {
      await ctx.reply(`Failed to fetch balance: ${err?.message ?? "unknown error"}`);
    }
  });
}


