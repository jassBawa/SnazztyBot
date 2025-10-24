export type DcaFrequency = 'TEST' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type DcaStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

export interface CreateStrategyParams {
  userId: number;
  baseToken: string;
  targetToken: string;
  amountPerInterval: string;
  frequency: DcaFrequency;
  nextExecutionTime: Date;
}

export interface UpdateStrategyAfterExecutionParams {
  strategyId: string;
  nextExecutionTime: Date;
  amountInvested: string;
}

export interface RecordExecutionParams {
  strategyId: string;
  amountInvested: string;
  tokensReceived: string;
  executionPrice: string;
  txHash?: string;
  status: ExecutionStatus;
  errorMessage?: string;
}
