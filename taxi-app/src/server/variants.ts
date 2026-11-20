import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { langInfo } from "@/lib/languages";
import { COACH_MODEL, coachFake, parseCoach, streamCoach } from "./coach/llm";

/**
 * KI-Varianten einer Frage (Einfache Sprache, Glossar, Übersetzung, „Warum?“).
 * Einmal erzeugen → in QuestionVariant speichern → danach immer aus der DB.
 * Regeln: Bedeutung exakt beibehalten, Reihenfolge/Buchstaben beibehalten, nichts hinzufügen,
 * die richtige Antwort in Vereinfachung/Übersetzung nicht verraten.
 */

export const NO_SOURCE_SENTENCE = "Für Details prüfe den offiziellen Fragenkatalog.";
export const EXAM_GERMAN_HINT = "Die Prüfung ist auf Deutsch – lerne die deutschen Begriffe.";

export type SimpleContent = { text: string; options: { label: string; text: string }[] };
export type GlossaryContent = { terms: { term: string; definition: string }[] };
export type TranslationContent = { question: string; options: { label: string; text: string }[]; explanation?: string };
export type WhyContent = { text: string };

export interface VariantRow<T> {
  id: string;
  content: T;
  verified: boolean;
}

const modelName = () => (coachFake() ? "testmodus" : COACH_MODEL);

export async function getVariant<T>(questionId: string, kind: string, lang = "de"): Promise<VariantRow<T> | null> {
  const v = await prisma.questionVariant.findUnique({ where: { questionId_kind_lang: { questionId, kind, lang } }, select: { id: true, content: true, verified: true } });
  return v ? { id: v.id, content: v.content as T, verified: v.verified } : null;
}

async function save<T>(questionId: string, kind: string, lang: string, content: T): Promise<VariantRow<T>> {
  const v = await prisma.questionVariant.upsert({
    where: { questionId_kind_lang: { questionId, kind, lang } },
    create: { questionId, kind, lang, content: content as object, model: modelName() },
    update: {},
    select: { id: true, content: true, verified: true },
  });
  return { id: v.id, content: v.content as T, verified: v.verified };
}

async function loadQuestion(questionId: string) {
  return prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, text: true, explanation: true, sourceDetail: true, options: { orderBy: { order: "asc" }, select: { id: true, label: true, text: true, isCorrect: true, explanation: true } } },
  });
}
type Q = NonNullable<Awaited<ReturnType<typeof loadQuestion>>>;

const optionList = (q: Q) => q.options.map((o) => `${o.label}) ${o.text}`).join("\n");
const sameOptions = (q: Q, opts: { label: string }[]) => opts.length === q.options.length && q.options.every((o, i) => opts[i]?.label === o.label);

const simpleSchema = z.object({
  text: z.string(),
  options: z.array(z.object({ label: z.string(), text: z.string() })),
  glossary: z.array(z.object({ term: z.string(), definition: z.string() })),
});

/** Einfache Sprache (B1) + Glossar schwieriger Wörter in einem Aufruf. */
export async function generateSimple(questionId: string): Promise<{ simple: VariantRow<SimpleContent>; glossary: VariantRow<GlossaryContent> } | null> {
  const q = await loadQuestion(questionId);
  if (!q) return null;
  const out = await parseCoach({
    context: "Aufgabe: sprachliche Vereinfachung einer Prüfungsfrage ohne inhaltliche Änderung.",
    prompt: `Schreibe diese Prüfungsfrage und ihre Antwortmöglichkeiten in Einfacher Sprache (Deutsch, Niveau B1): kurze Sätze, gebräuchliche Wörter, kein Juristendeutsch.
Regeln:
- Die Bedeutung jeder Antwort bleibt exakt gleich. Nichts hinzufügen, nichts weglassen.
- Reihenfolge und Buchstaben der Antworten beibehalten (gleiche Anzahl).
- Verrate nicht, welche Antwort richtig ist, und mach keine Antwort eindeutiger als im Original.
Zusätzlich: Liste bis zu 5 schwierige Wörter oder Fachbegriffe, die WÖRTLICH im Originaltext vorkommen, je mit einer Erklärung in einem kurzen Satz (B1).

Frage: ${q.text}
${optionList(q)}`,
    schema: simpleSchema,
    fake: () => ({
      text: `Einfach gesagt: ${q.text}`,
      options: q.options.map((o) => ({ label: o.label, text: o.text })),
      glossary: (q.text.match(/[A-ZÄÖÜ][a-zäöüß]{11,}/g) ?? []).slice(0, 2).map((term) => ({ term, definition: `„${term}“ ist ein Fachbegriff aus der Prüfung (Testmodus).` })),
    }),
    maxTokens: 3000,
  });
  if (!out || !sameOptions(q, out.options)) return null;
  const terms = out.glossary.filter((g) => g.term.length > 2 && q.text.includes(g.term)).slice(0, 5);
  const [simple, glossary] = await Promise.all([
    save<SimpleContent>(q.id, "simple", "de", { text: out.text, options: out.options }),
    save<GlossaryContent>(q.id, "glossary", "de", { terms }),
  ]);
  return { simple, glossary };
}

const translationSchema = z.object({
  question: z.string(),
  options: z.array(z.object({ label: z.string(), text: z.string() })),
  explanation: z.string(),
});

/** Übersetzung (Frage, Antworten, Erklärung) – deutsche Schlüsselbegriffe bleiben in Klammern. */
export async function generateTranslation(questionId: string, lang: string): Promise<VariantRow<TranslationContent> | null> {
  const q = await loadQuestion(questionId);
  if (!q) return null;
  const target = langInfo(lang);
  const out = await parseCoach({
    context: "Aufgabe: Übersetzungshilfe für eine deutschsprachige Taxi-Prüfung in Wien.",
    prompt: `Übersetze die folgende Prüfungsfrage, die Antwortmöglichkeiten und die Erklärung ins ${target.name} (${target.label}).
Regeln:
- Bedeutung exakt beibehalten, nichts hinzufügen oder weglassen.
- Reihenfolge und Buchstaben der Antworten beibehalten (gleiche Anzahl).
- Wichtige deutsche Fachbegriffe (z. B. Vorrang, Schutzweg, Konzession) bleiben zusätzlich auf Deutsch in Klammern stehen, z. B. „right of way (Vorrang)“.
- Verrate in der Frage und den Antworten nicht, welche richtig ist.

Frage: ${q.text}
${optionList(q)}
Erklärung: ${q.explanation}`,
    schema: translationSchema,
    fake: () => ({ question: `[${lang}] ${q.text}`, options: q.options.map((o) => ({ label: o.label, text: `[${lang}] ${o.text}` })), explanation: `[${lang}] ${q.explanation}` }),
    maxTokens: 4000,
  });
  if (!out || !sameOptions(q, out.options)) return null;
  return save<TranslationContent>(q.id, "translation", lang, out);
}

function whySource(q: Q): string {
  return `Frage (question_de): ${q.text}
Antwortmöglichkeiten:
${q.options.map((o) => `${o.label}) ${o.text}${o.isCorrect ? " [richtig]" : " [falsch]"}${o.explanation ? ` – ${o.explanation}` : ""}`).join("\n")}
Erklärung (explanation_de): ${q.explanation}
Rechtsgrundlage (legal_reference): ${q.sourceDetail ?? "keine"}`;
}

/** „Warum?“-Erklärung streamen und anschließend speichern (Struktur: Regel, Beispiel, Merkhilfe, Rechtsgrundlage). */
export async function* streamWhy(questionId: string, lang: string): AsyncGenerator<string, VariantRow<WhyContent> | null> {
  const q = await loadQuestion(questionId);
  if (!q) return null;
  const target = lang === "de" ? null : langInfo(lang);
  const instruction = `Erkläre die Regel hinter dieser Prüfungsfrage in höchstens 80 Wörtern${target ? `, auf ${target.name}; deutsche Fachbegriffe in Klammern beibehalten` : " in einfachem Deutsch (du-Form)"}.
Format – genau diese Zeilen, jeweils mit dem Präfix:
Regel: (1–2 Sätze)
Beispiel: (1–2 Sätze aus dem Taxi-Alltag in Wien)
Merkhilfe: (optional, 1 Zeile – weglassen, wenn nichts Sinnvolles passt)
${q.sourceDetail ? `Rechtsgrundlage: ${q.sourceDetail} (wörtlich übernehmen)` : "(keine Zeile „Rechtsgrundlage“ – es ist keine angegeben)"}
Verwende ausschließlich die Quelle. Erfinde keine Paragraphen oder Gesetze. Reicht die Quelle nicht, schreibe stattdessen: „${NO_SOURCE_SENTENCE}“`;
  const fake = () =>
    [
      `Regel: ${q.explanation.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ")}`,
      "Beispiel: Ein Fahrgast fragt dich genau das während der Fahrt durch Wien – mit dieser Regel bist du auf der sicheren Seite.",
      "Merkhilfe: Erst denken, dann fahren.",
      q.sourceDetail ? `Rechtsgrundlage: ${q.sourceDetail}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  let full = "";
  for await (const chunk of streamCoach({ context: `Quelle (nur diese verwenden):\n${whySource(q)}`, messages: [{ role: "user", content: instruction }], fake, maxTokens: 1500 })) {
    full += chunk;
    yield chunk;
  }
  if (!full.trim()) return null;
  return save<WhyContent>(q.id, "why", lang, { text: full.trim() });
}

const whyWrongSchema = z.object({ items: z.array(z.object({ label: z.string(), text: z.string() })) });

/** „Warum war deine Antwort falsch?“ – je falscher Antwort ein Satz; alle auf einmal erzeugt und einzeln gespeichert. */
export async function getOrCreateWhyWrong(questionId: string, label: string, lang: string): Promise<VariantRow<WhyContent> | null> {
  const kind = `why_wrong_${label}`;
  const cached = await getVariant<WhyContent>(questionId, kind, lang);
  if (cached) return cached;
  const q = await loadQuestion(questionId);
  if (!q) return null;
  const wrong = q.options.filter((o) => !o.isCorrect);
  if (!wrong.some((o) => o.label === label)) return null;
  const target = lang === "de" ? null : langInfo(lang);
  const out = await parseCoach({
    context: `Quelle (nur diese verwenden):\n${whySource(q)}`,
    prompt: `Erkläre für jede falsche Antwort (${wrong.map((o) => o.label).join(", ")}) in genau einem kurzen Satz${target ? ` auf ${target.name}` : " in einfachem Deutsch"}, warum sie falsch ist. Nur aus der Quelle, nichts erfinden. Reicht die Quelle nicht: „${NO_SOURCE_SENTENCE}“`,
    schema: whyWrongSchema,
    fake: () => ({ items: wrong.map((o) => ({ label: o.label, text: o.explanation ?? `Antwort ${o.label} trifft laut Erklärung nicht zu.` })) }),
    maxTokens: 1500,
  });
  if (!out) return null;
  let mine: VariantRow<WhyContent> | null = null;
  for (const it of out.items) {
    if (!wrong.some((o) => o.label === it.label)) continue;
    const row = await save<WhyContent>(q.id, `why_wrong_${it.label}`, lang, { text: it.text });
    if (it.label === label) mine = row;
  }
  return mine;
}
