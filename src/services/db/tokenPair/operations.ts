import { prisma } from '../client';

export async function getAllActiveTokenPairs() {
  return prisma.tokenPair.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
}
