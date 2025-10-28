/**
 * Price Service - Fetch token prices from external APIs
 */

interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

interface BinanceTickerResponse {
  price: string;
}

interface CoinGeckoResponse {
  solana: { usd: number };
}

/**
 * Fetch SOL price in USD from Binance API
 * @returns SOL price in USD or null if fetch fails
 */

export async function getSolPriceUSD(): Promise<number | null> {
  // === 1) Binance Primary Source ===
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
    if (response.ok) {
      const data = await response.json() as BinanceTickerResponse;
      const price = parseFloat(data.price);
      if (!isNaN(price)) {
        console.log('[Price] Using Binance price:', price);
        return price;
      }
    } else {
      console.error('[Price] Binance API error:', response.status);
    }
  } catch (error) {
    console.error('[Price] Binance fetch error:', error);
  }

  // === 2) Binance US Fallback (if applicable) ===
  try {
    const response = await fetch('https://api.binance.us/api/v3/ticker/price?symbol=SOLUSD');
    if (response.ok) {
      const data = await response.json() as BinanceTickerResponse;
      const price = parseFloat(data.price);
      if (!isNaN(price)) {
        console.log('[Price] Using Binance US price:', price);
        return price;
      }
    } else {
      console.error('[Price] Binance US API error:', response.status);
    }
  } catch (error) {
    console.error('[Price] Binance US fetch error:', error);
  }

  // === 3) CoinGecko Final Fallback ===
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    if (response.ok) {
      const data = await response.json() as CoinGeckoResponse;
      const price = data.solana?.usd;
      if (typeof price === 'number' && !isNaN(price)) {
        console.log('[Price] Using CoinGecko price:', price);
        return price;
      }
    } else {
      console.error('[Price] CoinGecko API error:', response.status);
    }
  } catch (error) {
    console.error('[Price] CoinGecko fetch error:', error);
  }

  // === If All Fail ===
  console.error('[Price] All price sources failed');
  return null;
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
