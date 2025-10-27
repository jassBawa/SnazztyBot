// src/commands/tokenCommands.ts
import {
  createSession,
  deleteSession,
  getSession,
  updateSession,
} from "bot/utils/tokenCreationSession";
import { Telegraf, Markup } from "telegraf";
import { tokenOptionsKeyboard } from "utils/keyboards";
import { createToken } from "@repo/services/token";
import { Connection } from "@solana/web3.js";
import { getOrCreateUserKeypair } from "@repo/services/solana";
import { getTelegramId } from "utils/telegram";

export const registerTokenCommands = async (bot: Telegraf) => {
  const connection = new Connection(process.env.SOLANA_RPC_URL!);
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

    const userId = ctx.from.id;

    // TODO: Fetch user's tokens from database
    // const userTokens = await db.token.findMany({ where: { userId } });

    // For now, simulate empty list
    const userTokens: any[] = [];

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
      // Build token list message
      let message = "📋 *My Tokens*\n\n";

      userTokens.forEach((token, index) => {
        message += `${index + 1}. *${token.name}* (${token.symbol})\n`;
        message += `   • Mint: \`${token.mintAddress}\`\n`;
        message += `   • Created: ${new Date(token.createdAt).toLocaleDateString()}\n\n`;
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

    // TODO: Fetch tokens from bonding curve contract
    // const availableTokens = await fetchBondingCurveTokens();

    // For now, simulate with mock data
    const availableTokens: any[] = [
      // Remove this array to test empty state
      {
        id: "token1",
        name: "Snazzy Token",
        symbol: "SNAZ",
        mintAddress: "7xKXt...abc",
      },
      // { id: "token2", name: "Cool Token", symbol: "COOL", mintAddress: "9yZWr...xyz" },
    ];

    if (availableTokens.length === 0) {
      await ctx.reply(
        "🪙 *Available Tokens*\n\n" +
          "No tokens available on the bonding curve yet.\n\n" +
          "Be the first to create one! 🚀",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("✨ Create Token", "ACTION_TOKEN_CREATE")],
            [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
          ]),
        }
      );
    } else {
      // Build inline keyboard with token buttons
      const tokenButtons = availableTokens.map((token) => [
        Markup.button.callback(
          `${token.name} (${token.symbol})`,
          `TOKEN_DETAILS:${token.mintAddress}`
        ),
      ]);

      await ctx.reply(
        "🪙 *Available Tokens*\n\n" +
          "Select a token to view details and trade:",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            ...tokenButtons,
            [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
          ]),
        }
      );
    }
  });

  // Action: View specific token details
  bot.action(/TOKEN_DETAILS:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const mintAddress = ctx.match[1];

    // TODO: Fetch token details from bonding curve
    // const tokenDetails = await getTokenDetails(mintAddress);

    // Mock data for now
    const tokenDetails = {
      name: "Snazzy Token",
      symbol: "SNAZ",
      mintAddress: mintAddress,
      description: "The snazziest token on Solana!",
      totalSupply: "1,000,000",
      currentPrice: "0.00042 SOL",
      marketCap: "420 SOL",
      holders: 156,
      bondingCurveProgress: "45%",
      imageUrl: "https://example.com/logo.png",
    };

    await ctx.reply(
      `🪙 *${tokenDetails.name}* (${tokenDetails.symbol})\n\n` +
        `📝 ${tokenDetails.description}\n\n` +
        `💰 *Price:* ${tokenDetails.currentPrice}\n` +
        `📊 *Market Cap:* ${tokenDetails.marketCap}\n` +
        `👥 *Holders:* ${tokenDetails.holders}\n` +
        `📈 *Bonding Curve:* ${tokenDetails.bondingCurveProgress}\n` +
        `🔗 *Mint:* \`${tokenDetails.mintAddress}\`\n\n` +
        `What would you like to do?`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("🟢 Buy", `TOKEN_BUY:${mintAddress}`),
            Markup.button.callback("🔴 Sell", `TOKEN_SELL:${mintAddress}`),
          ],
          [
            Markup.button.callback(
              "🔙 Back to Tokens",
              "ACTION_TOKEN_AVAILABLE"
            ),
          ],
          [Markup.button.callback("🏠 Main Menu", "ACTION_MAIN_MENU")],
        ]),
      }
    );
  });

  // Action: Buy token
  bot.action(/TOKEN_BUY:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const mintAddress = ctx.match[1];

    await ctx.reply(
      "🟢 *Buy Token*\n\n" +
        `Token: \`${mintAddress}\`\n\n` +
        "How much SOL do you want to spend?\n" +
        "_(Type the amount, e.g., 0.1)_",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("❌ Cancel", "ACTION_TOKEN_AVAILABLE")],
        ]),
      }
    );

    // TODO: Create session to track buy flow
    // createBuySession(ctx.from.id, mintAddress);
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
