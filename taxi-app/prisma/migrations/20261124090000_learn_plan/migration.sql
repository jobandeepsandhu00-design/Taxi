-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "lessonIndex" INTEGER;

-- CreateIndex
CREATE INDEX "Question_categoryId_lessonIndex_idx" ON "Question"("categoryId", "lessonIndex");


-- Lektionen vergeben: je Kategorie nach Schwierigkeit, dann ID; 5 Fragen pro Lektion (veröffentlichte zuerst)
UPDATE "Question" q SET "lessonIndex" = x.li
FROM (
  SELECT id, CEIL(ROW_NUMBER() OVER (PARTITION BY "categoryId" ORDER BY (status <> 'PUBLISHED'), difficulty, id) / 5.0)::int AS li
  FROM "Question"
) x
WHERE x.id = q.id;

-- Neue Fragen (oder Kategoriewechsel ohne eigene Lektion) automatisch ans Ende hängen
CREATE OR REPLACE FUNCTION assign_lesson_index() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  mx INTEGER;
  cnt INTEGER;
BEGIN
  IF NEW."lessonIndex" IS NOT NULL AND (TG_OP = 'INSERT' OR NEW."categoryId" = OLD."categoryId" OR NEW."lessonIndex" IS DISTINCT FROM OLD."lessonIndex") THEN
    RETURN NEW;
  END IF;
  SELECT MAX("lessonIndex") INTO mx FROM "Question" WHERE "categoryId" = NEW."categoryId" AND id <> NEW.id;
  IF mx IS NULL THEN
    NEW."lessonIndex" := 1;
  ELSE
    SELECT COUNT(*) INTO cnt FROM "Question" WHERE "categoryId" = NEW."categoryId" AND "lessonIndex" = mx AND id <> NEW.id;
    NEW."lessonIndex" := CASE WHEN cnt < 5 THEN mx ELSE mx + 1 END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS question_lesson_index ON "Question";
CREATE TRIGGER question_lesson_index
BEFORE INSERT OR UPDATE OF "categoryId", "lessonIndex" ON "Question"
FOR EACH ROW EXECUTE FUNCTION assign_lesson_index();

-- Jede veröffentlichte Frage + Fortschritt der aktuellen Person.
-- „Aktuelle Person“ = Sitzungsvariable app.user_id (setzt get_learn_plan; ohne sie: kein Fortschritt sichtbar).
CREATE OR REPLACE VIEW learn_plan_view AS
SELECT
  q.id AS question_id,
  q."categoryId" AS category_id,
  COALESCE(q."lessonIndex", 1) AS lesson_index,
  q.text,
  q.difficulty,
  CASE WHEN q."imageUrl" IS NOT NULL THEN 'bild' WHEN q."multipleCorrect" THEN 'mehrfach' ELSE 'einfach' END AS type,
  ri.box,
  ri."dueDate" AS next_review_at,
  COALESCE(ri."timesWrong", 0) AS times_wrong,
  la."isCorrect" AS last_answer_correct,
  CASE
    WHEN ri.id IS NULL THEN 'neu'
    WHEN ri.box <= 1 AND ri."timesWrong" > 0 THEN 'falsch'
    WHEN ri.box <= 3 THEN 'lernen'
    WHEN ri.box = 4 THEN 'sicher'
    ELSE 'gemeistert'
  END AS status,
  (ri."dueDate" IS NOT NULL AND ri."dueDate" <= (now() AT TIME ZONE 'Europe/Vienna')::date) AS faellig
FROM "Question" q
JOIN "Category" c ON c.id = q."categoryId" AND c."isActive"
LEFT JOIN "ReviewItem" ri ON ri."questionId" = q.id AND ri."userId" = current_setting('app.user_id', true)
LEFT JOIN LATERAL (
  SELECT ua."isCorrect" FROM "UserAnswer" ua
  WHERE ua."questionId" = q.id AND ua."userId" = current_setting('app.user_id', true)
  ORDER BY ua."createdAt" DESC LIMIT 1
) la ON true
WHERE q.status = 'PUBLISHED';

-- Ganzer Lernplan als verschachteltes JSON in einem Aufruf.
-- Lektion: gemeistert = alle Fragen Fach ≥ 4; in_arbeit = mind. eine beantwortet;
-- gesperrt = vorige Lektion < 60 % beantwortet (nicht in Ortskunde); sonst offen.
CREATE OR REPLACE FUNCTION get_learn_plan(p_user TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  exam DATE;
  today DATE := (now() AT TIME ZONE 'Europe/Vienna')::date;
  days_left INTEGER;
  remaining INTEGER;
  per_day INTEGER;
BEGIN
  PERFORM set_config('app.user_id', p_user, true);
  SELECT "targetExamDate"::date INTO exam FROM "User" WHERE id = p_user;
  days_left := CASE WHEN exam IS NOT NULL AND exam >= today THEN exam - today ELSE NULL END;

  CREATE TEMP TABLE IF NOT EXISTS _lp_lessons (
    category_id TEXT, lesson_index INT, n INT, answered INT, solid INT, any_due BOOLEAN, progress NUMERIC,
    questions jsonb, cat_order INT, slug TEXT, prev_share NUMERIC, lstatus TEXT, rnk INT
  ) ON COMMIT DROP;
  TRUNCATE _lp_lessons;

  INSERT INTO _lp_lessons (category_id, lesson_index, n, answered, solid, any_due, progress, questions, cat_order, slug)
  SELECT v.category_id, v.lesson_index, COUNT(*), COUNT(*) FILTER (WHERE v.box IS NOT NULL), COUNT(*) FILTER (WHERE v.box >= 4),
         BOOL_OR(v.faellig), AVG(COALESCE(v.box, 0)) / 5.0,
         jsonb_agg(jsonb_build_object(
           'id', v.question_id,
           'short_title', CASE WHEN length(v.text) > 60 THEN left(v.text, 60) || '…' ELSE v.text END,
           'type', v.type, 'status', v.status, 'faellig', v.faellig, 'box', v.box
         ) ORDER BY v.difficulty, v.question_id),
         MIN(c."order"), MIN(c.slug)
  FROM learn_plan_view v JOIN "Category" c ON c.id = v.category_id
  GROUP BY v.category_id, v.lesson_index;

  UPDATE _lp_lessons l SET prev_share = p.share
  FROM (SELECT category_id, lesson_index, LAG(answered::numeric / n) OVER (PARTITION BY category_id ORDER BY lesson_index) AS share FROM _lp_lessons) p
  WHERE p.category_id = l.category_id AND p.lesson_index = l.lesson_index;

  UPDATE _lp_lessons SET lstatus = CASE
    WHEN solid = n THEN 'gemeistert'
    WHEN answered > 0 THEN 'in_arbeit'
    WHEN prev_share IS NOT NULL AND prev_share < 0.6 AND slug <> 'ortskenntnisse-wien' THEN 'gesperrt'
    ELSE 'offen'
  END;

  UPDATE _lp_lessons l SET rnk = r.rnk
  FROM (SELECT category_id, lesson_index, ROW_NUMBER() OVER (ORDER BY (lstatus = 'in_arbeit') DESC, cat_order, lesson_index) AS rnk
        FROM _lp_lessons WHERE lstatus IN ('in_arbeit', 'offen')) r
  WHERE r.category_id = l.category_id AND r.lesson_index = l.lesson_index;

  SELECT COUNT(*) INTO remaining FROM _lp_lessons WHERE lstatus <> 'gemeistert';
  per_day := CASE WHEN days_left IS NULL THEN 2 ELSE GREATEST(1, CEIL(remaining::numeric / GREATEST(days_left, 1)))::int END;

  SELECT jsonb_build_object(
    'sections', COALESCE((
      SELECT jsonb_agg(sec ORDER BY sec_order)
      FROM (
        SELECT c."order" AS sec_order, jsonb_build_object(
          'id', c.id, 'name', c.name, 'slug', c.slug, 'icon', c.icon, 'color', c.color,
          'progress', ROUND(COALESCE((SELECT AVG(COALESCE(v.box, 0)) / 5.0 FROM learn_plan_view v WHERE v.category_id = c.id), 0) * 100),
          'counts', (SELECT jsonb_build_object(
              'total', COUNT(*),
              'neu', COUNT(*) FILTER (WHERE status = 'neu'),
              'falsch', COUNT(*) FILTER (WHERE status = 'falsch'),
              'lernen', COUNT(*) FILTER (WHERE status = 'lernen'),
              'sicher', COUNT(*) FILTER (WHERE status = 'sicher'),
              'gemeistert', COUNT(*) FILTER (WHERE status = 'gemeistert'),
              'faellig', COUNT(*) FILTER (WHERE faellig))
            FROM learn_plan_view v WHERE v.category_id = c.id),
          'lessons', (SELECT jsonb_agg(jsonb_build_object(
              'index', l.lesson_index, 'status', l.lstatus, 'progress', ROUND(l.progress * 100),
              'answered', l.answered, 'size', l.n,
              'in_today_plan', (l.rnk IS NOT NULL AND l.rnk <= per_day) OR (l.any_due AND l.lstatus <> 'gesperrt'),
              'questions', l.questions) ORDER BY l.lesson_index)
            FROM _lp_lessons l WHERE l.category_id = c.id)
        ) AS sec
        FROM "Category" c
        WHERE c."isActive" AND EXISTS (SELECT 1 FROM _lp_lessons l WHERE l.category_id = c.id)
      ) s
    ), '[]'::jsonb),
    'totals', (SELECT jsonb_build_object(
        'total', COUNT(*),
        'neu', COUNT(*) FILTER (WHERE status = 'neu'),
        'falsch', COUNT(*) FILTER (WHERE status = 'falsch'),
        'faellig', COUNT(*) FILTER (WHERE faellig),
        'gemeistert', COUNT(*) FILTER (WHERE status = 'gemeistert'),
        'progress', ROUND(COALESCE(AVG(COALESCE(box, 0)) / 5.0, 0) * 100))
      FROM learn_plan_view),
    'goal', jsonb_build_object('remaining_lessons', remaining, 'per_day', per_day, 'exam_date', exam, 'days_left', days_left),
    'next', (SELECT jsonb_build_object('category_id', l.category_id, 'lesson_index', l.lesson_index, 'section', c.name, 'status', l.lstatus)
             FROM _lp_lessons l JOIN "Category" c ON c.id = l.category_id WHERE l.rnk = 1)
  ) INTO result;

  RETURN result;
END;
$$;

-- Nur die App (Owner) – keine öffentlichen Supabase-Rollen
REVOKE ALL ON FUNCTION get_learn_plan(TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION get_learn_plan(TEXT) FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON learn_plan_view FROM anon, authenticated';
  END IF;
END $$;
