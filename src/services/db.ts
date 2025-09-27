import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function upsertTelegramUser(params: {
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  walletPubKey: string;
}) {
  const { telegramId, username, firstName, lastName, walletPubKey } = params;
  return prisma.telegramUser.upsert({
    where: { telegramId },
    create: {
      telegramId,
      username: username ?? undefined,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      walletPubKey,
    },
    update: {
      username: username ?? undefined,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      walletPubKey,
    },
  });
}


