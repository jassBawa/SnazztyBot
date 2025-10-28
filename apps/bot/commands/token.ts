// src/commands/tokenCommands.ts
import {
  createSession,
  deleteSession,
  getSession,
  updateSession,
} from "bot/utils/tokenCreationSession";
import { Telegraf, Markup } from "telegraf";
import { tokenOptionsKeyboard } from "utils/keyboards";
import {
  buyTokens,
  calculateTokenPrice,
  createToken,
  formatPrice,
  getAvailableTokens,
  getMyTokens,
} from "@repo/services/token";
import { Connection, PublicKey } from "@solana/web3.js";
import { getOrCreateUserKeypair } from "@repo/services/solana";
import { getTelegramId } from "utils/telegram";

export const registerTokenCommands = async (bot: Telegraf) => {
  const connection = new Connection(process.env.SOLANA_RPC_URL!);
  const programId = new PublicKey(process.env.PROGRAM_ID!);
  bot.action("ACTION_TOKEN_LAUNCHPAD", async (ctx) => {
    await ctx.answerCbQuery();

    await ctx.reply(
      "🚀 *Token Launchpad*\n\n" +
        "Create your own Solana token with ease!\n\n" +
        "✨ *Features:*\n" +
        "• Deploy custom SPL tokens\n" +
        "• Set token name, symbol & supply\n" +
        "• Add metadata & logo\n" +
        "• Instant deployment on Solana\n\n" +
        "💡 Launch your token directly from this platform!",
      { parse_mode: "Markdown", ...tokenOptionsKeyboard() }
    );
  });
  // Start token creation flow
  bot.action("ACTION_TOKEN_CREATE", async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    createSession(userId);

    await ctx.reply(
      "🎨 *Create Your Token*\n\n" +
        "Let's create your Solana token! I'll guide you through the process.\n\n" +
        "📝 *Step 1/3: Token Name*\n\n" +
        "Enter your token name (e.g., 'My Awesome Token'):",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("❌ Cancel", "ACTION_TOKEN_CREATE_CANCEL")],
        ]),
      }
    );
  });

  // Cancel token creation
  bot.action("ACTION_TOKEN_CREATE_CANCEL", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    deleteSession(userId);

    await ctx.reply(
      "❌ Token creation cancelled.",
      Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
      ])
    );
  });

  // Handle text messages during token creation
  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    const session = getSession(userId);

    if (!session) return; // Not in token creation flow

    const text = ctx.message.text.trim();

    switch (session.step) {
      case "name":
        if (text.length < 3 || text.length > 32) {
          return ctx.reply(
            "⚠️ Token name must be between 3 and 32 characters.\n\n" +
              "Please try again:"
          );
        }

        updateSession(userId, { name: text, step: "symbol" });

        await ctx.reply(
          "✅ Token name set!\n\n" +
            "📝 *Step 2/3: Token Symbol*\n\n" +
            "Enter your token symbol (e.g., 'MAT', 'COOL'):\n" +
            "_(Usually 3-5 uppercase letters)_",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  "❌ Cancel",
                  "ACTION_TOKEN_CREATE_CANCEL"
                ),
              ],
            ]),
          }
        );
        break;

      case "symbol":
        if (text.length < 2 || text.length > 10) {
          return ctx.reply(
            "⚠️ Token symbol must be between 2 and 10 characters.\n\n" +
              "Please try again:"
          );
        }

        const symbol = text.toUpperCase();
        updateSession(userId, { symbol, step: "uri" });

        await ctx.reply(
          "✅ Token symbol set!\n\n" +
            "📝 *Step 3/3: Metadata URI*\n\n" +
            "Enter the metadata URI for your token:\n" +
            "_(This should be a link to your token's JSON metadata, e.g., from IPFS or Arweave)_\n\n" +
            "Example: `https://arweave.net/abc123...`",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  "❌ Cancel",
                  "ACTION_TOKEN_CREATE_CANCEL"
                ),
              ],
            ]),
          }
        );
        break;

      case "uri":
        if (!text.startsWith("http://") && !text.startsWith("https://")) {
          return ctx.reply(
            "⚠️ URI must be a valid URL starting with http:// or https://\n\n" +
              "Please try again:"
          );
        }

        updateSession(userId, { uri: text, step: "confirm" });

        const updatedSession = getSession(userId);

        await ctx.reply(
          "✅ All information collected!\n\n" +
            "📋 *Token Summary:*\n\n" +
            `• *Name:* ${updatedSession?.name}\n` +
            `• *Symbol:* ${updatedSession?.symbol}\n` +
            `• *URI:* ${updatedSession?.uri}\n\n` +
            "⚠️ *Important:* Creating a token will cost ~0.01 SOL in transaction fees.\n\n" +
            "Ready to create your token?",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  "✅ Confirm & Create",
                  "ACTION_TOKEN_CONFIRM"
                ),
              ],
              [
                Markup.button.callback(
                  "❌ Cancel",
                  "ACTION_TOKEN_CREATE_CANCEL"
                ),
              ],
            ]),
          }
        );
        break;
    }
  });

  // Confirm and create token
  bot.action("ACTION_TOKEN_CONFIRM", async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const session = getSession(userId);

    if (!session || !session.name || !session.symbol || !session.uri) {
      return ctx.reply("❌ Session expired. Please start again.");
    }

    await ctx.reply("⏳ Creating your token... This may take a few seconds.");

    try {
      const { name, uri, symbol } = session;
      const telegramId = getTelegramId(ctx);
      const payerKeypair = await getOrCreateUserKeypair(telegramId);

      const result = await createToken({
        name,
        symbol,
        uri,
        connection,
        payerKeypair,
        programId,
      });

      if (result.success) {
        await ctx.reply(
          "🎉 *Token Created Successfully!*\n\n" +
            `• *Name:* ${session.name}\n` +
            `• *Symbol:* ${session.symbol}\n` +
            `• *Mint Address:* \`${result.tokenMintKeypair?.publicKey}...\`\n\n` +
            "Your token is now live on Solana! 🚀",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
            ]),
          }
        );
      } else {
        await ctx.reply(
          "❌ Failed to create token. Please try again later.",
          Markup.inlineKeyboard([
            [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
          ])
        );
      }

      deleteSession(userId);
    } catch (error) {
      console.error("Token creation error:", error);
      await ctx.reply(
        "❌ Failed to create token. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
        ])
      );
      deleteSession(userId);
    }
  });

  // Add this action handler in registerTokenCommands function
  bot.action("ACTION_MY_TOKEN_LIST", async (ctx) => {
    await ctx.answerCbQuery();

    const telegramId = getTelegramId(ctx);
    const payerKeypair = await getOrCreateUserKeypair(telegramId);

    const userTokens = await getMyTokens({
      connection,
      programId,
      creatorPubkey: payerKeypair.publicKey,
    });

    if (userTokens.length === 0) {
      await ctx.reply(
        "📋 *My Tokens*\n\n" +
          "You haven't created any tokens yet.\n\n" +
          "Create your first token to get started! 🚀",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("✨ Create Token", "ACTION_TOKEN_CREATE")],
            [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
          ]),
        }
      );
    } else {
      let message = "📋 *My Tokens*\n\n";

      userTokens.forEach((token, index) => {
        message += `${index + 1}. *${token.name}* (${token.symbol})\n`;
        message += `   • Mint: \`${token.tokenMint}\`\n`;
      });

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("✨ Create Token", "ACTION_TOKEN_CREATE")],
          [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
        ]),
      });
    }
  });

  // Action: View all available tokens on bonding curve
  bot.action("ACTION_TOKEN_LIST", async (ctx) => {
    await ctx.answerCbQuery();

    try {
      const programId = new PublicKey(process.env.PROGRAM_ID!);
      const availableTokens = await getAvailableTokens({
        connection,
        programId,
      });

      if (availableTokens.length === 0) {
        await ctx.reply(
          "🪙 *Available Tokens*\n\n" +
            "No tokens available on the bonding curve yet.\n\n" +
            "Be the first to create one! 🚀",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  "✨ Create Token",
                  "ACTION_TOKEN_CREATE"
                ),
              ],
              [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
            ]),
          }
        );
      } else {
        // Build message with token details
        let message = "🪙 *Available Tokens*\n\n";
        message += `Found ${availableTokens.length} token${availableTokens.length > 1 ? "s" : ""}:\n\n`;

        // Build inline keyboard with token buttons
        const tokenButtons = availableTokens.map((token) => {
          const priceFor1M = calculateTokenPrice(
            token.virtualSolReserves,
            token.virtualTokenReserves,
            1_000_000
          );
          const priceFormatted = formatPrice(priceFor1M, 1_000_000);

          return [
            Markup.button.callback(
              `${token.symbol} - ${priceFormatted}`,
              `TOKEN_DETAILS:${token.tokenMint}`
            ),
          ];
        });

        await ctx.reply(message, {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            ...tokenButtons,
            [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
          ]),
        });
      }
    } catch (error) {
      console.error("Error fetching available tokens:", error);
      await ctx.reply("❌ Error fetching tokens. Please try again.", {
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Retry", "ACTION_TOKEN_LIST")],
          [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
        ]),
      });
    }
  });

  // Action: View specific token details
  bot.action(/TOKEN_DETAILS:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const tokenMint = ctx.match[1];

    try {
      const programId = new PublicKey(process.env.PROGRAM_ID!);
      const availableTokens = await getAvailableTokens({
        connection,
        programId,
      });

      const token = availableTokens.find((t) => t.tokenMint === tokenMint);

      if (!token) {
        await ctx.reply("❌ Token not found.");
        return;
      }

      const priceFor1M = formatPrice(token.currentPrice * 1_000_000, 1_000_000);

      const message = `
🪙 *${token.name}* (${token.symbol})

💰 *Current Price:*
- ${priceFor1M}

📊 *Market Stats:*
- Market Cap: ${token.realSolReserves.toFixed(4)} SOL
- Holders: ${token.holders.toLocaleString()}

📍 *Mint Address:*
\`${token.tokenMint}\`

${token.graduated ? "🎓 *Status:* Graduated" : "📈 *Status:* Active"}
    `.trim();

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("💵 Buy", `TOKEN_BUY:${tokenMint}`),
            Markup.button.callback("💸 Sell", `TOKEN_SELL:${tokenMint}`),
          ],
          [Markup.button.callback("🔙 Back to Tokens", "ACTION_TOKEN_LIST")],
          [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
        ]),
      });
    } catch (error) {
      console.error("Error fetching token details:", error);
      await ctx.reply("❌ Error fetching token details.");
    }
  });

  // Action: Buy token
  // Handle Buy button click
  bot.action(/TOKEN_BUY:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const tokenMint = ctx.match[1];

    try {
      const programId = new PublicKey(process.env.PROGRAM_ID!);

      // Fetch token info
      const availableTokens = await getAvailableTokens({
        connection,
        programId,
      });
      const token = availableTokens.find((t) => t.tokenMint === tokenMint);

      if (!token) {
        await ctx.reply("❌ Token not found.");
        return;
      }

      // Calculate price for different amounts
      const priceFor1K = token.currentPrice * 1_000;
      const priceFor10K = token.currentPrice * 10_000;
      const priceFor100K = token.currentPrice * 100_000;
      const priceFor1M = token.currentPrice * 1_000_000;

      const message = `
💵 *Buy ${token.name} (${token.symbol})*

💰 *Current Prices:*
- 1,000 tokens: ${formatPrice(priceFor1K)}
- 10,000 tokens: ${formatPrice(priceFor10K)}
- 100,000 tokens: ${formatPrice(priceFor100K)}
- 1,000,000 tokens: ${formatPrice(priceFor1M)}

How much SOL do you want to spend?
    `.trim();

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("0.01 SOL", `BUY_AMOUNT:${tokenMint}:0.01`),
            Markup.button.callback("0.05 SOL", `BUY_AMOUNT:${tokenMint}:0.05`),
          ],
          [
            Markup.button.callback("0.1 SOL", `BUY_AMOUNT:${tokenMint}:0.1`),
            Markup.button.callback("0.5 SOL", `BUY_AMOUNT:${tokenMint}:0.5`),
          ],
          [
            Markup.button.callback("1 SOL", `BUY_AMOUNT:${tokenMint}:1`),
            Markup.button.callback("Custom", `BUY_CUSTOM:${tokenMint}`),
          ],
          [Markup.button.callback("🔙 Back", `TOKEN_DETAILS:${tokenMint}`)],
        ]),
      });
    } catch (error) {
      console.error("Error loading buy screen:", error);
      await ctx.reply("❌ Error loading buy options.");
    }
  });

  // Handle amount selection
  bot.action(/BUY_AMOUNT:(.+):(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const tokenMint = ctx.match[1];
    const solAmount = parseFloat(ctx.match[2]);

    try {
      const telegramId = getTelegramId(ctx);
      const buyerKeypair = await getOrCreateUserKeypair(telegramId);
      const programId = new PublicKey(process.env.PROGRAM_ID!);

      // Fetch token info
      const availableTokens = await getAvailableTokens({
        connection,
        programId,
      });
      const token = availableTokens.find((t) => t.tokenMint === tokenMint);

      if (!token) {
        await ctx.reply("❌ Token not found.");
        return;
      }

      // Check balance
      const balance = await connection.getBalance(buyerKeypair.publicKey);
      const balanceSOL = balance / 1e9;

      if (balanceSOL < solAmount) {
        await ctx.reply(
          `❌ Insufficient balance!\n\n` +
            `You have: ${balanceSOL.toFixed(4)} SOL\n` +
            `Need: ${solAmount} SOL\n\n` +
            `Use /topup to add more funds.`
        );
        return;
      }

      // Show confirmation
      const estimatedTokens = solAmount / token.currentPrice;
      const message = `
🔍 *Confirm Purchase*

*Token:* ${token.name} (${token.symbol})
*Amount:* ${solAmount} SOL
*Estimated tokens:* ~${estimatedTokens.toLocaleString()} ${token.symbol}

*Your balance:* ${balanceSOL.toFixed(4)} SOL

Proceed with purchase?
    `.trim();

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "✅ Confirm",
              `BUY_CONFIRM:${tokenMint}:${solAmount}`
            ),
            Markup.button.callback("❌ Cancel", `TOKEN_BUY:${tokenMint}`),
          ],
        ]),
      });
    } catch (error) {
      console.error("Error preparing purchase:", error);
      await ctx.reply("❌ Error preparing purchase.");
    }
  });

  // Handle purchase confirmation
  bot.action(/BUY_CONFIRM:(.+):(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const tokenMint = ctx.match[1];
    const solAmount = parseFloat(ctx.match[2]);

    try {
      const telegramId = getTelegramId(ctx);
      const buyerKeypair = await getOrCreateUserKeypair(telegramId);
      const programId = new PublicKey(process.env.PROGRAM_ID!);

      // Fetch token info
      const availableTokens = await getAvailableTokens({
        connection,
        programId,
      });
      const token = availableTokens.find((t) => t.tokenMint === tokenMint);

      if (!token) {
        await ctx.reply("❌ Token not found.");
        return;
      }

      await ctx.reply(
        "⏳ Processing your purchase...\nThis may take a few seconds."
      );

      // Execute the buy
      const result = await buyTokens({
        connection,
        programId,
        buyerKeypair,
        tokenMint: new PublicKey(tokenMint),
        amount: solAmount,
        creator: new PublicKey(token.creator),
      });

      if (result.success) {
        await ctx.reply(
          `✅ *Purchase Successful!*\n\n` +
            `You bought ${token.symbol} tokens with ${solAmount} SOL\n\n` +
            `Transaction: \`${result.signature}\`\n\n` +
            `View on Solscan: https://solscan.io/tx/${result.signature}?cluster=devnet`,
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("📋 My Tokens", "ACTION_MY_TOKEN_LIST")],
              [
                Markup.button.callback(
                  "🔙 Back to Token",
                  `TOKEN_DETAILS:${tokenMint}`
                ),
              ],
              [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
            ]),
          }
        );
      } else {
        await ctx.reply(
          `❌ *Purchase Failed*\n\n` +
            `Error: ${result.error}\n\n` +
            `Please try again or contact support.`,
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  "🔄 Try Again",
                  `TOKEN_BUY:${tokenMint}`
                ),
              ],
              [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
            ]),
          }
        );
      }
    } catch (error) {
      console.error("Error executing purchase:", error);
      await ctx.reply(
        "❌ An unexpected error occurred. Please try again later.",
        {
          ...Markup.inlineKeyboard([
            [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
          ]),
        }
      );
    }
  });

  // Handle custom amount (optional)
  bot.action(/BUY_CUSTOM:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const tokenMint = ctx.match[1];

    await ctx.reply(
      "Please enter the amount of SOL you want to spend:\n\n" + "Example: 0.25",
      {
        reply_markup: {
          force_reply: true,
        },
      }
    );

    // Store the token mint in a temporary state (you'll need to implement state management)
    // For now, this is a placeholder - you'd need to track this in your database or session
  });

  // Action: Sell token
  bot.action(/TOKEN_SELL:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const mintAddress = ctx.match[1];

    await ctx.reply(
      "🔴 *Sell Token*\n\n" +
        `Token: \`${mintAddress}\`\n\n` +
        "How many tokens do you want to sell?\n" +
        "_(Type the amount or percentage, e.g., 100 or 50%)_",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("❌ Cancel", "ACTION_TOKEN_AVAILABLE")],
        ]),
      }
    );

    // TODO: Create session to track sell flow
    // createSellSession(ctx.from.id, mintAddress);
  });
};
