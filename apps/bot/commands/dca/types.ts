/**
 * DCA Types and Interfaces
 */

/**
 * Represents a user's DCA setup session state
 */
export interface DcaSession {
  step: "selecting_pair" | "awaiting_amount" | "selecting_frequency" | "confirming";
  tokenPairId?: string;
  baseToken?: string;
  targetToken?: string;
  baseMint?: string;
  targetMint?: string;
  baseTokenDecimals?: number;
  targetTokenDecimals?: number;
  amountPerInterval?: string; // Human-readable amount (e.g., "1.5")
  frequency?: DcaFrequency;
}

/**
 * DCA frequency options
 */
export type DcaFrequency = "TEST" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";

/**
 * DCA strategy status
 */
export type DcaStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "COMPLETED";
