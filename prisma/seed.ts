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
    create: { email: adminEmail, name: "Administrator", role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 12), regionId: wien.id },
    update: { role: "ADMIN", isActive: true },
  });
  if (process.env.SEED_DEMO_STUDENT !== "false") {
    await prisma.user.upsert({
      where: { email: "demo@taxi-pruefung.at" },
      create: { email: "demo@taxi-pruefung.at", name: "Demo Lernende", role: "STUDENT", passwordHash: await bcrypt.hash("Lernen!2026demo", 12), regionId: wien.id },
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
  for (const c of categories) {
    const data = {
      name: c.name,
      shortDescription: c.shortDescription,
      introduction: c.introduction,
      color: c.color,
      icon: c.icon,
      order: c.order,
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
  for (const q of questions) {
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

  const counts = {
    kategorien: await prisma.category.count(),
    fragen: await prisma.question.count(),
    quellen: await prisma.questionSource.count(),
    pruefungen: await prisma.examConfig.count(),
  };
  console.log("Seed abgeschlossen:", counts);
  console.log(`Admin: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
