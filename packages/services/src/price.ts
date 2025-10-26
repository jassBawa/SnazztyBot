/**
 * Price Service - Fetch token prices from external APIs
 */

interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

/**
 * Fetch SOL price in USD from Binance API
 * @returns SOL price in USD or null if fetch fails
 */
export async function getSolPriceUSD(): Promise<number | null> {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');

    if (!response.ok) {
      console.error('[Price] Binance API error:', response.status);
      return null;
    }

    const data = await response.json() as BinanceTickerResponse;
    const price = parseFloat(data.price);

    if (isNaN(price)) {
      console.error('[Price] Invalid price from Binance:', data.price);
      return null;
    }

    return price;
  } catch (error) {
    console.error('[Price] Error fetching SOL price:', error);
    return null;
  }
}

/**
 * Format price in USD with proper decimals
 */
export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Calculate USD value of SOL amount
 * @param solAmount Amount of SOL
 * @returns USD value or null if price unavailable
 */
export async function calculateSolValueUSD(solAmount: number): Promise<number | null> {
  const solPrice = await getSolPriceUSD();
  if (solPrice === null) return null;

  return solAmount * solPrice;
}
