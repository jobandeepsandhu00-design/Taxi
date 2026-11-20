-- AlterTable
ALTER TABLE "User" ADD COLUMN     "helperLang" VARCHAR(8);

-- CreateTable
CREATE TABLE "QuestionVariant" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "lang" VARCHAR(8) NOT NULL DEFAULT 'de',
    "content" JSONB NOT NULL,
    "model" VARCHAR(80) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantFeedback" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionVariant_verified_kind_lang_idx" ON "QuestionVariant"("verified", "kind", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionVariant_questionId_kind_lang_key" ON "QuestionVariant"("questionId", "kind", "lang");

-- CreateIndex
CREATE INDEX "VariantFeedback_rating_idx" ON "VariantFeedback"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "VariantFeedback_variantId_userId_key" ON "VariantFeedback"("variantId", "userId");

-- AddForeignKey
ALTER TABLE "QuestionVariant" ADD CONSTRAINT "QuestionVariant_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantFeedback" ADD CONSTRAINT "VariantFeedback_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "QuestionVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantFeedback" ADD CONSTRAINT "VariantFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Bisherige „Einfache Sprache“-Texte übernehmen
INSERT INTO "QuestionVariant" ("id", "questionId", "kind", "lang", "content", "model", "verified", "createdAt")
SELECT 'qv' || md5(random()::text || sq."questionId"), sq."questionId", 'simple', 'de',
       jsonb_build_object('text', sq."text", 'options', sq."options", 'glossary', '[]'::jsonb), 'migriert', false, CURRENT_TIMESTAMP
FROM "SimplifiedQuestion" sq
ON CONFLICT DO NOTHING;

DROP TABLE "SimplifiedQuestion";

-- Supabase: RLS an; Varianten nur über die App (Lesen für alle Nutzer, Schreiben nur Admin/Service – in der App erzwungen)
ALTER TABLE "QuestionVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VariantFeedback" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "QuestionVariant", "VariantFeedback" FROM anon, authenticated';
  END IF;
END $$;
