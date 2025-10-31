/**
 * DCA Session Management
 */

import { Context } from "telegraf";
import { getTelegramId } from "../../utils/telegram";
import { DcaSession } from "./types.js";

/**
 * In-memory storage for active DCA setup sessions
 * Key: Telegram user ID as string
 * Value: DCA session state
 */
const dcaSessions = new Map<string, DcaSession>();

/**
 * Get session key from Telegram context
 * @param ctx - Telegram context
 * @returns Session key as string
 */
export function getSessionKey(ctx: Context): string {
  return getTelegramId(ctx).toString();
}

/**
 * Get session for a user
 * @param sessionKey - Session key
 * @returns DCA session or undefined
 */
export function getSession(sessionKey: string): DcaSession | undefined {
  return dcaSessions.get(sessionKey);
}

/**
 * Set session for a user
 * @param sessionKey - Session key
 * @param session - DCA session data
 */
export function setSession(sessionKey: string, session: DcaSession): void {
  dcaSessions.set(sessionKey, session);
}

/**
 * Check if session exists
 * @param sessionKey - Session key
 * @returns True if session exists
 */
export function hasSession(sessionKey: string): boolean {
  return dcaSessions.has(sessionKey);
}

/**
 * Clear session for a user
 * @param sessionKey - Session key
 */
export function clearSession(sessionKey: string): void {
  dcaSessions.delete(sessionKey);
}
