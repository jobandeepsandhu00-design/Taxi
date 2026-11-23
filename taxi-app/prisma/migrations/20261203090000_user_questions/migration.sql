-- CreateTable
CREATE TABLE "user_chapters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_questions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" VARCHAR(10) NOT NULL,
    "base_question_id" TEXT,
    "category_id" TEXT,
    "user_chapter_id" TEXT,
    "text" TEXT,
    "options" JSONB,
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_chapters_user_id_idx" ON "user_chapters"("user_id");

-- CreateIndex
CREATE INDEX "user_questions_user_id_category_id_idx" ON "user_questions"("user_id", "category_id");

-- CreateIndex
CREATE INDEX "user_questions_user_chapter_id_idx" ON "user_questions"("user_chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_questions_user_id_base_question_id_key" ON "user_questions"("user_id", "base_question_id");

-- AddForeignKey
ALTER TABLE "user_chapters" ADD CONSTRAINT "user_chapters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_questions" ADD CONSTRAINT "user_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_questions" ADD CONSTRAINT "user_questions_base_question_id_fkey" FOREIGN KEY ("base_question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_questions" ADD CONSTRAINT "user_questions_user_chapter_id_fkey" FOREIGN KEY ("user_chapter_id") REFERENCES "user_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "user_chapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_questions" ENABLE ROW LEVEL SECURITY;
