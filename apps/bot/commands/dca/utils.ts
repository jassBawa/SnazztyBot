/**
 * DCA Utility Functions
 */

import { DcaFrequency } from "./types.js";

/**
 * Calculate the next execution time based on frequency
 * @param frequency - The DCA execution frequency
 * @returns Date object representing the next execution time
 */
export function calculateNextExecutionTime(frequency: string): Date {
  const now = new Date();
  const intervals = {
    TEST: 60 * 1000,                    // 1 minute
    HOURLY: 60 * 60 * 1000,             // 1 hour
    DAILY: 24 * 60 * 60 * 1000,         // 1 day
    WEEKLY: 7 * 24 * 60 * 60 * 1000,    // 7 days
    MONTHLY: 30 * 24 * 60 * 60 * 1000   // 30 days (approximate)
  };

  const interval = intervals[frequency as keyof typeof intervals] || intervals.DAILY;
  return new Date(now.getTime() + interval);
}

/**
 * Get human-readable display text for frequency
 * @param frequency - The DCA execution frequency
 * @returns User-friendly frequency string
 */
export function getFrequencyDisplay(frequency: string): string {
  const displays: Record<string, string> = {
    TEST: "Every 1 minute (Test mode)",
    HOURLY: "Every hour",
    DAILY: "Every day",
    WEEKLY: "Every week",
    MONTHLY: "Every month"
  };

  return displays[frequency] || frequency;
}

/**
 * Safely edit or reply to a message (fallback pattern)
 * Tries to edit the message, falls back to reply if edit fails
 * @param ctx - Telegram context
 * @param message - Message to send
 * @param options - Message options
 */
export async function safeEditOrReply(ctx: any, message: string, options: any = {}): Promise<void> {
  try {
    await ctx.editMessageText(message, options);
  } catch {
    await ctx.reply(message, options);
  }
}

/**
 * Get status emoji for a DCA strategy
 * @param status - Strategy status
 * @returns Emoji representing the status
 */
export function getStatusEmoji(status: string): string {
  const statusEmojiMap: Record<string, string> = {
    ACTIVE: "🟢",
    PAUSED: "⏸",
    CANCELLED: "❌",
    COMPLETED: "✅"
  };
  return statusEmojiMap[status] || "⚪";
}

/**
 * Convert a human-readable amount to smallest unit (e.g., SOL to lamports)
 * @param amount - Amount in human-readable units (e.g., "1.5")
 * @param decimals - Number of decimal places (e.g., 9 for SOL)
 * @returns Amount in smallest unit as BigInt
 */
export function toSmallestUnit(amount: number, decimals: number): bigint {
  // Convert to string to avoid floating point issues
  const amountStr = amount.toString();
  const [whole, fraction = ''] = amountStr.split('.');

  // Pad or truncate fraction to match decimals
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);

  // Combine whole and fraction parts
  const smallestUnitStr = whole + paddedFraction;

  return BigInt(smallestUnitStr);
}

/**
 * Convert smallest unit to human-readable amount (e.g., lamports to SOL)
 * @param smallestUnit - Amount in smallest unit as BigInt
 * @param decimals - Number of decimal places (e.g., 9 for SOL)
 * @returns Amount in human-readable units as number
 */
export function fromSmallestUnit(smallestUnit: bigint, decimals: number): number {
  const divisor = 10 ** decimals;
  return Number(smallestUnit) / divisor;
}

/**
 * Format smallest unit for display (e.g., lamports to "1.5 SOL")
 * @param smallestUnit - Amount in smallest unit as BigInt
 * @param decimals - Number of decimal places
 * @param maxDecimals - Maximum decimal places to show in output (default: 6)
 * @returns Formatted string
 */
export function formatSmallestUnit(smallestUnit: bigint, decimals: number, maxDecimals: number = 6): string {
  const amount = fromSmallestUnit(smallestUnit, decimals);
  return amount.toFixed(maxDecimals).replace(/\.?0+$/, '');
}
