/**
 * Price Command - Show SOL price in USD
 */

import { Telegraf } from 'telegraf';
import { getSolPriceUSD, formatUSD } from '@repo/services/price';

export function registerPriceCommand(bot: Telegraf) {
  bot.command('price', async (ctx) => {
    try {
      await ctx.reply('⏳ Fetching SOL price...');

      const solPrice = await getSolPriceUSD();

      if (solPrice === null) {
        await ctx.reply(
          '❌ *Unable to fetch SOL price*\n\n' +
          'The Binance API is currently unavailable. Please try again later.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const message =
        `💰 *Solana Price*\n\n` +
        `**Current Price:** ${formatUSD(solPrice)}\n` +
        `**Source:** Binance\n\n` +
        `_Data is real-time from Binance API_`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[Price Command] Error:', error);
      await ctx.reply(
        '❌ An error occurred while fetching the price. Please try again.',
        { parse_mode: 'Markdown' }
      );
    }
  });

  // Also handle "sol" command as alias
  bot.command('sol', async (ctx) => {
    try {
      await ctx.reply('⏳ Fetching SOL price...');

      const solPrice = await getSolPriceUSD();

      if (solPrice === null) {
        await ctx.reply(
          '❌ *Unable to fetch SOL price*\n\n' +
          'The Binance API is currently unavailable. Please try again later.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const message =
        `💰 *Solana (SOL)*\n\n` +
        `**Price:** ${formatUSD(solPrice)}\n` +
        `**Source:** Binance (SOLUSDT)\n\n` +
        `_Use /price to check current SOL price_`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[SOL Command] Error:', error);
      await ctx.reply(
        '❌ An error occurred while fetching the price. Please try again.',
        { parse_mode: 'Markdown' }
      );
    }
  });
}
