-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "simpleDe" TEXT;

-- CreateTable
CREATE TABLE "coach_faq" (
    "id" VARCHAR(64) NOT NULL,
    "question_de" TEXT NOT NULL,
    "answer_de" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" VARCHAR(40) NOT NULL,
    "link_route" VARCHAR(200),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missing_explanations" (
    "question_id" VARCHAR(64) NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missing_explanations_pkey" PRIMARY KEY ("question_id")
);


-- Smart Coach: Wissensbasis ohne KI ------------------------------------------
SET search_path TO public, extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "coach_faq" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "missing_explanations" ENABLE ROW LEVEL SECURITY;

-- Wissensbasis: Fragen (inkl. richtiger Antwort, Erklärung, Merkhilfe, §), Kapitel-Einführungen,
-- Spickzettel, Zahlen-Fakten und FAQ. Materialisiert, damit tsvector + GIN/Trigramm-Index möglich sind.
-- Aktualisierung: REFRESH MATERIALIZED VIEW coach_knowledge (nach Seed/Import/Bearbeitung).
CREATE MATERIALIZED VIEW coach_knowledge AS
WITH docs AS (
  SELECT
    'q:' || q.id AS id,
    'question'::text AS kind,
    q.id AS ref_id,
    q.text AS title,
    concat_ws(E'\n', ans.answer, NULLIF(q.explanation, ans.answer), q.mnemonic) AS body,
    c.name AS category,
    c.slug AS chapter,
    '/fragen/' || q.id AS route,
    jsonb_build_object('answer', ans.answer, 'explanation', q.explanation, 'mnemonic', q.mnemonic, 'legal', q."sourceDetail", 'chapterOrder', c."order") AS extra
  FROM "Question" q
  JOIN "Category" c ON c.id = q."categoryId" AND c."isActive"
  JOIN LATERAL (
    SELECT string_agg(o.text, E'\n' ORDER BY o."order") AS answer FROM "AnswerOption" o WHERE o."questionId" = q.id AND o."isCorrect"
  ) ans ON true
  WHERE q.status = 'PUBLISHED'
  UNION ALL
  SELECT 'c:' || c.id, 'chapter', c.id, c.name, concat_ws(E'\n', c."shortDescription", c.introduction), c.name, c.slug,
    '/lernbuch', jsonb_build_object('chapterOrder', c."order")
  FROM "Category" c WHERE c."isActive"
  UNION ALL
  SELECT 's:' || s."categoryId", 'summary', s."categoryId", 'Spickzettel: ' || c.name, s."contentDe", c.name, c.slug,
    '/lernbuch', jsonb_build_object('keyNumbers', s."keyNumbers", 'traps', s.traps)
  FROM "ChapterSummary" s JOIN "Category" c ON c.id = s."categoryId" AND c."isActive"
  UNION ALL
  SELECT 'n:' || n.id, 'number', n.id, n.statement, trim(n.value || ' ' || n.unit), n.category, NULL,
    '/zahlen', jsonb_build_object('value', n.value, 'unit', n.unit, 'legal', n."legalReference")
  FROM "NumberFact" n
  UNION ALL
  SELECT 'f:' || f.id, 'faq', f.id, f.question_de, concat_ws(E'\n', f.answer_de, array_to_string(f.keywords, ' ')), f.category, NULL,
    f.link_route, jsonb_build_object('answer', f.answer_de, 'verified', f.verified)
  FROM coach_faq f
)
SELECT
  d.*,
  setweight(to_tsvector('german', coalesce(d.title, '')), 'A') || setweight(to_tsvector('german', coalesce(d.body, '')), 'B') AS tsv,
  lower(coalesce(d.title, '') || ' ' || left(coalesce(d.body, ''), 600)) AS search_text
FROM docs d;

CREATE UNIQUE INDEX coach_knowledge_id_idx ON coach_knowledge (id);
CREATE INDEX coach_knowledge_tsv_idx ON coach_knowledge USING GIN (tsv);
CREATE INDEX coach_knowledge_trgm_idx ON coach_knowledge USING GIN (search_text gin_trgm_ops);

-- Suche: Volltext (german, ODER-verknüpft) + Trigramm-Ähnlichkeit für Tippfehler, mit Snippet
CREATE OR REPLACE FUNCTION search_knowledge(q text, lim int DEFAULT 10)
RETURNS TABLE (id text, kind text, ref_id text, title text, body text, category text, chapter text, route text, extra jsonb, rank real, snippet text)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  WITH input AS (
    SELECT lower(trim(q)) AS lq,
           NULLIF(replace(plainto_tsquery('german', q)::text, ' & ', ' | '), '') AS tsq_text
  ), query AS (
    SELECT lq, CASE WHEN tsq_text IS NULL THEN NULL ELSE to_tsquery('german', tsq_text) END AS tsq FROM input
  )
  SELECT k.id, k.kind, k.ref_id, k.title, k.body, k.category, k.chapter, k.route, k.extra,
         (coalesce(ts_rank_cd(k.tsv, query.tsq, 32), 0) * 4
           + word_similarity(query.lq, k.search_text)
           + CASE WHEN k.kind = 'faq' THEN 0.05 ELSE 0 END)::real AS rank,
         CASE WHEN query.tsq IS NULL THEN left(k.body, 200)
              ELSE ts_headline('german', k.body, query.tsq, 'MaxWords=28, MinWords=10, StartSel=<<, StopSel=>>, MaxFragments=1') END AS snippet
  FROM coach_knowledge k, query
  WHERE length(query.lq) >= 2
    AND ((query.tsq IS NOT NULL AND k.tsv @@ query.tsq) OR word_similarity(query.lq, k.search_text) >= 0.45)
  ORDER BY rank DESC
  LIMIT greatest(1, least(lim, 50));
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "coach_faq", "missing_explanations" FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON coach_knowledge FROM anon, authenticated';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION search_knowledge(text, int) FROM PUBLIC, anon, authenticated';
  END IF;
END $$;
