-- CreateEnum
CREATE TYPE "public"."DcaStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ExecutionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."DcaFrequency" AS ENUM ('TEST', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "public"."TelegramUser" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "walletPubKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DcaStrategy" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "baseToken" TEXT NOT NULL,
    "targetToken" TEXT NOT NULL,
    "amountPerInterval" DECIMAL(65,30) NOT NULL,
    "frequency" "public"."DcaFrequency" NOT NULL,
    "nextExecutionTime" TIMESTAMP(3) NOT NULL,
    "status" "public"."DcaStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalInvested" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "averageBuyPrice" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DcaStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DcaExecution" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "executionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountInvested" DECIMAL(65,30) NOT NULL,
    "tokensReceived" DECIMAL(65,30) NOT NULL,
    "executionPrice" DECIMAL(65,30) NOT NULL,
    "txHash" TEXT,
    "status" "public"."ExecutionStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DcaExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TokenPair" (
    "id" TEXT NOT NULL,
    "baseToken" TEXT NOT NULL,
    "baseMint" TEXT NOT NULL,
    "targetToken" TEXT NOT NULL,
    "targetMint" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramUser_telegramId_key" ON "public"."TelegramUser"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramUser_walletPubKey_key" ON "public"."TelegramUser"("walletPubKey");

-- AddForeignKey
ALTER TABLE "public"."DcaStrategy" ADD CONSTRAINT "DcaStrategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."TelegramUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DcaExecution" ADD CONSTRAINT "DcaExecution_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "public"."DcaStrategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
