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
