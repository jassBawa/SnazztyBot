export type DcaFrequency = 'TEST' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type DcaStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

export interface CreateStrategyParams {
  userId: number;
  baseToken: string;
  targetToken: string;
  amountPerInterval: bigint;
  frequency: DcaFrequency;
  nextExecutionTime: Date;
  baseTokenDecimals: number;
  targetTokenDecimals: number;
}

export interface UpdateStrategyAfterExecutionParams {
  strategyId: string;
  nextExecutionTime: Date;
  amountInvested: bigint;
}

export interface RecordExecutionParams {
  strategyId: string;
  amountInvested: bigint;
  tokensReceived: bigint;
  executionPrice: bigint;
  txHash?: string;
  status: ExecutionStatus;
  errorMessage?: string;
}
