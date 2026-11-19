-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('TAXILENKER', 'KONZESSION');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyGoalMinutes" INTEGER,
ADD COLUMN     "examType" "ExamType",
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_isGuest_lastLoginAt_idx" ON "User"("isGuest", "lastLoginAt");

-- Bestehende Konten gelten als bereits eingerichtet
UPDATE "User" SET "onboardedAt" = "createdAt" WHERE "onboardedAt" IS NULL;
