/*
  Warnings:

  - You are about to drop the column `nationalآumber` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "nationalآumber",
ADD COLUMN     "nationalNumber" INTEGER;
