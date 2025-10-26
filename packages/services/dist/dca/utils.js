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

// src/dca/utils.ts
var utils_exports = {};
__export(utils_exports, {
  calculateNextExecutionTime: () => calculateNextExecutionTime,
  formatSmallestUnit: () => formatSmallestUnit,
  fromSmallestUnit: () => fromSmallestUnit,
  getFrequencyDisplay: () => getFrequencyDisplay,
  getStatusEmoji: () => getStatusEmoji,
  safeEditOrReply: () => safeEditOrReply,
  toSmallestUnit: () => toSmallestUnit
});
module.exports = __toCommonJS(utils_exports);
function calculateNextExecutionTime(frequency) {
  const now = /* @__PURE__ */ new Date();
  const intervals = {
    TEST: 60 * 1e3,
    // 1 minute
    HOURLY: 60 * 60 * 1e3,
    // 1 hour
    DAILY: 24 * 60 * 60 * 1e3,
    // 1 day
    WEEKLY: 7 * 24 * 60 * 60 * 1e3,
    // 7 days
    MONTHLY: 30 * 24 * 60 * 60 * 1e3
    // 30 days (approximate)
  };
  const interval = intervals[frequency] || intervals.DAILY;
  return new Date(now.getTime() + interval);
}
function getFrequencyDisplay(frequency) {
  const displays = {
    TEST: "Every 1 minute (Test mode)",
    HOURLY: "Every hour",
    DAILY: "Every day",
    WEEKLY: "Every week",
    MONTHLY: "Every month"
  };
  return displays[frequency] || frequency;
}
async function safeEditOrReply(ctx, message, options = {}) {
  try {
    await ctx.editMessageText(message, options);
  } catch {
    await ctx.reply(message, options);
  }
}
function getStatusEmoji(status) {
  const statusEmojiMap = {
    ACTIVE: "\u{1F7E2}",
    PAUSED: "\u23F8",
    CANCELLED: "\u274C",
    COMPLETED: "\u2705"
  };
  return statusEmojiMap[status] || "\u26AA";
}
function toSmallestUnit(amount, decimals) {
  const amountStr = amount.toString();
  const [whole, fraction = ""] = amountStr.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  const smallestUnitStr = whole + paddedFraction;
  return BigInt(smallestUnitStr);
}
function fromSmallestUnit(smallestUnit, decimals) {
  const divisor = 10 ** decimals;
  return Number(smallestUnit) / divisor;
}
function formatSmallestUnit(smallestUnit, decimals, maxDecimals = 6) {
  const amount = fromSmallestUnit(smallestUnit, decimals);
  return amount.toFixed(maxDecimals).replace(/\.?0+$/, "");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateNextExecutionTime,
  formatSmallestUnit,
  fromSmallestUnit,
  getFrequencyDisplay,
  getStatusEmoji,
  safeEditOrReply,
  toSmallestUnit
});
