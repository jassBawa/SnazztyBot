import { Context } from "telegraf";
import { CallbackQuery, Update, Message } from "telegraf/types";
import allCommands from "./allCommands";

export const viewAllCommandsResponse = (
  ctx:
    | (Context<Update.CallbackQueryUpdate<CallbackQuery>> &
        Omit<Context<Update>, keyof Context<Update>> & {
          match: RegExpExecArray;
        })
    | (Context<{
        message: Update.New & Update.NonChannel & Message.TextMessage;
        update_id: number;
      }> &
        Omit<Context<Update>, keyof Context<Update>>)
) => {
  const lines: string[] = [];
  lines.push("<b>Here are all the commands</b>");
  lines.push("");
  allCommands.forEach((cmd) => {
    lines.push(`• ${cmd.name} — ${cmd.description}`);
  });
  const commandsHtml = lines.join("\n");
  ctx.replyWithHTML(commandsHtml);
};

// Simple HTML escape to prevent broken markup in titles/descriptions
const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type NewsItem = { title: string; description: string; link: string };

export const sendNewsList = async (
  ctx: Context,
  items: NewsItem[],
  options?: { heading?: string; chunkSize?: number; maxDescriptionLen?: number }
) => {
  const heading = options?.heading ?? "Latest Crypto News";
  const chunkSize = options?.chunkSize ?? 5;
  const maxDescriptionLen = options?.maxDescriptionLen ?? 280;

  const chunks: NewsItem[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    const lines: string[] = [];
    lines.push(`<b>${escapeHtml(heading)}</b>`);
    lines.push("");

    chunk.forEach((item, idx) => {
      const index = c * chunkSize + idx + 1;
      const safeTitle = escapeHtml(item.title);
      const trimmedDescription = escapeHtml(
        item.description.length > maxDescriptionLen
          ? item.description.slice(0, maxDescriptionLen - 1).trimEnd() + "…"
          : item.description
      );
      const safeLink = item.link;

      lines.push(
        `${index}. <b>${safeTitle}</b>\n` +
          `   • ${trimmedDescription}\n` +
          `   • <a href="${safeLink}">Read more</a>`
      );
      // extra spacing between articles
      lines.push("");
    });

    const html = lines.join("\n");
    await ctx.replyWithHTML(html, {
      // prefer modern Telegram API option to avoid type errors
      link_preview_options: { is_disabled: true },
    } as any);
  }
};
