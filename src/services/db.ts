import { PrismaClient } from '../generated/client';

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

/**
 * Get all active token pairs for DCA
 */
export async function getAllActiveTokenPairs() {
  return prisma.tokenPair.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create a new DCA strategy
 */
export async function createDcaStrategy(params: {
  userId: number;
  baseToken: string;
  targetToken: string;
  amountPerInterval: string;
  frequency: 'TEST' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  nextExecutionTime: Date;
}) {
  return prisma.dcaStrategy.create({
    data: {
      userId: params.userId,
      baseToken: params.baseToken,
      targetToken: params.targetToken,
      amountPerInterval: params.amountPerInterval,
      frequency: params.frequency,
      nextExecutionTime: params.nextExecutionTime,
      status: 'ACTIVE',
    },
  });
}

/**
 * Get all DCA strategies for a user
 */
export async function getUserDcaStrategies(userId: number) {
  return prisma.dcaStrategy.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get active DCA strategies that need execution
 */
export async function getExecutableDcaStrategies() {
  return prisma.dcaStrategy.findMany({
    where: {
      status: 'ACTIVE',
      nextExecutionTime: {
        lte: new Date(),
      },
    },
    include: {
      user: true,
    },
  });
}

/**
 * Pause a DCA strategy
 */
export async function pauseDcaStrategy(strategyId: string) {
  return prisma.dcaStrategy.update({
    where: { id: strategyId },
    data: { status: 'PAUSED' },
  });
}

/**
 * Resume a DCA strategy
 */
export async function resumeDcaStrategy(strategyId: string) {
  return prisma.dcaStrategy.update({
    where: { id: strategyId },
    data: { status: 'ACTIVE' },
  });
}

/**
 * Cancel a DCA strategy
 */
export async function cancelDcaStrategy(strategyId: string) {
  return prisma.dcaStrategy.update({
    where: { id: strategyId },
    data: { status: 'CANCELLED' },
  });
}

/**
 * Update DCA strategy after execution
 */
export async function updateDcaStrategyAfterExecution(params: {
  strategyId: string;
  nextExecutionTime: Date;
  amountInvested: string;
}) {
  const strategy = await prisma.dcaStrategy.findUnique({
    where: { id: params.strategyId },
  });

  if (!strategy) {
    throw new Error('Strategy not found');
  }

  const newTotalInvested = Number(strategy.totalInvested) + Number(params.amountInvested);
  const newExecutionCount = strategy.executionCount + 1;

  return prisma.dcaStrategy.update({
    where: { id: params.strategyId },
    data: {
      nextExecutionTime: params.nextExecutionTime,
      totalInvested: newTotalInvested.toString(),
      executionCount: newExecutionCount,
    },
  });
}

/**
 * Record a DCA execution
 */
export async function recordDcaExecution(params: {
  strategyId: string;
  amountInvested: string;
  tokensReceived: string;
  executionPrice: string;
  txHash?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  errorMessage?: string;
}) {
  return prisma.dcaExecution.create({
    data: {
      strategyId: params.strategyId,
      amountInvested: params.amountInvested,
      tokensReceived: params.tokensReceived,
      executionPrice: params.executionPrice,
      txHash: params.txHash,
      status: params.status,
      errorMessage: params.errorMessage,
    },
  });
}
