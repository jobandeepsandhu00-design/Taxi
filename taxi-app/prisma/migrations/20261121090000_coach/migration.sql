-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "role" VARCHAR(12) NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "feedback" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimplifiedQuestion" (
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimplifiedQuestion_pkey" PRIMARY KEY ("questionId")
);

-- CreateTable
CREATE TABLE "DailyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachMessage_userId_createdAt_idx" ON "CoachMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachMessage_userId_kind_createdAt_idx" ON "CoachMessage"("userId", "kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPlan_userId_day_key" ON "DailyPlan"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_userId_weekStart_key" ON "WeeklyReport"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimplifiedQuestion" ADD CONSTRAINT "SimplifiedQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Coach-Statistik: Sichten über die letzten 30 Tage ──────────────────────
CREATE OR REPLACE VIEW "user_stats_category_30d" AS
SELECT a."userId" AS user_id,
       q."categoryId" AS category_id,
       COUNT(*)::int AS answered,
       SUM(CASE WHEN a."isCorrect" THEN 1 ELSE 0 END)::int AS correct,
       ROUND(AVG(a."timeSpentSec"))::int AS avg_time_sec
FROM "UserAnswer" a
JOIN "Question" q ON q."id" = a."questionId"
WHERE a."createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY a."userId", q."categoryId";

CREATE OR REPLACE VIEW "user_stats_topic_30d" AS
SELECT a."userId" AS user_id,
       q."topicId" AS topic_id,
       COUNT(*)::int AS answered,
       SUM(CASE WHEN a."isCorrect" THEN 1 ELSE 0 END)::int AS correct
FROM "UserAnswer" a
JOIN "Question" q ON q."id" = a."questionId"
WHERE a."createdAt" >= NOW() - INTERVAL '30 days' AND q."topicId" IS NOT NULL
GROUP BY a."userId", q."topicId";

-- Volltextsuche (Fallback, wenn keine Embeddings vorhanden sind)
CREATE INDEX IF NOT EXISTS "Question_fts_idx" ON "Question" USING GIN (to_tsvector('german', coalesce("text", '') || ' ' || coalesce("explanation", '')));

-- ── pgvector (Supabase): Embeddings für die Coach-Suche ──────────────────
-- Nutzt die Erweiterung, wenn vorhanden; versucht sie sonst anzulegen. Ohne pgvector bleibt die Volltextsuche aktiv.
DO $$
DECLARE vschema text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
     AND EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS vector;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'pgvector konnte nicht angelegt werden – Volltextsuche bleibt aktiv';
    END;
  END IF;
  SELECT n.nspname INTO vschema FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'vector';
  IF vschema IS NOT NULL THEN
    EXECUTE format('CREATE TABLE IF NOT EXISTS "QuestionEmbedding" (
      "questionId" TEXT PRIMARY KEY REFERENCES "Question"("id") ON DELETE CASCADE,
      "embedding" %I.vector(1024) NOT NULL,
      "contentHash" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )', vschema);
    EXECUTE 'ALTER TABLE "QuestionEmbedding" ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Neue Tabellen/Sichten nur für die App (Supabase: kein Zugriff über anon/authenticated)
ALTER TABLE "CoachMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SimplifiedQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyReport" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "CoachMessage", "SimplifiedQuestion", "DailyPlan", "WeeklyReport", "user_stats_category_30d", "user_stats_topic_30d" FROM anon, authenticated;
    IF to_regclass('"QuestionEmbedding"') IS NOT NULL THEN
      REVOKE ALL ON "QuestionEmbedding" FROM anon, authenticated;
    END IF;
  END IF;
END $$;
