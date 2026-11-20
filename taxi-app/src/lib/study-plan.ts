/** Automatischer Lernplan bis zum Prüfungstermin (reine Funktion, unit-getestet). */
import { addDays, diffDays } from "./dates";

export interface PlanCategory {
  id: string;
  name: string;
  slug: string;
  /** gemeisterte Fragen in % */
  progress: number;
  /** Trefferquote in % (null = noch keine Antworten) */
  accuracy: number | null;
}

export type PlanDayType = "learn" | "exam-sim" | "final" | "exam-day";

export interface PlanDay {
  day: string;
  type: PlanDayType;
  title: string;
  focus: PlanCategory[];
  questions: number;
  tasks: string[];
}

/** Schwächewert: niedriger = zuerst üben. Noch nicht begonnene Kategorien zählen als schwach. */
export function weakness(c: PlanCategory): number {
  return c.progress * 0.6 + (c.accuracy ?? 0) * 0.4;
}

export function generateStudyPlan(input: { today: string; examDate: string | null; goalQuestions: number; categories: PlanCategory[]; maxDays?: number }): {
  days: PlanDay[];
  daysLeft: number | null;
  truncated: boolean;
} {
  const { today, examDate, goalQuestions } = input;
  const maxDays = input.maxDays ?? 28;
  const daysLeft = examDate ? diffDays(today, examDate) : null;
  const span = daysLeft === null ? 14 : Math.max(0, daysLeft);
  const total = Math.min(span + (daysLeft !== null && daysLeft >= 0 ? 1 : 0), maxDays);
  const ordered = [...input.categories].sort((a, b) => weakness(a) - weakness(b));
  const days: PlanDay[] = [];
  let rr = 0;

  for (let i = 0; i < total; i++) {
    const day = addDays(today, i);
    const left = daysLeft === null ? null : daysLeft - i;

    if (left === 0) {
      days.push({ day, type: "exam-day", title: "Prüfungstag", focus: [], questions: 0, tasks: ["Ausgeruht hingehen – viel Erfolg! 🍀"] });
      continue;
    }
    if (left === 1) {
      days.push({
        day,
        type: "final",
        title: "Generalprobe",
        focus: ordered.slice(0, 2),
        questions: Math.round(goalQuestions * 0.5),
        tasks: ["Prüfungssimulation unter Echtbedingungen", "Offene Fehler ein letztes Mal wiederholen", "Früh schlafen gehen"],
      });
      continue;
    }
    if (i > 0 && i % 5 === 4) {
      days.push({
        day,
        type: "exam-sim",
        title: "Prüfungssimulation",
        focus: [],
        questions: goalQuestions,
        tasks: ["Eine komplette Prüfungssimulation", "Danach die falschen Antworten im Fehlertraining üben"],
      });
      continue;
    }
    const focus = ordered.length ? [ordered[rr % ordered.length], ordered[(rr + 1) % ordered.length]].filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx) : [];
    rr += 2;
    days.push({
      day,
      type: "learn",
      title: focus.length ? `Schwerpunkt: ${focus.map((f) => f.name).join(" & ")}` : "Lernen",
      focus,
      questions: goalQuestions,
      tasks: [`${goalQuestions} Fragen im Lernmodus`, "„Heute fällig“-Wiederholungen erledigen"],
    });
  }
  return { days, daysLeft, truncated: span + 1 > maxDays };
}
