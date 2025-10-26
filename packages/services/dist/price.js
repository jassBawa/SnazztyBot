"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/price.ts
var price_exports = {};
__export(price_exports, {
  calculateSolValueUSD: () => calculateSolValueUSD,
  formatUSD: () => formatUSD,
  getSolPriceUSD: () => getSolPriceUSD
});
module.exports = __toCommonJS(price_exports);
async function getSolPriceUSD() {
  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
    if (!response.ok) {
      console.error("[Price] Binance API error:", response.status);
      return null;
    }
    const data = await response.json();
    const price = parseFloat(data.price);
    if (isNaN(price)) {
      console.error("[Price] Invalid price from Binance:", data.price);
      return null;
    }
    return price;
  } catch (error) {
    console.error("[Price] Error fetching SOL price:", error);
    return null;
  }
}
function formatUSD(amount) {
  return `$${amount.toFixed(2)}`;
}
async function calculateSolValueUSD(solAmount) {
  const solPrice = await getSolPriceUSD();
  if (solPrice === null) return null;
  return solAmount * solPrice;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateSolValueUSD,
  formatUSD,
  getSolPriceUSD
});
