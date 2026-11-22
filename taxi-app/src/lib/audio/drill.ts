/** Mündlich – Auto-Modus: Einstellungen (geteilt zwischen Server und Client). */
export type DrillSettings = {
  answerSec: 10 | 15 | 30 | 45 | 60;
  afterTimeout: "next" | "readAnswer" | "stop";
  answerCard: "hidden" | "autoReveal";
  showText: boolean;
  order: "chapter" | "random" | "unknown";
  voice: "female" | "male";
  rate: number;
  repeatQuestion: boolean;
  pauseOnReveal: boolean;
  record: boolean;
  /** Portion: 5 oder 10 Fragen pro Teil, 0 = ganzes Kapitel */
  packSize: 0 | 5 | 10;
  /** Quiz: nach dem Vorlesen Antwortmöglichkeiten A–D antippen statt selbst bewerten */
  quiz: boolean;
};

export const DEFAULT_DRILL_SETTINGS: DrillSettings = {
  answerSec: 30,
  afterTimeout: "readAnswer",
  answerCard: "hidden",
  showText: true,
  order: "chapter",
  voice: "female",
  rate: 1,
  repeatQuestion: false,
  pauseOnReveal: true,
  record: false,
  packSize: 10,
  quiz: false,
};

export function parseDrillSettings(raw: unknown): DrillSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<DrillSettings>;
  const d = DEFAULT_DRILL_SETTINGS;
  return {
    answerSec: ([10, 15, 30, 45, 60] as const).includes(r.answerSec as 30) ? (r.answerSec as DrillSettings["answerSec"]) : d.answerSec,
    afterTimeout: (["next", "readAnswer", "stop"] as const).includes(r.afterTimeout as "next") ? (r.afterTimeout as DrillSettings["afterTimeout"]) : d.afterTimeout,
    answerCard: r.answerCard === "autoReveal" ? "autoReveal" : "hidden",
    showText: typeof r.showText === "boolean" ? r.showText : d.showText,
    order: (["chapter", "random", "unknown"] as const).includes(r.order as "chapter") ? (r.order as DrillSettings["order"]) : d.order,
    voice: r.voice === "male" ? "male" : "female",
    rate: typeof r.rate === "number" ? Math.min(1.3, Math.max(0.8, r.rate)) : d.rate,
    repeatQuestion: Boolean(r.repeatQuestion),
    pauseOnReveal: typeof r.pauseOnReveal === "boolean" ? r.pauseOnReveal : d.pauseOnReveal,
    record: Boolean(r.record),
    packSize: r.packSize === 0 || r.packSize === 5 ? r.packSize : 10,
    quiz: Boolean(r.quiz),
  };
}

/** Geschätzte Dauer: Frage-Audio + Antwortzeit (+ Antwort-Audio beim Vorlesen). */
export function estimateDrillSeconds(questionMs: number, answerMs: number, count: number, s: Pick<DrillSettings, "answerSec" | "afterTimeout">): number {
  const per = (questionMs || 6000) / 1000 + s.answerSec + (s.afterTimeout === "readAnswer" ? (answerMs || 8000) / 1000 : 0) + 1;
  return Math.round(per * count);
}

/** Teile eines Kapitels (je packSize Fragen). */
export function chapterParts(total: number, packSize: number): { part: number; from: number; to: number }[] {
  if (!packSize || total <= packSize) return [];
  return Array.from({ length: Math.ceil(total / packSize) }, (_, i) => ({ part: i + 1, from: i * packSize + 1, to: Math.min(total, (i + 1) * packSize) }));
}
