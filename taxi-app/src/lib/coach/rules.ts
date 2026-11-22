/**
 * Smart Coach – Regel-Engine (reines TypeScript, ohne KI, unit-getestet).
 * Eingabe: Lernstatistik des Users. Ausgabe: priorisierte Hinweise (CoachInsight).
 */
import { fill, pickVariant } from "./templates.de";

export type CoachMood = "happy" | "neutral" | "concerned" | "celebrate";

export interface CoachInsight {
  id: string;
  priority: number;
  mood: CoachMood;
  title_de: string;
  text_de: string;
  action: { label: string; route: string } | null;
}

export interface CategoryStat {
  slug: string;
  name: string;
  /** Anzahl veröffentlichter Fragen */
  total: number;
  attempts7: number;
  accuracy7: number | null;
  attempts30: number;
  accuracy30: number | null;
  masteredPct: number;
}

export interface LernbuchStat {
  read: number;
  total: number;
  dueAgain: number;
  checksPassed: number;
  /** nächstes ungelesenes Kapitel */
  nextUnread: { title: string; href: string } | null;
  /** vollständig gelesen, Kapitel-Check noch nicht bestanden */
  readyForCheck: { title: string; href: string } | null;
}

export interface UserStats {
  /** Datum (Wien) YYYY-MM-DD */
  today: string;
  /** Stunde (Wien, 0–23) */
  hour: number;
  dueCount: number;
  streak: number;
  /** heute schon gelernt (Fragen beantwortet oder Karten gelesen) */
  activeToday: boolean;
  todayAnswered: number;
  dailyGoal: number;
  examDate: string | null;
  daysToExam: number | null;
  /** Prüfungsreife 0–100 (heute) und vor 7 Tagen */
  readiness: number | null;
  readinessWeekAgo: number | null;
  /** Trefferquote (0–100) letzte 7 Tage und die 7 Tage davor */
  accuracy7: number | null;
  accuracyPrev7: number | null;
  answered7: number;
  answeredPrev7: number;
  answeredTotal: number;
  categories: CategoryStat[];
  openMistakes: number;
  /** noch nicht sicher beherrschte Fragen */
  unmastered: number;
  lessonsToday: number;
  oralAttempts7: number;
  lernbuch: LernbuchStat;
  /** letzter Lerntag (YYYY-MM-DD) oder null */
  lastActiveDay: string | null;
}

const MIN_ATTEMPTS_WEAK = 10;

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000);
}

/** Lektionen pro Tag bis zur Prüfung: ceil(offen / 5 / Tage). */
export function lessonsPerDay(unmastered: number, daysLeft: number): number {
  if (unmastered <= 0) return 0;
  return Math.ceil(unmastered / 5 / Math.max(1, daysLeft));
}

/** Schwächstes Kapitel (min. 10 Versuche in 30 Tagen, Trefferquote < 60 %). */
export function weakestCategory(cats: CategoryStat[]): CategoryStat | null {
  const rated = cats.filter((c) => c.attempts30 >= MIN_ATTEMPTS_WEAK && c.accuracy30 !== null && c.accuracy30 < 60);
  return rated.sort((a, b) => (a.accuracy30 ?? 0) - (b.accuracy30 ?? 0))[0] ?? null;
}

/** Top-3-Schwächen für die Anzeige (auch ohne Mindestversuche, sortiert nach Trefferquote/Beherrschung). */
export function topWeaknesses(cats: CategoryStat[], n = 3): CategoryStat[] {
  const score = (c: CategoryStat) => (c.accuracy30 ?? 50) * 0.6 + c.masteredPct * 0.4;
  return [...cats].filter((c) => c.total > 0).sort((a, b) => score(a) - score(b)).slice(0, n);
}

type RuleOut = { priority: number; mood: CoachMood; vars?: Record<string, string | number>; action: CoachInsight["action"]; seed?: string } | null;
type Rule = { id: string; when: (s: UserStats) => RuleOut };

const minutesFor = (n: number) => Math.max(2, Math.round(n * 0.5));

/** Alle Regeln (Reihenfolge egal – sortiert wird nach Priorität). */
export const RULES: Rule[] = [
  {
    id: "exam_today",
    when: (s) => (s.daysToExam === 0 ? { priority: 100, mood: "celebrate", action: { label: "Spickzettel ansehen", route: "/zahlen/spickzettel" } } : null),
  },
  {
    id: "exam_tomorrow",
    when: (s) => (s.daysToExam === 1 ? { priority: 98, mood: "neutral", action: { label: "Wichtige Zahlen wiederholen", route: "/zahlen/spickzettel" } } : null),
  },
  {
    id: "first_steps",
    when: (s) => (s.answeredTotal === 0 && s.lernbuch.read === 0 ? { priority: 95, mood: "happy", action: { label: "Lernbuch öffnen", route: s.lernbuch.nextUnread?.href ?? "/lernbuch" } } : null),
  },
  {
    id: "exam_soon_low",
    when: (s) => {
      if (s.daysToExam === null || s.daysToExam < 2 || s.daysToExam > 14) return null;
      if (s.readiness === null || s.readiness >= 70) return null;
      const lessons = lessonsPerDay(s.unmastered, s.daysToExam);
      return { priority: 92, mood: "concerned", vars: { days: s.daysToExam, readiness: s.readiness, lessons, open: s.unmastered }, action: { label: "Lektion starten", route: "/dashboard" } };
    },
  },
  {
    id: "streak_risk",
    when: (s) => (s.hour >= 18 && !s.activeToday && s.streak > 0 ? { priority: 90, mood: "concerned", vars: { streak: s.streak }, action: { label: "5 Minuten lernen", route: "/dashboard" } } : null),
  },
  {
    id: "due_reviews",
    when: (s) => (s.dueCount > 0 ? { priority: 85 + Math.min(4, Math.floor(s.dueCount / 10)), mood: "neutral", vars: { n: s.dueCount, min: minutesFor(s.dueCount) }, action: { label: "Jetzt wiederholen", route: "/ueben/wiederholung" } } : null),
  },
  {
    id: "inactive_comeback",
    when: (s) => {
      if (!s.lastActiveDay || s.activeToday) return null;
      const days = daysBetween(s.lastActiveDay, s.today);
      return days >= 3 ? { priority: 88, mood: "happy", vars: { days }, action: { label: "Sanft starten", route: "/dashboard" } } : null;
    },
  },
  {
    id: "late_night",
    when: (s) => (s.hour >= 23 || s.hour < 4 ? { priority: 80, mood: "neutral", action: { label: "5 Fragen wiederholen", route: "/ueben/wiederholung" } } : null),
  },
  {
    id: "readiness_drop",
    when: (s) => {
      if (s.readiness === null || s.readinessWeekAgo === null) return null;
      const diff = s.readinessWeekAgo - s.readiness;
      return diff >= 5 ? { priority: 78, mood: "concerned", vars: { before: s.readinessWeekAgo, now: s.readiness, diff }, action: { label: "Wiederholen", route: "/ueben/wiederholung" } } : null;
    },
  },
  {
    id: "weak_category",
    when: (s) => {
      const w = weakestCategory(s.categories);
      return w ? { priority: 76, mood: "concerned", vars: { category: w.name, acc: w.accuracy30 ?? 0 }, action: { label: `${w.name} üben`, route: `/lernen/${w.slug}` }, seed: w.slug } : null;
    },
  },
  {
    id: "kapitel_check_ready",
    when: (s) => (s.lernbuch.readyForCheck ? { priority: 74, mood: "happy", vars: { chapter: s.lernbuch.readyForCheck.title }, action: { label: "Zum Kapitel-Check", route: s.lernbuch.readyForCheck.href } } : null),
  },
  {
    id: "lernbuch_next",
    when: (s) =>
      s.lernbuch.nextUnread && s.answeredTotal + s.lernbuch.read > 0
        ? { priority: 72, mood: "neutral", vars: { chapter: s.lernbuch.nextUnread.title }, action: { label: "Kapitel lesen", route: s.lernbuch.nextUnread.href } }
        : null,
  },
  {
    id: "lernbuch_again",
    when: (s) => (s.lernbuch.dueAgain > 0 ? { priority: 70, mood: "neutral", vars: { n: s.lernbuch.dueAgain }, action: { label: "Karten lesen", route: "/lernbuch/story/wiederholung" } } : null),
  },
  {
    id: "open_mistakes",
    when: (s) => (s.openMistakes >= 5 ? { priority: 68, mood: "neutral", vars: { n: s.openMistakes }, action: { label: "Fehlertraining", route: "/fehler" } } : null),
  },
  {
    id: "accuracy_up",
    when: (s) => {
      if (s.accuracy7 === null || s.accuracyPrev7 === null || s.answered7 < 10 || s.answeredPrev7 < 10) return null;
      const diff = s.accuracy7 - s.accuracyPrev7;
      return diff >= 10 ? { priority: 66, mood: "celebrate", vars: { diff, now: s.accuracy7, before: s.accuracyPrev7 }, action: { label: "Fortschritt ansehen", route: "/fortschritt" } } : null;
    },
  },
  {
    id: "accuracy_down",
    when: (s) => {
      if (s.accuracy7 === null || s.accuracyPrev7 === null || s.answered7 < 10 || s.answeredPrev7 < 10) return null;
      const diff = s.accuracyPrev7 - s.accuracy7;
      return diff >= 10 ? { priority: 64, mood: "concerned", vars: { diff, now: s.accuracy7, before: s.accuracyPrev7 }, action: { label: "Im Lernbuch nachlesen", route: "/lernbuch" } } : null;
    },
  },
  {
    id: "streak_celebrate",
    when: (s) => (s.streak >= 7 && s.activeToday ? { priority: 62, mood: "celebrate", vars: { streak: s.streak }, action: { label: "Weiterlernen", route: "/dashboard" } } : null),
  },
  {
    id: "goal_done",
    when: (s) => (s.todayAnswered >= s.dailyGoal && s.dailyGoal > 0 ? { priority: 60, mood: "celebrate", vars: { done: s.todayAnswered, goal: s.dailyGoal }, action: { label: "Fortschritt ansehen", route: "/fortschritt" } } : null),
  },
  {
    id: "readiness_high",
    when: (s) => (s.readiness !== null && s.readiness >= 80 ? { priority: 58, mood: "happy", vars: { readiness: s.readiness }, action: { label: "Prüfung simulieren", route: "/pruefung" } } : null),
  },
  {
    id: "oral_practice",
    when: (s) => (s.daysToExam !== null && s.daysToExam > 1 && s.daysToExam <= 30 && s.oralAttempts7 === 0 ? { priority: 56, mood: "neutral", vars: { days: s.daysToExam }, action: { label: "Mündlich üben", route: "/muendlich" } } : null),
  },
  {
    id: "numbers_trainer",
    when: (s) => (s.daysToExam !== null && s.daysToExam > 1 && s.daysToExam <= 21 ? { priority: 54, mood: "neutral", vars: { days: s.daysToExam }, action: { label: "Zahlen-Trainer", route: "/zahlen" } } : null),
  },
  {
    id: "goal_progress",
    when: (s) => {
      if (s.todayAnswered === 0 || s.todayAnswered >= s.dailyGoal) return null;
      return { priority: 52, mood: "happy", vars: { done: s.todayAnswered, goal: s.dailyGoal, left: s.dailyGoal - s.todayAnswered }, action: { label: "Weiterüben", route: "/quiz" } };
    },
  },
  {
    id: "untouched_category",
    when: (s) => {
      if (s.answeredTotal < 30) return null;
      const c = s.categories.find((x) => x.total >= 5 && x.attempts30 === 0);
      return c ? { priority: 48, mood: "neutral", vars: { category: c.name }, action: { label: `${c.name} üben`, route: `/lernen/${c.slug}` }, seed: c.slug } : null;
    },
  },
  {
    id: "lernbuch_done",
    when: (s) => (s.lernbuch.total > 0 && s.lernbuch.read >= s.lernbuch.total ? { priority: 46, mood: "celebrate", action: { label: "Quiz starten", route: "/quiz" } } : null),
  },
  {
    id: "lernbuch_halfway",
    when: (s) => {
      if (!s.lernbuch.total) return null;
      const pct = Math.round((s.lernbuch.read / s.lernbuch.total) * 100);
      return pct >= 50 && pct < 100 ? { priority: 44, mood: "celebrate", vars: { pct, read: s.lernbuch.read, total: s.lernbuch.total }, action: { label: "Weiterlesen", route: s.lernbuch.nextUnread?.href ?? "/lernbuch" } } : null;
    },
  },
  {
    id: "no_exam_date",
    when: (s) => (s.examDate === null ? { priority: 42, mood: "neutral", action: { label: "Datum eintragen", route: "/profil" } } : null),
  },
  {
    id: "exam_past",
    when: (s) => (s.daysToExam !== null && s.daysToExam < 0 ? { priority: 84, mood: "neutral", action: { label: "Datum ändern", route: "/profil" } } : null),
  },
  {
    id: "strong_category",
    when: (s) => {
      const c = [...s.categories].filter((x) => x.attempts30 >= 20 && (x.accuracy30 ?? 0) >= 90).sort((a, b) => (b.accuracy30 ?? 0) - (a.accuracy30 ?? 0))[0];
      return c ? { priority: 40, mood: "celebrate", vars: { category: c.name, acc: c.accuracy30 ?? 0 }, action: null, seed: c.slug } : null;
    },
  },
  {
    id: "morning",
    when: (s) => (s.hour >= 5 && s.hour < 10 && !s.activeToday && s.answeredTotal > 0 ? { priority: 38, mood: "happy", action: { label: "Mini-Lektion", route: "/dashboard" } } : null),
  },
  {
    id: "exam_far",
    when: (s) => (s.daysToExam !== null && s.daysToExam > 60 ? { priority: 30, mood: "happy", vars: { days: s.daysToExam }, action: { label: "Lernbuch", route: "/lernbuch" } } : null),
  },
  {
    id: "keep_going",
    when: () => ({ priority: 1, mood: "neutral", action: { label: "Mini-Lektion", route: "/dashboard" } }),
  },
];

/** Alle passenden Hinweise, absteigend nach Priorität. */
export function evaluateRules(s: UserStats, rules: Rule[] = RULES): CoachInsight[] {
  const out: CoachInsight[] = [];
  for (const r of rules) {
    const res = r.when(s);
    if (!res) continue;
    const v = pickVariant(r.id, s.today, res.seed);
    const vars = res.vars ?? {};
    out.push({ id: r.id, priority: res.priority, mood: res.mood, title_de: fill(v.title, vars), text_de: fill(v.text, vars), action: res.action });
  }
  out.sort((a, b) => b.priority - a.priority);
  // „Weiter geht’s“ nur, wenn sonst nichts zu sagen ist
  return out.length > 1 ? out.filter((i) => i.id !== "keep_going") : out;
}

export interface CoachPlanItem {
  id: string;
  label: string;
  hint: string;
  route: string;
}

const PLAN_IDS = new Set([
  "due_reviews",
  "weak_category",
  "kapitel_check_ready",
  "lernbuch_next",
  "lernbuch_again",
  "open_mistakes",
  "oral_practice",
  "numbers_trainer",
  "readiness_high",
  "untouched_category",
  "exam_soon_low",
]);

/** Tagesplan (3–5 Punkte) aus den Hinweisen; aufgefüllt mit Standard-Schritten. */
export function planFromInsights(insights: CoachInsight[], s: Pick<UserStats, "dailyGoal">): CoachPlanItem[] {
  const items: CoachPlanItem[] = [];
  for (const i of insights) {
    if (!PLAN_IDS.has(i.id) || !i.action || items.some((x) => x.route === i.action!.route)) continue;
    items.push({ id: i.id, label: i.action.label, hint: i.title_de, route: i.action.route });
    if (items.length >= 4) break;
  }
  const fillers: CoachPlanItem[] = [
    { id: "goal", label: `Tagesziel: ${s.dailyGoal} Fragen`, hint: "Egal in welchem Modus", route: "/quiz" },
    { id: "lesson", label: "Eine Mini-Lektion", hint: "5 Fragen, ca. 3 Minuten", route: "/dashboard" },
    { id: "challenge", label: "Daily Challenge", hint: "5 Fragen – für alle gleich", route: "/challenge" },
  ];
  for (const f of fillers) {
    if (items.length >= 5) break;
    if (items.length >= 3 && f.id !== "goal") break;
    items.push(f);
  }
  return items.slice(0, 5);
}

/** Toni-Stimmung aus dem wichtigsten Hinweis. */
export function moodOf(insights: CoachInsight[]): CoachMood {
  return insights[0]?.mood ?? "neutral";
}
