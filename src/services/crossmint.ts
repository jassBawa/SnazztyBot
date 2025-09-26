import { CrossmintWallets, createCrossmint } from "@crossmint/wallets-sdk";
import type { Chain } from "@crossmint/wallets-sdk/dist/chains/chains";

type CreateWalletParams = {
  chain: Chain;
  ownerLocator: string;
};

export class CrossmintWalletService {
  private static instance: CrossmintWalletService | null = null;
  private wallets: CrossmintWallets;

  private constructor() {
    const apiKey = process.env.CROSSMINT_API_KEY;
    const projectId = process.env.CROSSMINT_PROJECT_ID;
    const environment = process.env.CROSSMINT_ENVIRONMENT ?? "staging";

    if (!apiKey || !projectId) {
      throw new Error("Missing CROSSMINT_API_KEY or CROSSMINT_PROJECT_ID");
    }

    const crossmint = createCrossmint({
      apiKey,
      projectId,
      environment,
    } as any);

    this.wallets = CrossmintWallets.from(crossmint);
  }

  static getInstance(): CrossmintWalletService {
    if (!this.instance) {
      this.instance = new CrossmintWalletService();
    }
    return this.instance;
  }

  async createWallet(params: CreateWalletParams) {
    const wallet = await this.wallets.createWallet({
      chain: params.chain,
      signer: { type: "api-key" },
      owner: params.ownerLocator,
    } as any);
    return wallet;
  }

  async getWallet(locator: string, chain: Chain) {
    const wallet = await this.wallets.getWallet(locator, {
      chain,
      signer: { type: "api-key" },
    } as any);
    return wallet;
  }
}


