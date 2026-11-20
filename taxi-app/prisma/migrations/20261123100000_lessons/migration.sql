-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" VARCHAR(12) NOT NULL,
    "categoryId" TEXT,
    "lessonIndex" INTEGER,
    "questionIds" TEXT[],
    "quizAttemptId" TEXT,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_quizAttemptId_key" ON "Lesson"("quizAttemptId");

-- CreateIndex
CREATE INDEX "Lesson_userId_createdAt_idx" ON "Lesson"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Lesson_userId_categoryId_lessonIndex_idx" ON "Lesson"("userId", "categoryId", "lessonIndex");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase: RLS an, keine Policies → nur die App (Owner) hat Zugriff
ALTER TABLE "Lesson" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "Lesson" FROM anon, authenticated';
  END IF;
END $$;
