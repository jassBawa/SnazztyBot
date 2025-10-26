import type { DcaStrategy, TelegramUser } from '@repo/database';

export interface StrategyWithUser extends DcaStrategy {
  user: TelegramUser;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  outputAmount?: string;
  error?: string;
}
