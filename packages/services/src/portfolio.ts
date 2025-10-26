import { PublicKey } from '@solana/web3.js';
import { getBalances, getTokenBalances } from './solana';
import { previewTokenForSol } from './raydium';
import { getSolPriceUSD } from './price';

export interface TokenValue {
  symbol: string;
  mint: string;
  balance: number;
  decimals: number;
  valueInSol: number;
  valueInUsd: number;
}

export interface PortfolioValue {
  solBalance: number;
  solValueUsd: number;
  tokens: TokenValue[];
  totalTokenValueSol: number;
  totalTokenValueUsd: number;
  totalPortfolioSol: number;
  totalPortfolioUsd: number;
  solPriceUsd: number | null;
}

/**
 * Calculate the total portfolio value in SOL and USD
 */
export async function calculatePortfolioValue(
  publicKey: PublicKey
): Promise<PortfolioValue> {
  // Get SOL balance
  const balances = await getBalances(publicKey);
  const solBalance = Number(balances.nativeSol);

  // Get SOL price in USD
  const solPriceUsd = await getSolPriceUSD();

  // Get all token balances
  const tokenBalances = await getTokenBalances(publicKey.toBase58());

  // Calculate value for each token
  const tokens: TokenValue[] = [];
  let totalTokenValueSol = 0;

  for (const token of tokenBalances) {
    try {
      const tokenAmount = token.amount;

      // Skip tokens with zero balance
      if (tokenAmount === 0) {
        continue;
      }

      // Get token value in SOL using Raydium quote
      const quote = await previewTokenForSol({
        tokenMint: token.mint,
        tokenAmount,
      });

      const valueInSol = parseFloat(quote.outputAmount);
      const valueInUsd = solPriceUsd ? valueInSol * solPriceUsd : 0;

      tokens.push({
        symbol: token.symbol || 'Unknown',
        mint: token.mint,
        balance: tokenAmount,
        decimals: token.decimals,
        valueInSol,
        valueInUsd,
      });

      totalTokenValueSol += valueInSol;
    } catch (error: any) {
      console.error(
        `[Portfolio] Failed to get price for token ${token.symbol || token.mint}:`,
        error?.message
      );
      // If we can't get price, add with zero value
      tokens.push({
        symbol: token.symbol || 'Unknown',
        mint: token.mint,
        balance: token.amount,
        decimals: token.decimals,
        valueInSol: 0,
        valueInUsd: 0,
      });
    }
  }

  const totalTokenValueUsd = solPriceUsd ? totalTokenValueSol * solPriceUsd : 0;
  const totalPortfolioSol = solBalance + totalTokenValueSol;
  const totalPortfolioUsd = solPriceUsd ? totalPortfolioSol * solPriceUsd : 0;

  return {
    solBalance,
    solValueUsd: solPriceUsd ? solBalance * solPriceUsd : 0,
    tokens,
    totalTokenValueSol,
    totalTokenValueUsd,
    totalPortfolioSol,
    totalPortfolioUsd,
    solPriceUsd,
  };
}
