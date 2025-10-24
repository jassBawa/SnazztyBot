/*
  Warnings:

  - A unique constraint covering the columns `[baseToken,targetToken]` on the table `TokenPair` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TokenPair_baseToken_targetToken_key" ON "public"."TokenPair"("baseToken", "targetToken");
