-- AlterTable
ALTER TABLE "ReviewItem" ADD COLUMN     "timesCorrect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timesWrong" INTEGER NOT NULL DEFAULT 0;


-- Zähler aus der bisherigen Antworthistorie nachtragen
UPDATE "ReviewItem" ri SET
  "timesCorrect" = s.c,
  "timesWrong" = s.w
FROM (
  SELECT "userId", "questionId", COUNT(*) FILTER (WHERE "isCorrect") AS c, COUNT(*) FILTER (WHERE NOT "isCorrect") AS w
  FROM "UserAnswer" GROUP BY "userId", "questionId"
) s
WHERE s."userId" = ri."userId" AND s."questionId" = ri."questionId";

-- Leitner-Logik atomar in der Datenbank:
-- richtig → Fach +1 (max. 5), falsch → Fach 1, richtig aber unsicher → Fach bleibt.
-- Intervalle: Fach 1 = 1 Tag, 2 = 2, 3 = 4, 4 = 8, 5 = 16 Tage.
CREATE OR REPLACE FUNCTION update_progress(p_user TEXT, p_question TEXT, p_correct BOOLEAN, p_unsure BOOLEAN, p_today DATE)
RETURNS TABLE(old_box INTEGER, new_box INTEGER, next_review DATE)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  ob INTEGER;
  nb INTEGER;
  intervals INTEGER[] := ARRAY[1, 2, 4, 8, 16];
BEGIN
  SELECT box INTO ob FROM "ReviewItem" WHERE "userId" = p_user AND "questionId" = p_question FOR UPDATE;
  IF NOT p_correct THEN
    nb := 1;
  ELSIF p_unsure THEN
    nb := GREATEST(1, COALESCE(ob, 1));
  ELSE
    nb := LEAST(5, GREATEST(1, COALESCE(ob, 1)) + 1);
  END IF;

  INSERT INTO "ReviewItem" ("id", "userId", "questionId", "box", "dueDate", "lastReviewedAt", "timesCorrect", "timesWrong")
  VALUES ('ri' || md5(random()::text || clock_timestamp()::text), p_user, p_question, nb, p_today + intervals[nb], now(),
          CASE WHEN p_correct THEN 1 ELSE 0 END, CASE WHEN p_correct THEN 0 ELSE 1 END)
  ON CONFLICT ("userId", "questionId") DO UPDATE SET
    "box" = nb,
    "dueDate" = p_today + intervals[nb],
    "lastReviewedAt" = now(),
    "timesCorrect" = "ReviewItem"."timesCorrect" + CASE WHEN p_correct THEN 1 ELSE 0 END,
    "timesWrong" = "ReviewItem"."timesWrong" + CASE WHEN p_correct THEN 0 ELSE 1 END;

  RETURN QUERY SELECT ob, nb, p_today + intervals[nb];
END;
$$;

-- Nur die App (Owner) darf die Funktion aufrufen, nicht die öffentlichen Supabase-Rollen
REVOKE ALL ON FUNCTION update_progress(TEXT, TEXT, BOOLEAN, BOOLEAN, DATE) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION update_progress(TEXT, TEXT, BOOLEAN, BOOLEAN, DATE) FROM anon, authenticated';
  END IF;
END $$;
