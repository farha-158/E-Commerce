/*
  Warnings:

  - Added the required column `type` to the `email_outbox` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "email_outbox" ADD COLUMN     "type" "OtpType" NOT NULL;
