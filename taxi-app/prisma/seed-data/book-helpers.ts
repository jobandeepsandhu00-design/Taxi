/** Baut aus Skript-Fragen (Originalwortlaut) Multiple-Choice- und mündliche Fragen. */
import { shuffled } from "./konzession";
import type { OralSeed } from "./oral-questions";
import type { SeedQuestion } from "./questions";

type Diff = "EASY" | "MEDIUM" | "HARD";
export type BookItem = {
  nr: number;
  topic: string;
  difficulty: Diff;
  /** Frage wie im Skript */
  q: string;
  /** Vollständige Antwort wie im Skript */
  a: string;
  /** 3 falsche Auswahlmöglichkeiten (ohne Angabe: Antworten anderer Fragen des Kapitels) */
  wrong?: [string, string, string];
  /** Kernpunkte für die mündliche Bewertung; [text, false] = optional (ohne Angabe: aus der Antwort abgeleitet) */
  points?: (string | [string, false])[];
};

/** Kernpunkte aus der Skript-Antwort ableiten: nummerierte Zeilen bzw. erster Satz. */
function derivePoints(a: string): (string | [string, false])[] {
  const lines = a.split("\n").map((l) => l.replace(/^\s*(\d+[.)]|[a-z][.)]|[-+=•])\s*/, "").trim()).filter((l) => l.length > 2);
  if (lines.length >= 2) {
    // Sehr kurze Punkte (z. B. „Kur“) lassen sich im Transkript schlecht erkennen → nur optional
    const gradable = (l: string) => /[A-Za-zÄÖÜäöüß]{4,}/.test(l);
    const req = lines.filter(gradable).slice(0, 3).map((l) => l.slice(0, 120));
    const rest = lines.filter((l) => !req.includes(l.slice(0, 120))).slice(0, 3).map((l) => [l.slice(0, 120), false] as [string, false]);
    if (req.length > 0) return [...req, ...rest];
  }
  const sentences = a.split(/(?<=[.!])\s+/).filter((x) => /[A-Za-zÄÖÜäöüß]{4,}/.test(x));
  const first = (sentences.find((x) => x.length >= 15) ?? sentences[0] ?? a).slice(0, 160);
  return [first];
}

/** Drei Antworten anderer Fragen als Ablenker (deterministisch, ähnliche Länge bevorzugt). */
function pickDistractors(items: BookItem[], idx: number): [string, string, string] {
  const own = items[idx].a;
  const others = items.filter((_, i) => i !== idx).map((it) => it.a).filter((a) => a !== own);
  const sorted = others
    .map((a, i) => ({ a, d: Math.abs(a.length - own.length) + ((i * 7919 + idx * 104729) % 97) }))
    .sort((x, y) => x.d - y.d)
    .map((x) => x.a);
  return [sorted[0], sorted[1], sorted[2]];
}

export function buildBookChapter(opts: { category: string; prefix: string; chapterName: string; items: BookItem[] }) {
  const questions: SeedQuestion[] = opts.items.map((it, idx) => {
    const id = `${opts.prefix}-${String(it.nr).padStart(2, "0")}`;
    const wrong = it.wrong ?? pickDistractors(opts.items, idx);
    return {
      id,
      category: opts.category,
      topic: it.topic,
      difficulty: it.difficulty,
      text: it.q,
      options: shuffled(id, [[it.a, true, "Antwort laut Skript."], [wrong[0], false, ""], [wrong[1], false, ""], [wrong[2], false, ""]]),
      explanation: it.a,
      detail: `Skript ${opts.chapterName}, Frage ${it.nr}`,
      tags: ["konzession", "skript"],
    };
  });
  const oral: OralSeed[] = opts.items.map((it) => {
    const keyPoints = (it.points ?? derivePoints(it.a)).map((p, i) => (Array.isArray(p) ? { id: `k${i + 1}`, text: p[0], required: false } : { id: `k${i + 1}`, text: p, required: true }));
    const first = keyPoints.find((k) => k.required) ?? keyPoints[0];
    return {
      key: `${opts.prefix}-${String(it.nr).padStart(2, "0")}`,
      categorySlug: opts.category,
      difficulty: it.difficulty,
      questionDe: it.q,
      modelAnswerDe: it.a,
      keyPoints,
      legalReference: `Skript ${opts.chapterName}, Frage ${it.nr}`,
      followUps: [{ trigger_point_id: first.id, question_de: "Kannst du das noch genauer erklären – was gehört noch dazu?" }],
    };
  });
  return { questions, oral };
}
