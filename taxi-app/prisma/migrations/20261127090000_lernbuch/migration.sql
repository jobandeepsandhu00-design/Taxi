-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "mnemonic" TEXT;

-- CreateTable
CREATE TABLE "ReadProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "status" VARCHAR(12) NOT NULL,
    "timesRead" INTEGER NOT NULL DEFAULT 1,
    "understoodDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "nextRepeatAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "lastPosition" INTEGER NOT NULL DEFAULT 0,
    "checkScore" INTEGER,
    "checkPassed" BOOLEAN NOT NULL DEFAULT false,
    "unlockedForQuiz" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterSummary" (
    "categoryId" TEXT NOT NULL,
    "contentDe" TEXT NOT NULL,
    "keyNumbers" JSONB NOT NULL DEFAULT '[]',
    "traps" JSONB NOT NULL DEFAULT '[]',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterSummary_pkey" PRIMARY KEY ("categoryId")
);

-- CreateTable
CREATE TABLE "LernbuchSettings" (
    "userId" TEXT NOT NULL,
    "autoAdvanceSec" INTEGER,
    "showWrongAnswers" BOOLEAN NOT NULL DEFAULT false,
    "textSize" VARCHAR(2) NOT NULL DEFAULT 'm',
    "audioSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "quizOnlyUnlocked" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LernbuchSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "ReadProgress_userId_status_idx" ON "ReadProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "ReadProgress_userId_nextRepeatAt_idx" ON "ReadProgress"("userId", "nextRepeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadProgress_userId_questionId_key" ON "ReadProgress"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterProgress_userId_categoryId_key" ON "ChapterProgress"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "ReadProgress" ADD CONSTRAINT "ReadProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadProgress" ADD CONSTRAINT "ReadProgress_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterProgress" ADD CONSTRAINT "ChapterProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterProgress" ADD CONSTRAINT "ChapterProgress_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterSummary" ADD CONSTRAINT "ChapterSummary_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LernbuchSettings" ADD CONSTRAINT "LernbuchSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "ReadProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChapterProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChapterSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LernbuchSettings" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "ReadProgress", "ChapterProgress", "ChapterSummary", "LernbuchSettings" FROM anon, authenticated';
  END IF;
END $$;
