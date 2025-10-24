/**
 * DCA Utility Functions
 */

import { DcaFrequency } from "./types";

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
