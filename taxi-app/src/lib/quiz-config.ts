/** Eine Quiz-Konfiguration für den Quiz-Launcher (Schriftlich/Mündlich) – in der URL kodiert. */
export type QuizType = "schriftlich" | "muendlich";
export type QuizMode = "simulation" | "chapter" | "mini" | "mistakes" | "random" | "weak";
export type QuizConfig = {
  type: QuizType;
  mode: QuizMode;
  /** Simulation: 15 | 30 | 60 Minuten */
  durationMin?: number;
  chapterIds?: string[];
  /** Kapitel: 10 | 20 | 0 (= alle) */
  questionCount?: number;
  /** Kapitel: 0 (ohne) | 15 | 30 Minuten */
  timeLimitMin?: number;
};

export const SIM_DURATIONS = [15, 30, 60] as const;
const MODES: QuizMode[] = ["simulation", "chapter", "mini", "mistakes", "random", "weak"];

export function configToQuery(c: QuizConfig): string {
  const p = new URLSearchParams({ type: c.type, mode: c.mode });
  if (c.durationMin) p.set("d", String(c.durationMin));
  if (c.chapterIds?.length) p.set("ch", c.chapterIds.join(","));
  if (c.questionCount !== undefined) p.set("n", String(c.questionCount));
  if (c.timeLimitMin) p.set("t", String(c.timeLimitMin));
  return p.toString();
}

export function parseQuizConfig(input: URLSearchParams | Record<string, string | string[] | undefined> | unknown): QuizConfig | null {
  const get = (k: string): string | undefined => {
    if (input instanceof URLSearchParams) return input.get(k) ?? undefined;
    if (input && typeof input === "object") {
      const v = (input as Record<string, unknown>)[k];
      return Array.isArray(v) ? String(v[0]) : v === undefined || v === null ? undefined : String(v);
    }
    return undefined;
  };
  const type = get("type");
  const mode = get("mode") as QuizMode | undefined;
  if ((type !== "schriftlich" && type !== "muendlich") || !mode || !MODES.includes(mode)) return null;
  const num = (k: string) => {
    const n = Number(get(k));
    return Number.isFinite(n) ? n : undefined;
  };
  const d = num("d") ?? num("durationMin");
  const n = num("n") ?? num("questionCount");
  const t = num("t") ?? num("timeLimitMin");
  const chRaw = get("ch") ?? (input && typeof input === "object" && !(input instanceof URLSearchParams) && Array.isArray((input as { chapterIds?: unknown }).chapterIds) ? ((input as { chapterIds: string[] }).chapterIds.join(",")) : undefined);
  const cfg: QuizConfig = { type, mode };
  if (mode === "simulation") cfg.durationMin = SIM_DURATIONS.includes(d as 15) ? d : 30;
  if (mode === "chapter") {
    cfg.chapterIds = (chRaw ?? "").split(",").map((x) => x.trim()).filter((x) => /^[\w-]{1,64}$/.test(x)).slice(0, 30);
    cfg.questionCount = n === 0 || n === 10 || n === 20 ? n : 10;
    cfg.timeLimitMin = t === 15 || t === 30 ? t : 0;
  }
  return cfg;
}

/** Mündliche Simulation: wie in der Prüfung 60 s Antwortzeit, danach wird die Antwort vorgelesen. */
export const ORAL_SIM_ANSWER_SEC = 60;

/** Sekunden pro mündlicher Frage: Frage-Audio + Antwortzeit + Antwort-Audio + Bewerten. */
export function oralSecondsPerQuestion(answerSec: number, readAnswer = true): number {
  return 8 + answerSec + (readAnswer ? 25 : 2) + 5;
}

/** Fragenanzahl für eine Simulation: schriftlich ≈ 1 Frage/Minute, mündlich passend zur Zeit (z. B. 15 min ≈ 9 Fragen). */
export function simulationQuestionCount(type: QuizType, durationMin: number): number {
  if (type === "schriftlich") return durationMin;
  return Math.max(3, Math.floor((durationMin * 60) / oralSecondsPerQuestion(ORAL_SIM_ANSWER_SEC)));
}

const MODE_LABEL: Record<QuizMode, string> = { simulation: "Simulation", chapter: "Kapitel", mini: "Mini-Quiz", mistakes: "Fehler", random: "Zufällig", weak: "Schwächen" };

/** Kurzbeschreibung, z. B. „Schriftlich · 30 min“. */
export function configLabel(c: QuizConfig): string {
  const parts = [c.type === "schriftlich" ? "Schriftlich" : "Mündlich"];
  if (c.mode === "simulation") parts.push(`${c.durationMin} min`);
  else parts.push(MODE_LABEL[c.mode]);
  if (c.mode === "chapter") {
    parts.push(`${c.chapterIds?.length ?? 0} Kap.`);
    if (c.timeLimitMin) parts.push(`${c.timeLimitMin} min`);
  }
  return parts.join(" · ");
}
