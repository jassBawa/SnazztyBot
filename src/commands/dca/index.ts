/**
 * ============================================================================
 * DCA (Dollar Cost Averaging) Command Module
 * ============================================================================
 *
 * This module handles automated DCA trading strategies for Telegram users.
 *
 * USER FLOW:
 * ----------
 * 1. User initiates: /dca command OR clicks "📊 Setup DCA" button
 * 2. Select Token Pair: User selects from available pairs (e.g., SOL → IMG)
 * 3. Enter Amount: User types the amount to invest per interval (e.g., "0.1")
 * 4. Select Frequency: User chooses execution frequency (TEST/HOURLY/DAILY/WEEKLY/MONTHLY)
 * 5. Confirm: User reviews and confirms the strategy
 * 6. Complete: Strategy is saved to database and scheduled for execution
 *
 * MANAGEMENT FLOW:
 * ----------------
 * 1. User views strategies: /dca_list command OR clicks "📋 My DCA" button
 * 2. User can: Pause, Resume, or Cancel strategies
 * 3. User can create new strategies from the list view
 *
 * ============================================================================
 *
 * FILE STRUCTURE:
 * ---------------
 * - types.ts          - TypeScript types and interfaces
 * - session.ts        - Session state management
 * - utils.ts          - Utility helper functions
 * - messages.ts       - Message and keyboard builders
 * - flows.ts          - High-level flow functions
 * - handlers/setup.ts - Setup flow handlers (Step 2-5)
 * - handlers/management.ts - Strategy management handlers
 * - index.ts (this)   - Main registration and entry points
 *
 * ============================================================================
 */

import { Telegraf } from "telegraf";
import { setupDcaFlow, showDcaList } from "./flows";
import { registerSetupHandlers } from "./handlers/setup";
import { registerManagementHandlers } from "./handlers/management";

/**
 * Register all DCA-related commands and action handlers
 * @param bot - Telegraf bot instance
 */
export function registerDcaCommands(bot: Telegraf): void {

  // ============================================================================
  // ENTRY POINTS - Commands & Main Menu Buttons
  // ============================================================================

  /**
   * Handle /dca command - Start DCA setup
   */
  bot.command("dca", setupDcaFlow);

  /**
   * Handle /dca_list command - View strategies
   */
  bot.command("dca_list", showDcaList);

  /**
   * Handle "Setup DCA" button from main menu
   */
  bot.action("ACTION_DCA_SETUP", async (ctx) => {
    await ctx.answerCbQuery();
    await setupDcaFlow(ctx);
  });

  /**
   * Handle "My DCA" button from main menu
   */
  bot.action("ACTION_DCA_LIST", async (ctx) => {
    await ctx.answerCbQuery();
    await showDcaList(ctx);
  });

  /**
   * Handle "New DCA" button from strategy list
   */
  bot.action("DCA_NEW", async (ctx) => {
    await ctx.answerCbQuery();
    await setupDcaFlow(ctx);
  });

  // ============================================================================
  // REGISTER SUB-HANDLERS
  // ============================================================================

  // Register setup flow handlers (token selection, amount input, frequency, confirmation)
  registerSetupHandlers(bot);

  // Register management handlers (pause, resume, cancel strategies)
  registerManagementHandlers(bot);
}
