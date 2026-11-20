-- CreateTable
CREATE TABLE "NumberFact" (
    "id" TEXT NOT NULL,
    "examMode" VARCHAR(20) NOT NULL DEFAULT 'TAXI',
    "category" VARCHAR(80) NOT NULL,
    "statement" TEXT NOT NULL,
    "value" VARCHAR(40) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT '',
    "distractors" TEXT[],
    "legalReference" VARCHAR(255),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sourceQuestionId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NumberFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 1,
    "dueDate" DATE NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "timesWrong" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NumberProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "fromName" VARCHAR(120) NOT NULL,
    "toName" VARCHAR(120) NOT NULL,
    "streets" TEXT[],
    "path" JSONB NOT NULL,
    "examMode" VARCHAR(20) NOT NULL DEFAULT 'TAXI',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stageIndex" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "fullCorrectDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NumberFact_verified_category_idx" ON "NumberFact"("verified", "category");

-- CreateIndex
CREATE INDEX "NumberProgress_userId_dueDate_idx" ON "NumberProgress"("userId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "NumberProgress_userId_factId_key" ON "NumberProgress"("userId", "factId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_slug_key" ON "Route"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RouteProgress_userId_routeId_stageIndex_key" ON "RouteProgress"("userId", "routeId", "stageIndex");

-- AddForeignKey
ALTER TABLE "NumberProgress" ADD CONSTRAINT "NumberProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumberProgress" ADD CONSTRAINT "NumberProgress_factId_fkey" FOREIGN KEY ("factId") REFERENCES "NumberFact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteProgress" ADD CONSTRAINT "RouteProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteProgress" ADD CONSTRAINT "RouteProgress_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase: RLS an, kein Zugriff für öffentliche Rollen (Fakten/Routen lesen alle über die App, schreiben nur Admins)
ALTER TABLE "NumberFact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NumberProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Route" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RouteProgress" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "NumberFact", "NumberProgress", "Route", "RouteProgress" FROM anon, authenticated';
  END IF;
END $$;
