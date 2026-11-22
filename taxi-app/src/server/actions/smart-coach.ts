"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { contextFromHits } from "@/lib/coach/ai";
import { evaluateRules, topWeaknesses } from "@/lib/coach/rules";
import { normalizeDe } from "@/lib/oral";
import { projectReadyDate } from "@/lib/readiness";
import { aiFallback } from "@/server/coach/ai-provider";
import { searchKnowledge, type KnowledgeHit } from "@/server/coach/knowledge";
import { getUserStats, readinessHistory } from "@/server/coach/stats";

export type ToniCard = {
  title: string;
  answer: string | null;
  explanation: string | null;
  mnemonic: string | null;
  legal: string | null;
  chapter: string | null;
  route: string | null;
  kind: KnowledgeHit["kind"];
  snippet: string;
};

export type ToniAnswer =
  | {
      type: "search";
      query: string;
      best: ToniCard | null;
      similar: { title: string; query: string }[];
      faqs: { title: string; answer: string; route: string | null }[];
      aiText: string | null;
      suggestions: string[];
    }
  | { type: "info"; query: string; title: string; text: string; items: { label: string; value?: string; route?: string }[]; action?: { label: string; route: string } };

const SUGGESTIONS = ["Was ist Prokura?", "Schutzweg", "Lenkzeit", "Kapitel-Check", "Was muss ich zur Prüfung mitnehmen?", "Stille Reserve"];

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function toCard(h: KnowledgeHit): ToniCard {
  const e = h.extra as { answer?: string; explanation?: string; mnemonic?: string | null; legal?: string | null; value?: string; unit?: string };
  const answer = h.kind === "number" ? `${e.value ?? ""} ${e.unit ?? ""}`.trim() : (e.answer ?? null);
  const explanation = e.explanation && answer && norm(e.explanation) !== norm(answer) ? e.explanation : null;
  return {
    title: h.kind === "number" ? h.title.replace("{x}", "…") : h.title,
    answer: h.kind === "chapter" || h.kind === "summary" ? h.body.slice(0, 600) : answer,
    explanation,
    mnemonic: e.mnemonic ?? null,
    legal: e.legal ?? null,
    chapter: h.category,
    route: h.kind === "question" ? `/fragen/${h.refId}` : h.route,
    kind: h.kind,
    snippet: h.snippet,
  };
}

/** Feste Absichten (Schnell-Chips oder getippte Frage) → regelbasierte Antwort. */
type Intent = "today" | "status" | "weak" | "tips" | "numbers";
function detectIntent(q: string): Intent | null {
  const n = normalizeDe(q);
  if (/(heute|jetzt) (lernen|uben|machen)|was soll ich|mein plan|tagesplan/.test(n)) return "today";
  if (/wie stehe ich|wie steh ich|mein stand|wie gut bin ich|prufungsreife|bin ich bereit|mein fortschritt/.test(n)) return "status";
  if (/meine schwach|schwachen|wo bin ich schlecht|schwachstelle/.test(n)) return "weak";
  if (/prufungstipp|tipps? fur die prufung|prufungstag tipp/.test(n)) return "tips";
  if (/wichtige zahlen|zahlen lernen|welche zahlen/.test(n)) return "numbers";
  return null;
}

const fmtDate = (d: string) => new Intl.DateTimeFormat("de-AT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${d}T12:00:00Z`));

async function intentAnswer(userId: string, intent: Intent, query: string): Promise<ToniAnswer> {
  if (intent === "tips") {
    const [day, exam] = await Promise.all([
      prisma.coachFaq.findMany({ where: { category: "Prüfungstag" }, orderBy: { order: "asc" }, take: 5 }),
      prisma.coachFaq.findMany({ where: { category: "Prüfung" }, orderBy: { order: "asc" }, take: 2 }),
    ]);
    const faqs = [...day, ...exam];
    return { type: "info", query, title: "Meine Prüfungstipps", text: "Das Wichtigste für die Prüfung – kurz und knapp:", items: faqs.map((f) => ({ label: f.questionDe, value: f.answerDe, route: f.linkRoute ?? undefined })) };
  }
  if (intent === "numbers") {
    const facts = await prisma.numberFact.findMany({ orderBy: { category: "asc" }, take: 10 });
    return {
      type: "info",
      query,
      title: "Wichtige Zahlen",
      text: facts.length ? "Diese Zahlen solltest du sicher können:" : "Im Zahlen-Trainer übst du Beträge, Fristen und Abstände.",
      items: facts.map((f) => ({ label: f.statement.replace("{x}", "…"), value: `${f.value} ${f.unit}`.trim() })),
      action: { label: "Zahlen-Trainer öffnen", route: "/zahlen" },
    };
  }
  const stats = await getUserStats(userId);
  if (intent === "today") {
    const ins = evaluateRules(stats).filter((i) => i.action).slice(0, 4);
    return { type: "info", query, title: "Das würde ich heute lernen", text: ins[0]?.text_de ?? "Mach eine Mini-Lektion – 5 Fragen, ca. 3 Minuten.", items: ins.map((i) => ({ label: i.title_de, route: i.action!.route })) };
  }
  if (intent === "weak") {
    const w = topWeaknesses(stats.categories);
    return {
      type: "info",
      query,
      title: "Deine Schwächen",
      text: stats.answeredTotal < 10 ? "Noch zu wenige Antworten für eine genaue Auswertung – das sind die Kapitel mit dem meisten offenen Stoff:" : "Hier lohnt sich Üben am meisten:",
      items: w.map((c) => ({ label: c.name, value: c.accuracy30 !== null ? `${c.accuracy30} % richtig` : `${c.masteredPct} % gemeistert`, route: `/lernen/${c.slug}` })),
    };
  }
  // status
  const hist = await readinessHistory(userId);
  const proj = projectReadyDate(hist, stats.today);
  const readPct = stats.lernbuch.total ? Math.round((stats.lernbuch.read / stats.lernbuch.total) * 100) : 0;
  const items: { label: string; value?: string; route?: string }[] = [
    { label: "Prüfungsreife", value: stats.readiness !== null ? `${stats.readiness} / 100` : "noch offen", route: "/fortschritt" },
    { label: "Trefferquote (7 Tage)", value: stats.accuracy7 !== null ? `${stats.accuracy7} %` : "–" },
    { label: "Lernbuch gelesen", value: `${readPct} %`, route: "/lernbuch" },
    { label: "Serie", value: `${stats.streak} ${stats.streak === 1 ? "Tag" : "Tage"}` },
  ];
  if (stats.daysToExam !== null && stats.daysToExam >= 0) items.push({ label: "Bis zur Prüfung", value: `${stats.daysToExam} Tage` });
  const text = proj.enoughData && proj.date ? `Wenn du so weitermachst, bist du voraussichtlich am ${fmtDate(proj.date)} prüfungsbereit.` : stats.readiness !== null && stats.readiness >= 80 ? "Du bist richtig gut vorbereitet!" : "Bleib dran – nach ein paar Lerntagen kann ich dir eine Prognose geben.";
  return { type: "info", query, title: "So stehst du", text, items };
}

/** „Frag Toni“: Absicht erkennen oder Wissensbasis durchsuchen (ohne KI; KI nur optional, wenn nichts gefunden wird). */
export async function askToniAction(raw: string): Promise<ToniAnswer> {
  const user = await requireUser();
  const query = z.string().trim().min(1).max(200).catch("").parse(raw);
  if (!query) return { type: "search", query, best: null, similar: [], faqs: [], aiText: null, suggestions: SUGGESTIONS };
  const intent = detectIntent(query);
  if (intent) return intentAnswer(user.id, intent, query);

  const hits = await searchKnowledge(query, 14);
  const faqHits = hits.filter((h) => h.kind === "faq");
  const content = hits.filter((h) => h.kind !== "faq");
  // Beste Antwort: FAQ nur, wenn sie deutlich besser passt als der beste Inhalt
  const bestHit = faqHits[0] && (!content[0] || faqHits[0].rank >= content[0].rank * 1.2) ? faqHits[0] : (content[0] ?? faqHits[0] ?? null);
  const best = bestHit ? toCard(bestHit) : null;
  const similar = content
    .filter((h) => h !== bestHit && h.kind === "question" && (!bestHit || h.rank >= bestHit.rank * 0.8))
    .slice(0, 5)
    .map((h) => ({ title: h.title.length > 70 ? `${h.title.slice(0, 67)}…` : h.title, query: h.title }));
  const faqs = faqHits
    .filter((h) => h !== bestHit)
    .slice(0, 3)
    .map((h) => ({ title: h.title, answer: String((h.extra as { answer?: string }).answer ?? h.body), route: h.route }));
  let aiText: string | null = null;
  if (!best) aiText = await aiFallback(query, contextFromHits(hits));
  // Vorschläge: Kapitelnamen, die zur Anfrage passen, sonst Standard
  const suggestions = best ? [] : SUGGESTIONS;
  return { type: "search", query, best, similar, faqs, aiText, suggestions };
}
