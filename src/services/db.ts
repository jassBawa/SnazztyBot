import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * Upsert a Telegram user with their wallet information
 */
export async function upsertTelegramUser(params: {
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  walletPubKey: string;
  encryptedPrivateKey: string;
}) {
  const {
    telegramId,
    username,
    firstName,
    lastName,
    walletPubKey,
    encryptedPrivateKey,
  } = params;
  return prisma.telegramUser.upsert({
    where: { telegramId },
    create: {
      telegramId,
      username: username ?? undefined,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      walletPubKey,
      encryptedPrivateKey,
    },
    update: {
      username: username ?? undefined,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
    },
  });
}

/**
 * Get a user by their Telegram ID
 */
export async function getUserByTelegramId(telegramId: bigint) {
  return prisma.telegramUser.findUnique({
    where: { telegramId },
  });
}

/**
 * Get a user by their wallet public key
 */
export async function getUserByWalletPubKey(walletPubKey: string) {
  return prisma.telegramUser.findUnique({
    where: { walletPubKey },
  });
}
