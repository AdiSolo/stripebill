/*
  Warnings:

  - You are about to drop the column `smartbillKey` on the `Connection` table. All the data in the column will be lost.
  - You are about to drop the column `smartbillSecret` on the `Connection` table. All the data in the column will be lost.
  - Added the required column `name` to the `Connection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smartbillCIF` to the `Connection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smartbillEmail` to the `Connection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smartbillToken` to the `Connection` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Connection" DROP COLUMN "smartbillKey",
DROP COLUMN "smartbillSecret",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "smartbillCIF" TEXT NOT NULL,
ADD COLUMN     "smartbillEmail" TEXT NOT NULL,
ADD COLUMN     "smartbillToken" TEXT NOT NULL,
ADD COLUMN     "stripeWebhookId" TEXT,
ADD COLUMN     "stripeWebhookSecret" TEXT;
