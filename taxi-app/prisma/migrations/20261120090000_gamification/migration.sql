-- AlterEnum
ALTER TYPE "QuizMode" ADD VALUE 'REVIEW';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 1,
    "dueDate" DATE NOT NULL,
    "lastReviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAchievement_userId_seenAt_idx" ON "UserAchievement"("userId", "seenAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_key_key" ON "UserAchievement"("userId", "key");

-- CreateIndex
CREATE INDEX "ReviewItem_userId_dueDate_idx" ON "ReviewItem"("userId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewItem_userId_questionId_key" ON "ReviewItem"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Bestehende Antworten in XP umrechnen (richtig +10, falsch +2)
UPDATE "User" u SET "xp" = COALESCE(a.xp, 0)
FROM (
  SELECT "userId", SUM(CASE WHEN "isCorrect" THEN 10 ELSE 2 END)::int AS xp
  FROM "UserAnswer" GROUP BY "userId"
) a
WHERE a."userId" = u."id";

-- Offene Fehler landen im ersten Leitner-Fach und sind sofort fällig
INSERT INTO "ReviewItem" ("id", "userId", "questionId", "box", "dueDate")
SELECT 'rv_' || md5(m."userId" || m."questionId"), m."userId", m."questionId", 1, CURRENT_DATE
FROM "MistakeEntry" m
WHERE m."resolved" = false
ON CONFLICT ("userId", "questionId") DO NOTHING;

-- Neue Tabellen nur für die App (Supabase: kein Zugriff über anon/authenticated)
ALTER TABLE "UserAchievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewItem" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "UserAchievement", "ReviewItem" FROM anon, authenticated;
  END IF;
END $$;
