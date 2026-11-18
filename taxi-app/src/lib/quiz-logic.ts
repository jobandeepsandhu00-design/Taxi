/**
 * Reine Geschäftslogik (ohne Datenbankzugriff) – vollständig unit-getestet.
 */

export const OPTION_LABELS = ["A", "B", "C", "D"] as const;
export type OptionLabel = (typeof OPTION_LABELS)[number];

/** Eine Antwort ist nur richtig, wenn exakt alle richtigen Optionen und keine falsche gewählt wurden. */
export function gradeAnswer(selectedIds: readonly string[], correctIds: readonly string[]): boolean {
  if (selectedIds.length === 0) return false;
  const selected = new Set(selectedIds);
  const correct = new Set(correctIds);
  if (selected.size !== correct.size) return false;
  for (const id of selected) if (!correct.has(id)) return false;
  return true;
}

/** Fisher-Yates-Shuffle (nicht mutierend). `random` ist für Tests injizierbar. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Wählt bis zu `count` zufällige, eindeutige Elemente. */
export function pickRandomUnique<T>(items: readonly T[], count: number, random: () => number = Math.random): T[] {
  const unique = Array.from(new Set(items));
  return shuffle(unique, random).slice(0, Math.max(0, count));
}

/**
 * Wählt Prüfungsfragen: zuerst feste Anzahl je Kategorie (falls konfiguriert),
 * dann wird mit zufälligen Fragen aus dem Rest aufgefüllt. Niemals Duplikate.
 */
export function selectExamQuestions(
  pool: readonly { id: string; categoryId: string }[],
  questionCount: number,
  distribution?: Record<string, number> | null,
  random: () => number = Math.random,
): string[] {
  const chosen = new Set<string>();
  if (distribution) {
    for (const [categoryId, n] of Object.entries(distribution)) {
      const ids = pool.filter((q) => q.categoryId === categoryId).map((q) => q.id);
      for (const id of pickRandomUnique(ids, n, random)) {
        if (chosen.size >= questionCount) break;
        chosen.add(id);
      }
    }
  }
  const rest = pool.map((q) => q.id).filter((id) => !chosen.has(id));
  for (const id of pickRandomUnique(rest, questionCount - chosen.size, random)) chosen.add(id);
  return shuffle([...chosen], random);
}

export interface ExamResult {
  correctCount: number;
  totalCount: number;
  scorePercent: number;
  passed: boolean;
}

export function computeExamResult(
  responses: readonly { isCorrect: boolean }[],
  totalCount: number,
  passPercentage: number,
): ExamResult {
  const correctCount = responses.filter((r) => r.isCorrect).length;
  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 1000) / 10 : 0;
  return { correctCount, totalCount, scorePercent, passed: totalCount > 0 && scorePercent >= passPercentage };
}

export interface MistakeState {
  wrongCount: number;
  correctStreak: number;
  resolved: boolean;
}

/**
 * Aktualisiert einen Eintrag der Fehlerliste.
 * - Falsch beantwortet: Eintrag (wieder) aktiv, Serie zurückgesetzt.
 * - Richtig beantwortet: Serie +1; ab `threshold` richtigen Antworten in Folge wird der Eintrag entfernt (resolved).
 */
export function nextMistakeState(
  current: MistakeState | null,
  isCorrect: boolean,
  threshold: number,
): MistakeState | null {
  if (!current) {
    return isCorrect ? null : { wrongCount: 1, correctStreak: 0, resolved: false };
  }
  if (!isCorrect) {
    return { wrongCount: current.wrongCount + 1, correctStreak: 0, resolved: false };
  }
  if (current.resolved) return current;
  const correctStreak = current.correctStreak + 1;
  return { wrongCount: current.wrongCount, correctStreak, resolved: correctStreak >= Math.max(1, threshold) };
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDayKey: string | null;
}

/** Aktualisiert die Lernserie anhand des heutigen Tages (YYYY-MM-DD). */
export function updateStreak(state: StreakState | null, todayKey: string): StreakState {
  const s = state ?? { currentStreak: 0, longestStreak: 0, lastActiveDayKey: null };
  if (s.lastActiveDayKey === todayKey) return s;
  let current = 1;
  if (s.lastActiveDayKey) {
    const diff = Math.round(
      (Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${s.lastActiveDayKey}T00:00:00Z`)) / 86_400_000,
    );
    if (diff === 1) current = s.currentStreak + 1;
    else if (diff <= 0) return s; // Uhrzeitfehler/Vergangenheit: nichts ändern
  }
  return { currentStreak: current, longestStreak: Math.max(s.longestStreak, current), lastActiveDayKey: todayKey };
}

/** Aktuelle Serie für die Anzeige: verfällt, wenn gestern und heute nicht gelernt wurde. */
export function effectiveStreak(state: StreakState | null, todayKey: string): number {
  if (!state?.lastActiveDayKey) return 0;
  const diff = Math.round(
    (Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${state.lastActiveDayKey}T00:00:00Z`)) / 86_400_000,
  );
  return diff <= 1 ? state.currentStreak : 0;
}

export interface ReadinessInput {
  /** Anteil der veröffentlichten Fragen, die mindestens einmal richtig beantwortet wurden (0..1) */
  coverage: number;
  /** Trefferquote der letzten Antworten (0..1) */
  recentAccuracy: number;
  /** Prozentwerte der letzten Prüfungssimulationen (0..100) */
  recentExamScores: number[];
  passPercentage: number;
}

export interface Readiness {
  score: number;
  level: "niedrig" | "mittel" | "hoch" | "bereit";
  label: string;
}

/** Prüfungsbereitschaft: gewichtete Kombination aus Abdeckung, Trefferquote und Simulationsergebnissen. */
export function computeReadiness(input: ReadinessInput): Readiness {
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const coverage = clamp(input.coverage);
  const accuracy = clamp(input.recentAccuracy);
  const exams = input.recentExamScores.slice(0, 3);
  const examAvg = exams.length ? exams.reduce((a, b) => a + b, 0) / exams.length / 100 : null;
  const raw =
    examAvg === null ? coverage * 0.5 + accuracy * 0.5 : coverage * 0.3 + accuracy * 0.3 + clamp(examAvg) * 0.4;
  const score = Math.round(raw * 100);
  const passedRecently = exams.length >= 2 && exams.every((s) => s >= input.passPercentage);
  if (score >= 85 && passedRecently) return { score, level: "bereit", label: "Prüfungsbereit" };
  if (score >= 70) return { score, level: "hoch", label: "Fast bereit" };
  if (score >= 40) return { score, level: "mittel", label: "Auf gutem Weg" };
  return { score, level: "niedrig", label: "Noch am Anfang" };
}

/** Restzeit einer Prüfung in Sekunden (nie negativ). */
export function remainingSeconds(expiresAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
}
