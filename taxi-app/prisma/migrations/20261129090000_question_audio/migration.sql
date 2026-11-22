-- CreateTable
CREATE TABLE "question_audio" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "voice_id" VARCHAR(80) NOT NULL,
    "lang" VARCHAR(8) NOT NULL DEFAULT 'de-AT',
    "storage_path_opus" VARCHAR(300),
    "storage_path_mp3" VARCHAR(300),
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "text_hash" VARCHAR(64),
    "status" VARCHAR(12) NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "source" VARCHAR(8) NOT NULL DEFAULT 'tts',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "characters" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_audio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_jobs" (
    "id" TEXT NOT NULL,
    "scope" VARCHAR(12) NOT NULL,
    "scope_id" VARCHAR(80),
    "voice_ids" TEXT[],
    "kinds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total" INTEGER NOT NULL DEFAULT 0,
    "done" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(12) NOT NULL DEFAULT 'running',
    "current_label" VARCHAR(200),
    "started_by" VARCHAR(64),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "est_characters" INTEGER NOT NULL DEFAULT 0,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "audio_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tts_lexicon" (
    "term" VARCHAR(80) NOT NULL,
    "spoken" VARCHAR(200) NOT NULL,
    "notes" VARCHAR(300),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tts_lexicon_pkey" PRIMARY KEY ("term")
);

-- CreateTable
CREATE TABLE "audio_config" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'default',
    "voice_female" VARCHAR(80),
    "voice_male" VARCHAR(80),
    "default_voice" VARCHAR(8) NOT NULL DEFAULT 'female',
    "price_per_million" DOUBLE PRECISION NOT NULL DEFAULT 16,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_drill_settings" (
    "userId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_drill_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "audio_drill_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "questionIds" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB NOT NULL DEFAULT '{}',
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_drill_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_audio_status_updated_at_idx" ON "question_audio"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "question_audio_question_id_kind_voice_id_key" ON "question_audio"("question_id", "kind", "voice_id");

-- CreateIndex
CREATE INDEX "audio_jobs_status_started_at_idx" ON "audio_jobs"("status", "started_at");

-- CreateIndex
CREATE INDEX "audio_drill_sessions_userId_createdAt_idx" ON "audio_drill_sessions"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "question_audio" ADD CONSTRAINT "question_audio_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_drill_settings" ADD CONSTRAINT "audio_drill_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_drill_sessions" ADD CONSTRAINT "audio_drill_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Audio: Zeilen auf „pending“ setzen, wenn sich Frage, Erklärung oder Antworten ändern -----------
CREATE OR REPLACE FUNCTION question_audio_mark_stale() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE qid text;
BEGIN
  IF TG_TABLE_NAME = 'Question' THEN
    qid := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    qid := OLD."questionId";
  ELSE
    qid := NEW."questionId";
  END IF;
  UPDATE question_audio SET status = 'pending', updated_at = now()
   WHERE question_id = qid AND source = 'tts' AND status IN ('done', 'failed');
  RETURN NULL;
END $$;

CREATE TRIGGER question_audio_stale_question
  AFTER UPDATE OF text, explanation ON "Question"
  FOR EACH ROW WHEN (OLD.text IS DISTINCT FROM NEW.text OR OLD.explanation IS DISTINCT FROM NEW.explanation)
  EXECUTE FUNCTION question_audio_mark_stale();

CREATE TRIGGER question_audio_stale_option
  AFTER INSERT OR UPDATE OR DELETE ON "AnswerOption"
  FOR EACH ROW EXECUTE FUNCTION question_audio_mark_stale();

ALTER TABLE "question_audio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audio_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tts_lexicon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audio_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audio_drill_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audio_drill_sessions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "question_audio", "audio_jobs", "tts_lexicon", "audio_config", "audio_drill_settings", "audio_drill_sessions" FROM anon, authenticated';
  END IF;
END $$;

-- Hinweis: Der öffentliche Storage-Bucket „audio“ wird in Supabase separat angelegt
-- (die Migrationsrolle hat keine Rechte am Schema „storage“).
