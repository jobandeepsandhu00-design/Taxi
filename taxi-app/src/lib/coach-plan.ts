/** Tagesplan und Wochenbericht des Coaches – reine Funktionen (unit-getestet). */

export type PlanItemKind = "review" | "goal" | "category" | "mistakes" | "challenge" | "exam" | "lernbuch" | "lesson" | "manual";

export interface PlanItem {
  id: string;
  kind: PlanItemKind;
  label: string;
  hint: string;
  href?: string;
  slug?: string;
  target?: number;
}

export interface PlanInput {
  dueToday: number;
  openMistakes: number;
  goalQuestions: number;
  daysToExam: number | null;
  dayOfYear: number;
  categories: { name: string; slug: string; answered30: number; accuracy30: number | null; masteredPct: number }[];
}

/** Schwächste Kategorie: wenig gemeistert und/oder niedrige Trefferquote. */
export function weakestCategory(cats: PlanInput["categories"]) {
  return [...cats].sort((a, b) => a.masteredPct * 0.6 + (a.accuracy30 ?? 0) * 0.4 - (b.masteredPct * 0.6 + (b.accuracy30 ?? 0) * 0.4))[0] ?? null;
}

export function buildDailyPlan(i: PlanInput): PlanItem[] {
  const items: PlanItem[] = [];
  if (i.dueToday > 0) items.push({ id: "review", kind: "review", label: `${i.dueToday} fällige ${i.dueToday === 1 ? "Wiederholung" : "Wiederholungen"}`, hint: "Karteikasten leeren – ca. 5 Minuten" });
  const weak = weakestCategory(i.categories);
  if (weak) items.push({ id: `cat-${weak.slug}`, kind: "category", label: `10 Fragen: ${weak.name}`, hint: `Schwerpunkt – ${weak.masteredPct} % gemeistert`, href: `/lernen/${weak.slug}`, slug: weak.slug, target: 10 });
  if (i.openMistakes > 0) items.push({ id: "mistakes", kind: "mistakes", label: "Fehlertraining", hint: `${i.openMistakes} offene ${i.openMistakes === 1 ? "Frage" : "Fragen"}` });
  const examSoon = i.daysToExam !== null && i.daysToExam >= 0 && i.daysToExam <= 14;
  if (examSoon || i.dayOfYear % 5 === 0) items.push({ id: "exam", kind: "exam", label: "Prüfungssimulation", hint: examSoon ? "Die Prüfung rückt näher – unter Echtbedingungen üben" : "Regelmäßig unter Echtbedingungen üben", href: "/pruefung" });
  items.push({ id: "challenge", kind: "challenge", label: "Daily Challenge", hint: "5 Fragen – für alle gleich", href: "/challenge" });
  items.push({ id: "goal", kind: "goal", label: `Tagesziel: ${i.goalQuestions} Fragen`, hint: "Egal in welchem Modus", target: i.goalQuestions });
  return items;
}

export interface WeeklyInput {
  name: string;
  answeredWeek: number;
  correctWeek: number;
  activeDays: number;
  streak: number;
  dueToday: number;
  openMistakes: number;
  categories: { name: string; slug: string; answered30: number; accuracy30: number | null; masteredPct: number }[];
  prognosis: { readyDate: string | null; confidence: string; onTrack: boolean | null; trend: string };
}

export interface WeeklyReportData {
  headline: string;
  stats: { answered: number; accuracy: number | null; activeDays: number; streak: number };
  strengths: { name: string; accuracy: number }[];
  weaknesses: { name: string; slug: string; accuracy: number | null; masteredPct: number }[];
  prognosis: WeeklyInput["prognosis"];
  actions: string[];
  coachNote?: string;
}

export function buildWeeklyReport(i: WeeklyInput): WeeklyReportData {
  const rated = i.categories.filter((c) => c.answered30 >= 5 && (c.accuracy30 ?? 0) >= 70);
  const strengths = [...rated].sort((a, b) => (b.accuracy30 ?? 0) - (a.accuracy30 ?? 0)).slice(0, 2).map((c) => ({ name: c.name, accuracy: c.accuracy30 ?? 0 }));
  const strengthNames = new Set(strengths.map((s) => s.name));
  const weaknesses = [...i.categories]
    .filter((c) => !strengthNames.has(c.name))
    .sort((a, b) => a.masteredPct * 0.6 + (a.accuracy30 ?? 0) * 0.4 - (b.masteredPct * 0.6 + (b.accuracy30 ?? 0) * 0.4))
    .slice(0, 2)
    .map((c) => ({ name: c.name, slug: c.slug, accuracy: c.accuracy30, masteredPct: c.masteredPct }));
  const accuracy = i.answeredWeek ? Math.round((i.correctWeek / i.answeredWeek) * 100) : null;
  const actions: string[] = [];
  if (weaknesses[0]) actions.push(`Täglich 10 Fragen aus „${weaknesses[0].name}“ üben`);
  if (i.openMistakes > 0) actions.push(`Die ${i.openMistakes} offenen Fehler im Fehlertraining abarbeiten`);
  else if (i.dueToday > 0) actions.push("Jeden Tag die fälligen Wiederholungen erledigen");
  actions.push(i.activeDays < 5 ? "An mindestens 5 Tagen lernen – kurze Einheiten zählen" : "Eine Prüfungssimulation unter Echtbedingungen machen");
  if (actions.length < 3 && weaknesses[1]) actions.push(`„${weaknesses[1].name}“ wiederholen`);
  while (actions.length < 3) actions.push("Die Daily Challenge spielen");
  const headline = i.answeredWeek === 0 ? `${i.name}, diese Woche war ruhig – starten wir neu!` : accuracy !== null && accuracy >= 80 ? `Starke Woche, ${i.name}!` : `Gute Arbeit, ${i.name} – dranbleiben!`;
  return { headline, stats: { answered: i.answeredWeek, accuracy, activeDays: i.activeDays, streak: i.streak }, strengths, weaknesses, prognosis: i.prognosis, actions: actions.slice(0, 3) };
}
