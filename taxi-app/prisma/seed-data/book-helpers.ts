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
  /** 3 falsche Auswahlmöglichkeiten */
  wrong: [string, string, string];
  /** Kernpunkte für die mündliche Bewertung; [text, false] = optional */
  points: (string | [string, false])[];
};

export function buildBookChapter(opts: { category: string; prefix: string; chapterName: string; items: BookItem[] }) {
  const questions: SeedQuestion[] = opts.items.map((it) => {
    const id = `${opts.prefix}-${String(it.nr).padStart(2, "0")}`;
    return {
      id,
      category: opts.category,
      topic: it.topic,
      difficulty: it.difficulty,
      text: it.q,
      options: shuffled(id, [[it.a, true, "Antwort laut Skript."], [it.wrong[0], false, ""], [it.wrong[1], false, ""], [it.wrong[2], false, ""]]),
      explanation: it.a,
      detail: `Skript ${opts.chapterName}, Frage ${it.nr}`,
      tags: ["konzession", "skript"],
    };
  });
  const oral: OralSeed[] = opts.items.map((it) => {
    const keyPoints = it.points.map((p, i) => (Array.isArray(p) ? { id: `k${i + 1}`, text: p[0], required: false } : { id: `k${i + 1}`, text: p, required: true }));
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
