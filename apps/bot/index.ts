import { message } from 'telegraf/filters';
import bot from './bot';
import { registerCommands } from './commands';

// Register modular commands first
registerCommands(bot);

// Global handlers
bot.help((ctx) =>
  ctx.reply(
    `📖 *Available Commands*\\n\\n` +
    `💰 *Wallet:*\\n` +
    `/start - Create your wallet & access main menu\\n` +
    `/address or /addr - Show wallet address with QR\\n` +
    `/portfolio or /p - View total portfolio value (SOL + tokens)\\n` +
    `🔄 *Trading:*\\n` +
    `/swap - Open swap menu\\n` +
    `/buy - Buy tokens quickly ⚡\\n` +
    `/sell - Sell tokens quickly ⚡\\n` +
    `/exchange - Token-to-token swap 🔄\\n` +
    `📊 *DCA (Auto-Invest):*\\n` +
    `/dca - Setup automated DCA strategy\\n` +
    `/dca_list or /dcas - View & manage your DCA strategies\\n` +
    `/dca_stats - View portfolio analytics & PnL\\n` +
    `/dca_history or /dca_txns - View transaction history\\n\\n` +
    `💵 *Market Data:*\\n` +
    `/price or /sol - Check current SOL price in USD\\n\\n` +
    `🛠️ *Utilities:*\\n` +
    `/refresh or /r - Refresh data\\n` +
    `/about - Your info\\n` +
    `/help - Show this message\\n\\n` +
    `💡 *Tip:* Use the 💰 Wallet Balance button in the main menu to check your balance!`,
    { parse_mode: 'Markdown' }
  )
);

bot.on(message('sticker'), (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));

// Set bot commands for command menu (with error handling)
async function setupBot() {
  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: '🚀 Create wallet & main menu' },
      { command: 'portfolio', description: '📊 View total portfolio value' },
      { command: 'address', description: '📍 Show wallet address + QR' },
      { command: 'wallet_send', description: '📤 Send SOL to another address' },
      { command: 'swap', description: '🔄 Open swap menu' },
      { command: 'buy', description: '🟢 Buy tokens quickly' },
      { command: 'sell', description: '🔴 Sell tokens quickly' },
      { command: 'exchange', description: '🔄 Token-to-token swap' },
      { command: 'dca', description: '📊 Setup automated DCA strategy' },
      { command: 'dca_list', description: '📋 View & manage DCA strategies' },
      { command: 'dca_stats', description: '📈 View portfolio analytics & PnL' },
      { command: 'dca_history', description: '📜 View transaction history' },
      { command: 'price', description: '💵 Check current SOL price (USD)' },
      { command: 'cancel', description: '❌ Cancel current operation' },
      { command: 'refresh', description: '🔄 Refresh data' },
      { command: 'about', description: 'ℹ️ About this bot' },
      { command: 'help', description: '📖 Show all commands' },
    ]);
    console.log('✅ Bot commands set successfully');
  } catch (error) {
    console.error('⚠️  Failed to set bot commands (will retry on next launch):', error instanceof Error ? error.message : error);
  }

  try {
    await bot.launch();
    console.log('🚀 Bot has been launched successfully!');
  } catch (error) {
    console.error('❌ Failed to launch bot:', error instanceof Error ? error.message : error);
    console.log('⏳ Retrying bot launch in 5 seconds...');

    // Retry after 5 seconds instead of crashing
    setTimeout(() => setupBot(), 5000);
  }
}

// Start the bot
setupBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
