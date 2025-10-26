import { Context } from "telegraf";

/**
 * Centralized Telegram utility functions
 */

/**
 * Builds a unique owner locator string from Telegram context
 * Format: "telegram:{userId}"
 */
export function buildOwnerLocator(ctx: Context): string {
  const userId = ctx.from?.id ?? "unknown";
  return `telegram:${userId}`;
}

/**
 * Gets Telegram user ID from context
 */
export function getTelegramId(ctx: Context): bigint {
  return BigInt(ctx.from?.id ?? 0);
}

/**
 * Gets username from context (may be null)
 */
export function getUsername(ctx: Context): string | null {
  return ctx.from?.username ?? null;
}

/**
 * Gets first name from context (may be null)
 */
export function getFirstName(ctx: Context): string | null {
  return ctx.from?.first_name ?? null;
}

/**
 * Gets last name from context (may be null)
 */
export function getLastName(ctx: Context): string | null {
  return ctx.from?.last_name ?? null;
}

/**
 * Builds full user data object from context for database operations
 */
export function getUserDataFromContext(ctx: Context) {
  return {
    telegramId: getTelegramId(ctx),
    username: getUsername(ctx),
    firstName: getFirstName(ctx),
    lastName: getLastName(ctx),
    ownerLocator: buildOwnerLocator(ctx),
  };
}
