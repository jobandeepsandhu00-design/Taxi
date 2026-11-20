/**
 * Prüfungsreife-Prognose – einfaches, nachvollziehbares Modell (unit-getestet):
 *   Reife = Abdeckung × Trefferquote. Ziel: Reife ≥ 0,70 (≈ 80 % Abdeckung bei ~88 % Treffern).
 *   Tempo aus den letzten 14 Tagen (neu gemeisterte Fragen/Tag, Trend der Trefferquote).
 */
import { addDays } from "./dates";

export const READY_TARGET = 0.7;

export interface PrognosisInput {
  today: string;
  /** gemeisterte Fragen (mind. einmal richtig) */
  mastered: number;
  totalQuestions: number;
  /** Trefferquote der letzten 30 Tage (0–1) */
  accuracy30: number;
  /** Trefferquote der letzten 7 Tage und der 7 Tage davor (0–1, null = keine Daten) */
  accuracyLast7: number | null;
  accuracyPrev7: number | null;
  /** neu gemeisterte Fragen in den letzten 14 Tagen */
  newlyMastered14: number;
  /** beantwortete Fragen in den letzten 14 Tagen */
  answered14: number;
  examDate: string | null;
}

export interface Prognosis {
  readiness: number;
  coverage: number;
  readyDate: string | null;
  daysNeeded: number | null;
  confidence: "hoch" | "mittel" | "niedrig";
  onTrack: boolean | null;
  trend: "steigend" | "stabil" | "fallend" | "unbekannt";
}

export function prognose(i: PrognosisInput): Prognosis {
  const coverage = i.totalQuestions ? Math.min(1, i.mastered / i.totalQuestions) : 0;
  const acc = Math.max(0, Math.min(1, i.accuracy30));
  const readiness = coverage * acc;
  const trendDelta = i.accuracyLast7 !== null && i.accuracyPrev7 !== null ? i.accuracyLast7 - i.accuracyPrev7 : null;
  const trend = trendDelta === null ? "unbekannt" : trendDelta > 0.03 ? "steigend" : trendDelta < -0.03 ? "fallend" : "stabil";

  let daysNeeded: number | null;
  if (readiness >= READY_TARGET) daysNeeded = 0;
  else {
    const perDay = i.newlyMastered14 / 14;
    // Benötigte Abdeckung bei aktueller (leicht trendbereinigter) Trefferquote
    const accExpected = Math.min(0.97, Math.max(0.35, acc + (trendDelta ?? 0) * 0.5));
    const coverageNeeded = Math.min(1, READY_TARGET / accExpected);
    const questionsNeeded = Math.max(0, Math.ceil(coverageNeeded * i.totalQuestions - i.mastered));
    if (perDay <= 0.05) daysNeeded = null;
    else daysNeeded = Math.ceil(questionsNeeded / perDay) + (accExpected < 0.75 ? 7 : 0);
    // Reicht die Abdeckung nicht (Trefferquote zu niedrig), braucht es zusätzlich Übung
    if (coverageNeeded >= 1 && acc < READY_TARGET && daysNeeded !== null) daysNeeded += 10;
  }
  const readyDate = daysNeeded === null ? null : addDays(i.today, daysNeeded);
  const confidence: Prognosis["confidence"] = i.answered14 >= 150 && trend !== "fallend" ? "hoch" : i.answered14 >= 40 ? "mittel" : "niedrig";
  const onTrack = readyDate && i.examDate ? readyDate <= i.examDate : null;
  return { readiness: Math.round(readiness * 100) / 100, coverage: Math.round(coverage * 100) / 100, readyDate, daysNeeded, confidence, onTrack, trend };
}
