-- CreateTable
CREATE TABLE "internal_cron_key" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "key" TEXT NOT NULL,

    CONSTRAINT "internal_cron_key_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "internal_cron_key" ENABLE ROW LEVEL SECURITY;

-- Zufälliger Schlüssel, nur in der Datenbank bekannt
INSERT INTO "internal_cron_key" ("id", "key")
VALUES (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT ("id") DO NOTHING;
