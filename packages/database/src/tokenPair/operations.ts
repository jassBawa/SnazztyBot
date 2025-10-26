import { prisma } from '../client';

export async function getAllActiveTokenPairs() {
  return prisma.tokenPair.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTokenPairBySymbols(baseToken: string, targetToken: string) {
  return prisma.tokenPair.findFirst({
    where: {
      baseToken,
      targetToken,
      active: true,
    },
  });
}
