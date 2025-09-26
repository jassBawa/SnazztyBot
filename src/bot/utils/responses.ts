import { Context } from "telegraf";
import { CallbackQuery, Update } from "telegraf/types";

export const viewAllCommandsResponse = (
  ctx: Context<Update.CallbackQueryUpdate<CallbackQuery>> &
    Omit<Context<Update>, keyof Context<Update>> & {
      match: RegExpExecArray;
    }
) => {
  const commandsHtml = `<b>Here are all the commands</b>\n\n• /commands — This shows all the commands I support\n• /help — This is the help command`;
  ctx.replyWithHTML(commandsHtml);
};
