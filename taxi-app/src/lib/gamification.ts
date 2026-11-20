/** XP, Level, Abzeichen und Leitner-Wiederholung – reine Funktionen (unit-getestet). */

export const XP = {
  correct: 10,
  wrong: 2,
  examCompleted: 30,
  examPassedBonus: 70,
  dailyGoal: 25,
} as const;

export const LEVELS = [
  { name: "Fahrgast", min: 0 },
  { name: "Lehrling", min: 250 },
  { name: "Lenker", min: 1000 },
  { name: "Profi", min: 3000 },
  { name: "Wiener Taxi-Legende", min: 7500 },
] as const;

export interface LevelInfo {
  index: number;
  name: string;
  min: number;
  next: { name: string; min: number } | null;
  /** Fortschritt zum nächsten Level (0–1); 1 beim Höchstlevel */
  progress: number;
  xpToNext: number;
}

export function levelFor(xp: number): LevelInfo {
  const safe = Math.max(0, Math.floor(xp));
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (safe >= LEVELS[i].min) index = i;
  const cur = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next ? (safe - cur.min) / (next.min - cur.min) : 1;
  return { index, name: cur.name, min: cur.min, next, progress: Math.min(1, Math.max(0, progress)), xpToNext: next ? next.min - safe : 0 };
}

/** Leitner-Intervalle in Tagen je Fach (Index = Fach 1–5): 1, 2, 4, 8, 16 Tage. */
export const LEITNER_DAYS = [0, 1, 2, 4, 8, 16] as const;
export const LEITNER_MAX_BOX = 5;
/** „Gemeistert“ = Fach 5 */
export const MASTERED_BOX = 5;

/**
 * Nächstes Fach und Abstand in Tagen (Spiegel der Datenbankfunktion update_progress):
 * richtig → ein Fach höher (max. 5), falsch → zurück in Fach 1, richtig aber unsicher → Fach bleibt.
 */
export function nextLeitner(box: number | null, isCorrect: boolean, unsure = false): { box: number; days: number } {
  if (!isCorrect) return { box: 1, days: LEITNER_DAYS[1] };
  const cur = Math.max(1, box ?? 1);
  const nb = unsure ? cur : Math.min(LEITNER_MAX_BOX, cur + 1);
  return { box: nb, days: LEITNER_DAYS[nb] };
}

export type AchievementKey = "erste-100" | "serie-7" | "stvo-meister" | "ortskunde-kaiser" | "nachteule" | "erste-pruefung";

export const ACHIEVEMENTS: { key: AchievementKey; title: string; desc: string; emoji: string }[] = [
  { key: "erste-100", title: "Erste 100 Fragen", desc: "100 Fragen beantwortet", emoji: "💯" },
  { key: "serie-7", title: "7-Tage-Serie", desc: "7 Tage in Folge gelernt", emoji: "🔥" },
  { key: "stvo-meister", title: "StVO-Meister", desc: "90 % der StVO-Fragen gemeistert", emoji: "🚦" },
  { key: "ortskunde-kaiser", title: "Ortskunde-Kaiser", desc: "90 % der Wiener Ortskunde gemeistert", emoji: "👑" },
  { key: "nachteule", title: "Nachteule", desc: "Nach 22 Uhr gelernt", emoji: "🦉" },
  { key: "erste-pruefung", title: "Bestanden!", desc: "Erste Prüfungssimulation bestanden", emoji: "🏆" },
];

/** Kategorie-Slug → Abzeichen für „Kategorie gemeistert" */
export const CATEGORY_ACHIEVEMENTS: Record<string, AchievementKey> = {
  stvo: "stvo-meister",
  "ortskenntnisse-wien": "ortskunde-kaiser",
};

export function achievementInfo(key: string) {
  if (key.startsWith("level-")) {
    const idx = Number(key.slice(6));
    const lvl = LEVELS[idx];
    return lvl ? { key, title: `Level ${idx + 1}: ${lvl.name}`, desc: "Neues Level erreicht!", emoji: "🚕", isLevel: true as const, levelIndex: idx } : null;
  }
  const a = ACHIEVEMENTS.find((x) => x.key === key);
  return a ? { ...a, isLevel: false as const, levelIndex: -1 } : null;
}

/** Stunde in Wien (0–23) */
export function viennaHour(date: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", hour: "2-digit", hourCycle: "h23" }).format(date));
}

export function isNightOwl(date: Date = new Date()): boolean {
  const h = viennaHour(date);
  return h >= 22 || h < 4;
}

export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 18) return "Servus";
  if (hour >= 18 && hour < 22) return "Guten Abend";
  return "Gute Nacht";
}

/** Tagesziel in Fragen (≈ 1 Frage pro Minute) */
export function dailyGoalQuestions(minutes: number | null | undefined): number {
  return Math.max(5, minutes ?? 20);
}

/** Achievement „Kategorie gemeistert": mind. 90 % (und mind. 5) der veröffentlichten Fragen einmal richtig. */
export function categoryMastered(mastered: number, published: number): boolean {
  return published >= 5 && mastered / published >= 0.9;
}
