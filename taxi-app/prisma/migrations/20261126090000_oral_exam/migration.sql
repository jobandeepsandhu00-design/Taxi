-- AlterTable
ALTER TABLE "User" ADD COLUMN     "oralPrivacyAck" TIMESTAMP(3),
ADD COLUMN     "oralSaveAudio" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "OralQuestion" (
    "id" TEXT NOT NULL,
    "examMode" "ExamType",
    "categoryId" TEXT NOT NULL,
    "questionDe" TEXT NOT NULL,
    "modelAnswerDe" TEXT NOT NULL,
    "keyPoints" JSONB NOT NULL,
    "legalReference" VARCHAR(255),
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "followUps" JSONB NOT NULL DEFAULT '[]',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "catalogVersion" VARCHAR(40),
    "sourceQuestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OralQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OralSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" VARCHAR(12) NOT NULL,
    "questionIds" TEXT[],
    "totalScore" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "OralSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OralAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oralQuestionId" TEXT NOT NULL,
    "sessionId" TEXT,
    "audioPath" VARCHAR(300),
    "transcript" TEXT NOT NULL,
    "followUpQuestion" TEXT,
    "followUpTranscript" TEXT,
    "coveredPointIds" TEXT[],
    "score" INTEGER NOT NULL,
    "verdict" VARCHAR(12) NOT NULL,
    "feedbackDe" TEXT NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OralAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OralProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oralQuestionId" TEXT NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 1,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScore" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OralProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OralQuestion_categoryId_idx" ON "OralQuestion"("categoryId");

-- CreateIndex
CREATE INDEX "OralSession_userId_startedAt_idx" ON "OralSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "OralAttempt_userId_createdAt_idx" ON "OralAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OralAttempt_sessionId_idx" ON "OralAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "OralAttempt_audioPath_idx" ON "OralAttempt"("audioPath");

-- CreateIndex
CREATE INDEX "OralProgress_userId_dueAt_idx" ON "OralProgress"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "OralProgress_userId_oralQuestionId_key" ON "OralProgress"("userId", "oralQuestionId");

-- AddForeignKey
ALTER TABLE "OralQuestion" ADD CONSTRAINT "OralQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralSession" ADD CONSTRAINT "OralSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralAttempt" ADD CONSTRAINT "OralAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralAttempt" ADD CONSTRAINT "OralAttempt_oralQuestionId_fkey" FOREIGN KEY ("oralQuestionId") REFERENCES "OralQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralAttempt" ADD CONSTRAINT "OralAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OralSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralProgress" ADD CONSTRAINT "OralProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralProgress" ADD CONSTRAINT "OralProgress_oralQuestionId_fkey" FOREIGN KEY ("oralQuestionId") REFERENCES "OralQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS: Zugriff nur über die App (Owner), nicht über die öffentlichen Supabase-Rollen
ALTER TABLE "OralQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OralSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OralAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OralProgress" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "OralQuestion", "OralSession", "OralAttempt", "OralProgress" FROM anon, authenticated';
  END IF;
END $$;

-- Privater Storage-Bucket für Aufnahmen (nur auf Supabase vorhanden)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    BEGIN
      EXECUTE $q$INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('oral-audio', 'oral-audio', false, 5242880) ON CONFLICT (id) DO NOTHING$q$;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Bucket oral-audio konnte nicht angelegt werden (fehlende Rechte) – bitte manuell anlegen.';
    END;
  END IF;
END $$;
