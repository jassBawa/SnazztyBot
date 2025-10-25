import type { DcaStrategy, TelegramUser } from '../generated/client';

export interface StrategyWithUser extends DcaStrategy {
  user: TelegramUser;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  outputAmount?: string;
  error?: string;
}
