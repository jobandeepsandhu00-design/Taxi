-- AlterTable
ALTER TABLE "notification_prefs" ADD COLUMN     "story_alerts" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "story_groups" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "title_de" VARCHAR(60) NOT NULL,
    "icon_image" VARCHAR(300),
    "ring_colors" JSONB,
    "type" VARCHAR(12) NOT NULL,
    "is_personal" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active_from" TIMESTAMP(3),
    "active_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_slides" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "image_path" VARCHAR(300),
    "video_path" VARCHAR(300),
    "bg_color" VARCHAR(40),
    "emoji" VARCHAR(16),
    "title_de" VARCHAR(120) NOT NULL,
    "body_de" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL DEFAULT 6000,
    "cta" JSONB,
    "quiz" JSONB,
    "map" JSONB,
    "image_credit" VARCHAR(200),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_views" (
    "user_id" TEXT NOT NULL,
    "slide_id" VARCHAR(120) NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_views_pkey" PRIMARY KEY ("user_id","slide_id")
);

-- CreateTable
CREATE TABLE "story_daily" (
    "day" DATE NOT NULL,
    "group_key" VARCHAR(40) NOT NULL,
    "slides" JSONB NOT NULL,
    "source_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_daily_pkey" PRIMARY KEY ("day","group_key")
);

-- CreateTable
CREATE TABLE "story_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_key" VARCHAR(40) NOT NULL,
    "slide_id" VARCHAR(120),
    "kind" VARCHAR(12) NOT NULL,
    "correct" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "story_groups_key_key" ON "story_groups"("key");

-- CreateIndex
CREATE INDEX "story_slides_group_id_sort_idx" ON "story_slides"("group_id", "sort");

-- CreateIndex
CREATE INDEX "story_views_slide_id_idx" ON "story_views"("slide_id");

-- CreateIndex
CREATE INDEX "story_events_group_key_kind_idx" ON "story_events"("group_key", "kind");

-- AddForeignKey
ALTER TABLE "story_slides" ADD CONSTRAINT "story_slides_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "story_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "story_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_slides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_daily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_events" ENABLE ROW LEVEL SECURITY;
