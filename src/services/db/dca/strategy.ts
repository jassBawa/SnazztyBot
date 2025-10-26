import { prisma } from '../client';
import type { CreateStrategyParams, UpdateStrategyAfterExecutionParams } from './types';

export async function createDcaStrategy(params: CreateStrategyParams) {
  return prisma.dcaStrategy.create({
    data: {
      userId: params.userId,
      baseToken: params.baseToken,
      targetToken: params.targetToken,
      amountPerInterval: params.amountPerInterval,
      frequency: params.frequency,
      nextExecutionTime: params.nextExecutionTime,
      baseTokenDecimals: params.baseTokenDecimals,
      targetTokenDecimals: params.targetTokenDecimals,
      status: 'ACTIVE',
    },
  });
}

export async function getUserDcaStrategies(userId: number) {
  return prisma.dcaStrategy.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getExistingStrategyForTokenPair(
  userId: number,
  baseToken: string,
  targetToken: string
) {
  return prisma.dcaStrategy.findFirst({
    where: {
      userId,
      baseToken,
      targetToken,
      status: {
        in: ['ACTIVE', 'PAUSED'],
      },
    },
  });
}

export async function getDcaStrategy(strategyId: string) {
  return prisma.dcaStrategy.findUnique({
    where: { id: strategyId },
  });
}

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

export async function pauseDcaStrategy(strategyId: string) {
  return prisma.dcaStrategy.update({
    where: { id: strategyId },
    data: { status: 'PAUSED' },
  });
}

export async function resumeDcaStrategy(strategyId: string) {
  return prisma.dcaStrategy.update({
    where: { id: strategyId },
    data: { status: 'ACTIVE' },
  });
}

export async function cancelDcaStrategy(strategyId: string) {
  return prisma.dcaStrategy.update({
    where: { id: strategyId },
    data: { status: 'CANCELLED' },
  });
}

export async function updateDcaStrategyAfterExecution(params: UpdateStrategyAfterExecutionParams) {
  const strategy = await prisma.dcaStrategy.findUnique({
    where: { id: params.strategyId },
  });

  if (!strategy) {
    throw new Error('Strategy not found');
  }

  const newTotalInvested = strategy.totalInvested + params.amountInvested;
  const newExecutionCount = strategy.executionCount + 1;

  return prisma.dcaStrategy.update({
    where: { id: params.strategyId },
    data: {
      nextExecutionTime: params.nextExecutionTime,
      totalInvested: newTotalInvested,
      executionCount: newExecutionCount,
      consecutiveFailures: 0,
    },
  });
}

export async function incrementStrategyFailures(strategyId: string) {
  const strategy = await prisma.dcaStrategy.findUnique({
    where: { id: strategyId },
  });

  if (!strategy) {
    throw new Error('Strategy not found');
  }

  const newFailureCount = strategy.consecutiveFailures + 1;
  const shouldPause = newFailureCount >= 3;

  return prisma.dcaStrategy.update({
    where: { id: strategyId },
    data: {
      consecutiveFailures: newFailureCount,
      status: shouldPause ? 'PAUSED' : strategy.status,
    },
  });
}
