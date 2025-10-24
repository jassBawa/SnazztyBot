import { prisma } from '../client';
import type { UpsertUserParams } from './types';

export async function upsertTelegramUser(params: UpsertUserParams) {
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

export async function getUserByTelegramId(telegramId: bigint) {
  return prisma.telegramUser.findUnique({
    where: { telegramId },
  });
}

export async function getUserByWalletPubKey(walletPubKey: string) {
  return prisma.telegramUser.findUnique({
    where: { walletPubKey },
  });
}
