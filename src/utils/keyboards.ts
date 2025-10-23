import { Markup } from "telegraf";

/**
 * Centralized keyboard layouts for the Telegram bot
 * This prevents duplication and makes it easy to update buttons across the app
 */

/**
 * Main menu keyboard - shown on start and main menu actions
 */
export const mainMenuKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback("💰 Wallet Balance", "ACTION_WALLET_BALANCE")],
    [
      Markup.button.callback("🟢 Buy Token", "ACTION_SWAP_BUY"),
      Markup.button.callback("🔴 Sell Token", "ACTION_SWAP_SELL"),
    ],
    [Markup.button.callback("📤 Send Tokens", "ACTION_WALLET_SEND")],
    [Markup.button.callback("ℹ️ Who am I", "ACTION_WHOAMI")],
    [Markup.button.callback("🔄 Refresh", "ACTION_REFRESH")],
  ]);
};

/**
 * Balance view keyboard - shown after checking balance
 */
export const balanceKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🔄 Refresh Balance", "ACTION_WALLET_BALANCE")],
    [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
  ]);
};

/**
 * Simple back to main menu keyboard
 */
export const backToMainKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
  ]);
};

/**
 * Send instructions keyboard
 */
export const sendInstructionsKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
  ]);
};

/**
 * Swap options keyboard
 */
export const swapOptionsKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🟢 Buy Token", "ACTION_SWAP_BUY"),
      Markup.button.callback("🔴 Sell Token", "ACTION_SWAP_SELL"),
    ],
    [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
  ]);
};
