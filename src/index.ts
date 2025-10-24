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
    `/start - Create your wallet\\n` +
    `/balance or /b - Quick balance check ⚡\\n` +
    `/address or /addr - Show wallet address with QR\\n` +
    `/portfolio or /p - Full token holdings\\n` +
    `🔄 *Trading:*\\n` +
    `/swap - Open swap menu\\n` +
    `/buy - Buy tokens quickly ⚡\\n` +
    `/sell - Sell tokens quickly ⚡\\n` +
    `/exchange - Token-to-token swap 🔄\\n` +
    `/cancel - Cancel current swap\\n\\n` +
    `📊 *DCA (Auto-Invest):*\\n` +
    `/dca - Setup automated DCA strategy\\n` +
    `/dca_list - View & manage your DCA strategies\\n\\n` +
    `🛠️ *Utilities:*\\n` +
    `/refresh or /r - Refresh data\\n` +
    `/about - Your info\\n` +
    `/help - Show this message`,
    { parse_mode: 'Markdown' }
  )
);

bot.on(message('sticker'), (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));

// Set bot commands for command menu
bot.telegram.setMyCommands([
  { command: 'start', description: '🚀 Create your wallet' },
  { command: 'balance', description: '💰 Quick balance check' },
  { command: 'address', description: '📍 Show wallet address + QR' },
  { command: 'portfolio', description: '📊 Full token holdings' },
  { command: 'wallet_send', description: '📤 Send SOL to another address' },
  { command: 'swap', description: '🔄 Open swap menu' },
  { command: 'buy', description: '🟢 Buy tokens quickly' },
  { command: 'sell', description: '🔴 Sell tokens quickly' },
  { command: 'exchange', description: '🔄 Token-to-token swap' },
  { command: 'dca', description: '📊 Setup automated DCA strategy' },
  { command: 'dca_list', description: '📋 View & manage DCA strategies' },
  { command: 'cancel', description: '❌ Cancel current operation' },
  { command: 'refresh', description: '🔄 Refresh data' },
  { command: 'network', description: '🌐 Network status' },
  { command: 'about', description: 'ℹ️ About this bot' },
  { command: 'help', description: '📖 Show all commands' },
]);

bot.launch().then(() => {
  console.log('Bot has been launched 🚀🚀🚀');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
