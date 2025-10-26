// Central source of truth for all slash commands supported by the bot.
// Keep this in sync with handlers in `src/index.ts`.
const allCommands = [
  { name: "/start", description: "Greet the user and start the bot" },
  { name: "/help", description: "Show how to use the bot" },
  { name: "/whoareyou", description: "Introduce what the bot is about" },
  { name: "/news", description: "Show the latest curated crypto news" },
  // Expose a virtual /commands entry for discoverability (handled via button callback)
  { name: "/commands", description: "Show all supported commands" },
];

export default allCommands;
