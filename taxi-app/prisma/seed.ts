/**
 * Seed: Regionen, Benutzer (Admin + Demo-Lernender), Quellen, Kategorien, Themen,
 * Demo-Fragen, Prüfungskonfigurationen und Einstellungen.
 * Idempotent – kann mehrfach ausgeführt werden (`npm run db:seed`).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { categories, syllabusNote } from "./seed-data/categories";
import { questions } from "./seed-data/questions";
import { sources } from "./seed-data/sources";
import { seedVariants } from "./seed-data/variants";
import { numberFacts, routes } from "./seed-data/learning-extras";
import { oralQuestions } from "./seed-data/oral-questions";
import { BOOK_CHAPTERS, isBookCategory, konzessionCategories, konzessionQuestions, ORAL_CHAPTER, RETIRED_QUESTION_IDS } from "./seed-data/konzession";
import { buchRwOral, buchRwQuestions } from "./seed-data/buch-rechnungswesen";
import { buchBbChapter } from "./seed-data/buch-buchhaltung";
import { buchPvChapter } from "./seed-data/buch-personal";
import { buchStChapter } from "./seed-data/buch-steuerrecht";
import { buchDbChapter, buchFiChapter, buchVkChapter } from "./seed-data/buch-kosten";
import { buchArChapter } from "./seed-data/buch-arbeitsrecht";
import { buchBoChapter } from "./seed-data/buch-betriebsordnung";
import { buchKvChapter } from "./seed-data/buch-kollektivvertrag";
import { buchGoChapter, buchGrChapter, buchWkChapter } from "./seed-data/buch-gewerbe";
import { buchRest, buchRestChapters } from "./seed-data/buch-rest";

const prisma = new PrismaClient();

const REGIONS = [
  { code: "W", name: "Wien", isActive: true },
  { code: "NOE", name: "Niederösterreich", isActive: false },
  { code: "B", name: "Burgenland", isActive: false },
  { code: "OOE", name: "Oberösterreich", isActive: false },
  { code: "S", name: "Salzburg", isActive: false },
  { code: "ST", name: "Steiermark", isActive: false },
  { code: "K", name: "Kärnten", isActive: false },
  { code: "T", name: "Tirol", isActive: false },
  { code: "V", name: "Vorarlberg", isActive: false },
];

async function main() {
  for (const r of REGIONS) {
    await prisma.region.upsert({ where: { code: r.code }, create: r, update: { name: r.name } });
  }
  const wien = await prisma.region.findUniqueOrThrow({ where: { code: "W" } });

  // Benutzer
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@taxi-pruefung.at").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin!2026sicher";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, name: "Administrator", role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 12), regionId: wien.id, onboardedAt: new Date() },
    update: { role: "ADMIN", isActive: true },
  });
  if (process.env.SEED_DEMO_STUDENT !== "false") {
    await prisma.user.upsert({
      where: { email: "demo@taxi-pruefung.at" },
      create: { email: "demo@taxi-pruefung.at", name: "Demo Lernende", role: "STUDENT", passwordHash: await bcrypt.hash("Lernen!2026demo", 12), regionId: wien.id, onboardedAt: new Date() },
      update: {},
    });
  }

  // Quellen (nicht verifiziert)
  const sourceIds = new Map<string, string>();
  for (const s of sources) {
    const existing = await prisma.questionSource.findFirst({ where: { title: s.title } });
    const row = existing
      ? existing
      : await prisma.questionSource.create({
          data: {
            title: s.title,
            type: s.type,
            reference: s.reference,
            url: s.url,
            verified: false,
            note: "Automatisch angelegt. Fassung und Aktualität vor Verwendung prüfen und erst dann als verifiziert markieren.",
          },
        });
    sourceIds.set(s.key, row.id);
  }

  // Kategorien & Themen
  const categoryIds = new Map<string, string>();
  const topicIds = new Map<string, string>();
  for (const c of [...categories, ...konzessionCategories]) {
    const chapter = BOOK_CHAPTERS[c.slug];
    const data = {
      name: chapter?.name ?? c.name,
      shortDescription: c.shortDescription,
      introduction: c.introduction,
      color: c.color,
      icon: c.icon,
      order: chapter?.order ?? (isBookCategory(c.slug) ? c.order : 100 + c.order),
      isActive: isBookCategory(c.slug),
      difficulty: c.difficulty,
      regionId: wien.id,
    };
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, ...data, syllabusReference: syllabusNote, syllabusVerified: false },
      update: data,
    });
    categoryIds.set(c.slug, cat.id);
    for (const [i, t] of c.topics.entries()) {
      const topic = await prisma.topic.upsert({
        where: { categoryId_slug: { categoryId: cat.id, slug: t.slug } },
        create: { categoryId: cat.id, slug: t.slug, name: t.name, description: t.description, order: i },
        update: { name: t.name, description: t.description, order: i },
      });
      topicIds.set(`${c.slug}/${t.slug}`, topic.id);
    }
  }

  // Demo-Fragen (deterministische IDs → idempotent)
  await prisma.question.updateMany({ where: { id: { in: RETIRED_QUESTION_IDS } }, data: { status: "ARCHIVED" } });
  // Skript-Fragen: Lektionen in Reihenfolge des Skripts (je 5 Fragen)
  const bookChapters = [buchRwQuestions, buchBbChapter.questions, buchPvChapter.questions, buchStChapter.questions, buchVkChapter.questions, buchDbChapter.questions, buchFiChapter.questions, buchArChapter.questions, buchBoChapter.questions, buchKvChapter.questions, buchGoChapter.questions, buchWkChapter.questions, buchGrChapter.questions, ...buchRestChapters.map((c) => c.questions)];
  const bookLesson = new Map(bookChapters.flatMap((list) => list.map((q, i) => [q.id, Math.floor(i / 5) + 1] as const)));
  const retired = new Set(RETIRED_QUESTION_IDS);
  for (const q of [...questions, ...konzessionQuestions, ...bookChapters.flat()].filter((x) => !retired.has(x.id))) {
    const categoryId = categoryIds.get(q.category);
    if (!categoryId) throw new Error(`Unbekannte Kategorie ${q.category} in ${q.id}`);
    const correct = q.options.filter((o) => o[1]).length;
    if (correct === 0) throw new Error(`Frage ${q.id} hat keine richtige Antwort`);
    const data = {
      text: q.text,
      explanation: q.explanation,
      categoryId,
      topicId: q.topic ? topicIds.get(`${q.category}/${q.topic}`) ?? null : null,
      difficulty: q.difficulty,
      multipleCorrect: correct > 1,
      tags: Array.from(new Set(["demo", ...(q.tags ?? [])])),
      status: "PUBLISHED" as const,
      origin: "DEMO" as const,
      sourceId: q.source ? sourceIds.get(q.source) ?? null : null,
      sourceDetail: q.detail ?? null,
      ...(bookLesson.has(q.id) ? { lessonIndex: bookLesson.get(q.id) } : {}),
    };
    await prisma.question.upsert({ where: { id: q.id }, create: { id: q.id, ...data, createdById: admin.id }, update: data });
    for (const [i, [text, isCorrect, explanation]] of q.options.entries()) {
      const label = "ABCD"[i];
      await prisma.answerOption.upsert({
        where: { questionId_label: { questionId: q.id, label } },
        create: { questionId: q.id, label, text, isCorrect, explanation, order: i },
        update: { text, isCorrect, explanation, order: i },
      });
    }
  }

  // Prüfungskonfigurationen (Übungsvorgaben – NICHT verifiziert)
  const examConfigs = [
    {
      name: "Prüfungssimulation Wien (Übungsvorgabe)",
      description: "Gemischte Fragen aus allen Kategorien. Dauer, Fragenanzahl und Bestehensgrenze sind Übungswerte und vom Betreiber mit der offiziellen Prüfungsordnung abzugleichen.",
      durationMinutes: 60,
      questionCount: 40,
      passPercentage: 70,
      isDefault: true,
    },
    {
      name: "Kurztest (15 Minuten)",
      description: "Schneller Wissenscheck mit 15 Fragen.",
      durationMinutes: 15,
      questionCount: 15,
      passPercentage: 70,
      isDefault: false,
    },
  ];
  for (const e of examConfigs) {
    const existing = await prisma.examConfig.findFirst({ where: { name: e.name } });
    if (!existing) {
      await prisma.examConfig.create({
        data: {
          ...e,
          regionId: wien.id,
          verified: false,
          officialReference: "Nicht verifiziert – offizielle Prüfungsordnung der zuständigen Prüfungsstelle in Wien einsehen und Werte anpassen.",
        },
      });
    }
  }

  // Vorab erzeugte KI-Varianten (ungeprüft) – bereits geprüfte/echte Varianten nie überschreiben
  for (const v of seedVariants) {
    const exists = await prisma.question.findUnique({ where: { id: v.questionId }, select: { id: true } });
    if (!exists) continue;
    const rows: { kind: string; lang: string; content: object }[] = [
      { kind: "simple", lang: "de", content: v.simple },
      { kind: "glossary", lang: "de", content: { terms: v.glossary } },
      { kind: "translation", lang: "en", content: v.en },
    ];
    for (const r of rows) {
      const cur = await prisma.questionVariant.findUnique({ where: { questionId_kind_lang: { questionId: v.questionId, kind: r.kind, lang: r.lang } } });
      if (cur && !["testmodus", "migriert", "seed"].includes(cur.model)) continue;
      if (cur?.verified) continue;
      await prisma.questionVariant.upsert({
        where: { questionId_kind_lang: { questionId: v.questionId, kind: r.kind, lang: r.lang } },
        create: { questionId: v.questionId, kind: r.kind, lang: r.lang, content: r.content, model: "seed", verified: false },
        update: { content: r.content, model: "seed" },
      });
    }
  }

  await seedLearningExtras();

  const counts = {
    kategorien: await prisma.category.count(),
    fragen: await prisma.question.count(),
    quellen: await prisma.questionSource.count(),
    pruefungen: await prisma.examConfig.count(),
  };
  console.log("Seed abgeschlossen:", counts);
  console.log(`Admin: ${adminEmail}`);
}

async function seedLearningExtras() {
  // Zahlen-Fakten (ungeprüft); vorhandene nicht überschreiben
  for (const f of numberFacts) {
    const id = `nf-${f.key}`;
    const { key, ...data } = f;
    void key;
    await prisma.numberFact.upsert({ where: { id }, create: { id, ...data, verified: false }, update: {} });
  }
  // Routen (ungeprüft)
  for (const r of routes) {
    await prisma.route.upsert({ where: { slug: r.slug }, create: { ...r, verified: false }, update: {} });
  }
  // Mündliche Prüfungsfragen (ungeprüft)
  for (const o of [...oralQuestions, ...buchRwOral, ...buchBbChapter.oral, ...buchPvChapter.oral, ...buchStChapter.oral, ...buchVkChapter.oral, ...buchDbChapter.oral, ...buchFiChapter.oral, ...buchArChapter.oral, ...buchBoChapter.oral, ...buchKvChapter.oral, ...buchGoChapter.oral, ...buchWkChapter.oral, ...buchGrChapter.oral, ...buchRest.oral]) {
    const slug = ORAL_CHAPTER[o.categorySlug] ?? o.categorySlug;
    const category = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (!category) continue;
    const id = `oq-${o.key}`;
    const { key, categorySlug, ...data } = o;
    void key;
    void categorySlug;
    await prisma.oralQuestion.upsert({ where: { id }, create: { id, ...data, categoryId: category.id, verified: false, catalogVersion: "seed-2026-11" }, update: { categoryId: category.id } });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
