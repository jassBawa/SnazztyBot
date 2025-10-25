import { prisma } from '../client';
import type { RecordExecutionParams } from './types';

export async function recordDcaExecution(params: RecordExecutionParams) {
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

/**
 * Get execution history for a specific strategy
 */
export async function getStrategyExecutions(strategyId: string, limit: number = 15) {
  return prisma.dcaExecution.findMany({
    where: { strategyId },
    orderBy: { executionTime: 'desc' },
    take: limit,
  });
}

/**
 * Get execution history for all strategies of a user
 */
export async function getUserExecutions(userId: number, limit: number = 20) {
  return prisma.dcaExecution.findMany({
    where: {
      strategy: {
        userId,
      },
    },
    include: {
      strategy: true,
    },
    orderBy: { executionTime: 'desc' },
    take: limit,
  });
}

/**
 * Get a single strategy with its executions
 */
export async function getStrategyWithExecutions(strategyId: string) {
  return prisma.dcaStrategy.findUnique({
    where: { id: strategyId },
    include: {
      executions: {
        orderBy: { executionTime: 'desc' },
        take: 15,
      },
    },
  });
}
