export interface UpsertUserParams {
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  walletPubKey: string;
  encryptedPrivateKey: string;
}
