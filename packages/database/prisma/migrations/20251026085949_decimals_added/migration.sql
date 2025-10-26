/*
  Warnings:

  - You are about to alter the column `amountInvested` on the `DcaExecution` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.
  - You are about to alter the column `tokensReceived` on the `DcaExecution` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.
  - You are about to alter the column `executionPrice` on the `DcaExecution` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.
  - You are about to alter the column `amountPerInterval` on the `DcaStrategy` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.
  - You are about to alter the column `totalInvested` on the `DcaStrategy` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.
  - You are about to alter the column `averageBuyPrice` on the `DcaStrategy` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.

*/
-- AlterTable
ALTER TABLE "DcaExecution" ALTER COLUMN "amountInvested" SET DATA TYPE BIGINT,
ALTER COLUMN "tokensReceived" SET DATA TYPE BIGINT,
ALTER COLUMN "executionPrice" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "DcaStrategy" ADD COLUMN     "baseTokenDecimals" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN     "targetTokenDecimals" INTEGER NOT NULL DEFAULT 9,
ALTER COLUMN "amountPerInterval" SET DATA TYPE BIGINT,
ALTER COLUMN "totalInvested" SET DEFAULT 0,
ALTER COLUMN "totalInvested" SET DATA TYPE BIGINT,
ALTER COLUMN "averageBuyPrice" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "TokenPair" ADD COLUMN     "baseTokenDecimals" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN     "targetTokenDecimals" INTEGER NOT NULL DEFAULT 9;
