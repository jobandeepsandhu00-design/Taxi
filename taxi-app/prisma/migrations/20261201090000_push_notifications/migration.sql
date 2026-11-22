-- DropIndex
DROP INDEX "PushSubscription_userId_idx";

-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "failedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN     "platform" VARCHAR(10),
ADD COLUMN     "userAgent" VARCHAR(300);

-- CreateTable
CREATE TABLE "notification_prefs" (
    "user_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "daily_reminder" BOOLEAN NOT NULL DEFAULT true,
    "reminder_time" VARCHAR(5) NOT NULL DEFAULT '18:00',
    "streak_alerts" BOOLEAN NOT NULL DEFAULT true,
    "due_alerts" BOOLEAN NOT NULL DEFAULT true,
    "challenge_alerts" BOOLEAN NOT NULL DEFAULT true,
    "duel_alerts" BOOLEAN NOT NULL DEFAULT true,
    "exam_countdown" BOOLEAN NOT NULL DEFAULT true,
    "weekly_report" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" VARCHAR(5) NOT NULL DEFAULT '22:00',
    "quiet_hours_end" VARCHAR(5) NOT NULL DEFAULT '08:00',
    "timezone" VARCHAR(40) NOT NULL DEFAULT 'Europe/Vienna',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" VARCHAR(300) NOT NULL,
    "url" VARCHAR(300),
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clicked_at" TIMESTAMP(3),
    "status" VARCHAR(12) NOT NULL,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_log_user_id_sent_at_idx" ON "notification_log"("user_id", "sent_at");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_active_idx" ON "PushSubscription"("userId", "active");

-- AddForeignKey
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "notification_prefs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_log" ENABLE ROW LEVEL SECURITY;
