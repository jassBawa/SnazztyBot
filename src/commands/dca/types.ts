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
  amountPerInterval?: string;
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
