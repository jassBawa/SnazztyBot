import { Markup, Telegraf } from 'telegraf';
import { CallbackIds } from './callback-ids';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { message } from 'telegraf/filters';

const BOT_TOKEN = '8247043011:AAEYHENjQMerh4W5vwyOSLrssHB3jjfKbpg';
const connection = new Connection(
  process.env.ALCHEMY_DEVNET_RPC_URL!
);

const bot = new Telegraf(BOT_TOKEN);

const USERS: Record<string, Keypair> = {};

const keyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('Generate Wallet', CallbackIds.GENERATE_WALLET),
    Markup.button.callback('Show public key', CallbackIds.SHOW_PUBLIC_KEY),
  ],
  [
    Markup.button.callback('Check your balance', CallbackIds.GET_USER_BALANCE),

    Markup.button.callback('Send SOL', CallbackIds.SEND_SOL),
  ],
  [Markup.button.callback('Airdrop SOL', CallbackIds.AIRDROP_SOL)],
]);

bot.start((ctx) => {

  let welcomeMessage = 'hello there welcome to boogie bot';

  return ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
});

bot.action(CallbackIds.GENERATE_WALLET, (ctx) => {
  ctx.answerCbQuery('Generating fresh wallet for you!');

  const keypair = Keypair.generate();
  const userId = ctx.from.id;

  if (!userId) {
    return;
  }

  USERS[userId] = keypair;

  ctx.sendMessage(
    `Congratulations a fresh wallet is generated for you with public key <code> ${keypair.publicKey.toBase58()} </code> `,
    {
      parse_mode: 'HTML',
    }
  );
});

bot.action(CallbackIds.SHOW_PUBLIC_KEY, (ctx) => {
  const userId = ctx.from.id;

  if (!userId) {
    return;
  }

  const user = USERS[userId];

  if (!user) {
    return ctx.sendMessage(
      `You haven't generated any wallet yet. Please generate one by clicking the below button.`,
      {
        parse_mode: 'Markdown',
        ...keyboard,
      }
    );
  }

  ctx.sendMessage(
    `Your public key is below. Click to copy. \n <code> ${user.publicKey.toBase58()} </code>`,
    {
      parse_mode: 'HTML',
    }
  );
});

bot.action(CallbackIds.AIRDROP_SOL, async (ctx) => {
  const userId = ctx.from.id;

  if (!userId) {
    return;
  }

  const user = USERS[userId];

  if (!user) {
    return;
  }

  await connection.requestAirdrop(user.publicKey, 1 * LAMPORTS_PER_SOL);

  ctx.sendMessage(`Airdrop Successfully done`, {
    ...keyboard,
  });
});

bot.action(CallbackIds.GET_USER_BALANCE, async (ctx) => {
  const userId = ctx.from.id;

  if (!userId) {
    return;
  }

  const user = USERS[userId];

  if (!user) {
    return;
  }

  const balance = await connection.getBalance(user.publicKey);
  console.log(balance);

  ctx.sendMessage(`Your balance: ${balance/LAMPORTS_PER_SOL}`);
});

bot.action(CallbackIds.SEND_SOL, async (ctx) => {
  ctx.sendMessage("Please send address of the recipient: ")
});

bot.on(message('text'), async (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message.text;

  if (!userId) {
    return;
  }

  const user = USERS[userId];

  if (!user) {
    return;
  }

  const recieverKeyPair = new PublicKey(message);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: user.publicKey,
      toPubkey: recieverKeyPair,
      lamports: 1 * LAMPORTS_PER_SOL,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [user]);
  console.log('Transaction confirmed with signature:', signature);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
