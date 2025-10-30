export type SwapAction = "buy" | "sell" | "exchange";

export interface SwapSession {
  action: SwapAction;
  tokenAddress?: string;
  outputTokenAddress?: string;
  amount?: string;
  tokenBalance?: number;
  outputTokenSymbol?: string;
  step: "awaiting_token" | "awaiting_output_token" | "awaiting_amount" | "confirming";
}

export const userSessions = new Map<string, SwapSession>();

export function clearSwapSession(sessionKey: string) {
  userSessions.delete(sessionKey);
}

export function hasSwapSession(sessionKey: string) {
  return userSessions.has(sessionKey);
}

