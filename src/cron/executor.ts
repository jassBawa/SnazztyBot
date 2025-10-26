import {
  getExecutableDcaStrategies,
  recordDcaExecution,
  updateDcaStrategyAfterExecution,
  incrementStrategyFailures
} from '../services/db/dca';
import { getTokenPairBySymbols } from '../services/db/tokenPair/operations';
import { getOrCreateUserKeypair, hasSufficientBalance } from '../services/solana';
import { swapSolForToken } from '../services/raydium';
import { calculateNextExecutionTime, fromSmallestUnit, toSmallestUnit } from '../commands/dca/utils';
import type { StrategyWithUser, ExecutionResult } from './types';

async function executeDcaStrategy(strategy: StrategyWithUser): Promise<ExecutionResult> {
  const strategyId = strategy.id;
  const userId = strategy.user.telegramId;

  console.log(`[DCA Executor] Executing strategy ${strategyId} for user ${userId}`);
  console.log(`[DCA Executor] ${strategy.baseToken} → ${strategy.targetToken}, Amount: ${strategy.amountPerInterval}`);

  try {
    // Look up the token pair to get the actual mint addresses
    const tokenPair = await getTokenPairBySymbols(strategy.baseToken, strategy.targetToken);
    if (!tokenPair) {
      throw new Error(`Token pair not found: ${strategy.baseToken} → ${strategy.targetToken}`);
    }

    const userKeypair = await getOrCreateUserKeypair(userId);
    console.log(`[DCA Executor] User wallet loaded: ${userKeypair.publicKey.toBase58()}`);

    // Convert BigInt amount to human-readable number for swap
    const solAmount = fromSmallestUnit(strategy.amountPerInterval, strategy.baseTokenDecimals);
    const targetTokenMint = tokenPair.targetMint;

    // Check if user has sufficient balance (including buffer for transaction fees)
    const balanceCheck = await hasSufficientBalance(userKeypair.publicKey, solAmount, 0.01);

    if (!balanceCheck.sufficient) {
      throw new Error(
        `Insufficient balance: Need ${balanceCheck.required.toFixed(4)} SOL ` +
        `(${solAmount} SOL + 0.01 SOL for fees), but only have ${balanceCheck.currentBalance.toFixed(4)} SOL. ` +
        `Please add funds to continue DCA.`
      );
    }

    console.log(`[DCA Executor] Balance check passed: ${balanceCheck.currentBalance.toFixed(4)} SOL available`);
    console.log(`[DCA Executor] Executing swap: ${solAmount} ${strategy.baseToken} → ${strategy.targetToken}`);
    console.log(`[DCA Executor] Token mint: ${targetTokenMint}`);

    const swapResult = await swapSolForToken({
      userKeypair,
      tokenMint: targetTokenMint,
      solAmount,
      slippage: 0.01,
    });

    console.log(`[DCA Executor] Swap successful!`);
    console.log(`[DCA Executor] TX: ${swapResult.signature}`);
    console.log(`[DCA Executor] Received: ${swapResult.outputAmount} tokens`);

    // Convert swap results back to BigInt for database storage
    const tokensReceivedBigInt = toSmallestUnit(parseFloat(swapResult.outputAmount), strategy.targetTokenDecimals);

    // Calculate execution price in smallest units (base per target token)
    const executionPriceBigInt = strategy.amountPerInterval / tokensReceivedBigInt;

    await recordDcaExecution({
      strategyId,
      amountInvested: strategy.amountPerInterval,
      tokensReceived: tokensReceivedBigInt,
      executionPrice: executionPriceBigInt,
      txHash: swapResult.signature,
      status: 'SUCCESS',
    });

    console.log(`[DCA Executor] Execution recorded in database`);

    const nextExecutionTime = calculateNextExecutionTime(strategy.frequency);

    await updateDcaStrategyAfterExecution({
      strategyId,
      nextExecutionTime,
      amountInvested: strategy.amountPerInterval,
    });

    console.log(`[DCA Executor] Strategy updated. Next execution: ${nextExecutionTime.toLocaleString()}`);
    console.log(`[DCA Executor] ✅ Strategy ${strategyId} executed successfully\n`);

    return {
      success: true,
      txHash: swapResult.signature,
      outputAmount: swapResult.outputAmount,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DCA Executor] ❌ Error executing strategy ${strategyId}:`, errorMessage);

    try {
      await recordDcaExecution({
        strategyId,
        amountInvested: strategy.amountPerInterval,
        tokensReceived: BigInt(0), // BigInt zero
        executionPrice: BigInt(0), // BigInt zero
        status: 'FAILED',
        errorMessage,
      });

      console.log(`[DCA Executor] Failed execution recorded in database`);

      const updatedStrategy = await incrementStrategyFailures(strategyId);

      if (updatedStrategy.status === 'PAUSED') {
        console.warn(`[DCA Executor] ⚠️  Strategy ${strategyId} PAUSED after ${updatedStrategy.consecutiveFailures} consecutive failures`);
      } else {
        console.log(`[DCA Executor] Consecutive failures: ${updatedStrategy.consecutiveFailures}/3`);
      }

    } catch (dbError) {
      const dbErrorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
      console.error(`[DCA Executor] Failed to record error in database:`, dbErrorMessage);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function executeDcaStrategies(): Promise<void> {
  console.log(`[DCA Executor] ⏰ Checking for executable DCA strategies...`);

  try {
    const strategies = await getExecutableDcaStrategies();

    if (strategies.length === 0) {
      console.log(`[DCA Executor] No strategies to execute at this time.`);
      return;
    }

    console.log(`[DCA Executor] Found ${strategies.length} strategy(ies) to execute`);

    for (const strategy of strategies) {
      await executeDcaStrategy(strategy);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[DCA Executor] ✅ Batch execution complete\n`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DCA Executor] ❌ Critical error in DCA executor:`, errorMessage);
  }
}
