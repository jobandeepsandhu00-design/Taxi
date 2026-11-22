-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastQuizConfig" JSONB;

-- AlterTable
ALTER TABLE "audio_drill_sessions" ADD COLUMN     "config" JSONB;

