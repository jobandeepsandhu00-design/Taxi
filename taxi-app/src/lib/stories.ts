/** Stories: gemeinsame Typen und reine Hilfsfunktionen (unit-getestet). */

export type StoryType = "tipp" | "ort" | "regel" | "zahl" | "quiz" | "toni" | "woche" | "erfolg" | "news" | "saison" | "kapitel";
export const STORY_TYPES: StoryType[] = ["tipp", "ort", "regel", "zahl", "quiz", "toni", "woche", "erfolg", "news", "saison"];
export const PERSONAL_TYPES: StoryType[] = ["toni", "woche", "erfolg"];
export const DAILY_TYPES: StoryType[] = ["tipp", "ort", "regel", "zahl"];

export const DEFAULT_RING = ["#FFC400", "#F59E0B", "#2563EB"];

/** Quiz auf einer Folie. Echte Prüfungsfragen werden serverseitig bewertet; eigene Übungsfragen (questionId „local:…“) tragen `correctId`. */
export type StoryQuiz = { questionId: string; question: string; options: { id: string; text: string }[]; multiple: boolean; correctId?: string };
export type StoryCta = { label: string; route: string };
export type StoryMap = { lat: number; lng: number; label: string };

export interface StorySlideData {
  /** stabile ID (DB-ID oder erzeugt, z. B. „regel:2026-11-23:q123“) */
  id: string;
  title: string;
  body: string;
  durationMs: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  bg?: string | null;
  emoji?: string | null;
  /** große Zahl/Kennzeichen auf der Folie (z. B. „0,5 ‰“) */
  big?: string | null;
  cta?: StoryCta | null;
  quiz?: StoryQuiz | null;
  map?: StoryMap | null;
  credit?: string | null;
  /** Lern-Story (Kapitel): Frage → Antwort, Einstieg, Abschluss, Ladeplatzhalter */
  kind?: "qa" | "intro" | "end" | "loading";
  answer?: string | null;
  explanation?: string | null;
  /** Kapitel-Fortschritt für Einstieg/Abschluss */
  progress?: { seen: number; total: number; today: number; portion: number } | null;
}

export interface StoryGroupData {
  key: string;
  title: string;
  icon: string;
  iconUrl?: string | null;
  ring: string[];
  type: StoryType;
  personal: boolean;
  /** ISO-Zeitpunkt des Inhalts (für „vor 2 Std“ und „NEU“) */
  createdAt: string;
  slides: StorySlideData[];
  /** IDs bereits gesehener Slides */
  seenIds: string[];
  /** Kapitel-Story: Slides werden erst beim Öffnen geladen */
  lazy?: { categoryId: string } | null;
  /** Tagesportion erledigt (für Kapitel-Kreise ohne geladene Slides) */
  done?: boolean;
}

export function isGroupSeen(g: Pick<StoryGroupData, "slides" | "seenIds"> & { done?: boolean; lazy?: StoryGroupData["lazy"] }): boolean {
  if (g.done) return true;
  if (g.lazy && g.slides.every((s) => s.kind === "loading")) return false;
  if (g.slides.length === 0) return true;
  const seen = new Set(g.seenIds);
  return g.slides.every((s) => seen.has(s.id));
}

/** Reihenfolge: persönlich zuerst („Toni sagt“), dann ungesehen, dann gesehen; sonst stabile Sortierung. */
export function orderGroups<T extends Pick<StoryGroupData, "personal" | "slides" | "seenIds"> & { done?: boolean; lazy?: StoryGroupData["lazy"] }>(groups: T[]): T[] {
  return groups
    .map((g, i) => ({ g, i, seen: isGroupSeen(g) }))
    .sort((a, b) => Number(b.g.personal && !a.g.personal) - Number(a.g.personal && !b.g.personal) || Number(a.seen) - Number(b.seen) || a.i - b.i)
    .map((x) => x.g)
    .filter((g) => g.slides.length > 0);
}

/** Erste ungesehene Folie (zum Fortsetzen), sonst 0. */
export function firstUnseenIndex(g: Pick<StoryGroupData, "slides" | "seenIds">): number {
  const seen = new Set(g.seenIds);
  const i = g.slides.findIndex((s) => !seen.has(s.id));
  return i < 0 ? 0 : i;
}

/** „gerade eben“, „vor 5 Min“, „vor 2 Std“, „vor 3 Tagen“ */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "gerade eben";
  const m = Math.round(s / 60);
  if (m < 60) return `vor ${m} Min`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.round(h / 24);
  return d === 1 ? "vor 1 Tag" : `vor ${d} Tagen`;
}

export function isToday(iso: string, todayKey: string): boolean {
  return iso.slice(0, 10) === todayKey;
}

/**
 * Rotation ohne Wiederholung: wählt `n` IDs aus `pool`, die in `recent` (zuletzt verwendet, neueste zuerst) nicht vorkommen.
 * Reicht das nicht, werden die am längsten nicht verwendeten ergänzt. Deterministisch über `seed`.
 */
export function pickRotation(pool: string[], recent: string[], n: number, seed: number): string[] {
  if (pool.length === 0 || n <= 0) return [];
  const used = new Set(recent);
  const fresh = pool.filter((id) => !used.has(id));
  const shuffled = seededShuffle(fresh, seed);
  const out = shuffled.slice(0, n);
  if (out.length < n) {
    // am längsten nicht verwendet zuerst (recent: neueste zuerst → von hinten)
    const stale = [...recent].reverse().filter((id, i, arr) => pool.includes(id) && arr.indexOf(id) === i && !out.includes(id));
    out.push(...stale.slice(0, n - out.length));
  }
  return out.slice(0, Math.min(n, pool.length));
}

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let x = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    const j = (x >>> 0) % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Zahl aus einem Tagesschlüssel „YYYY-MM-DD“ (für deterministische Auswahl). */
export function daySeed(key: string): number {
  return Number(key.replace(/-/g, "")) || 1;
}

export function ringGradient(colors: string[] | null | undefined): string {
  const c = colors && colors.length >= 2 ? colors : DEFAULT_RING;
  return `conic-gradient(from 0deg, ${[...c, c[0]].join(", ")})`;
}

/** Sicheres Ziel für CTA-Links: nur interne Pfade. */
export function safeRoute(route: string | null | undefined): string | null {
  if (!route || typeof route !== "string") return null;
  return /^\/(?!\/)[\w\-/?=&%.]*$/.test(route) ? route : null;
}

/* ── Lern-Story (Kapitel, Frage für Frage) ───────────────── */

export const PACE_COOKIE = "tp-learnpace";
export const QPM_OPTIONS = [1, 2, 3] as const;
export const MINUTE_OPTIONS = [3, 5, 10] as const;
export type LearnPace = { qpm: (typeof QPM_OPTIONS)[number]; minutes: (typeof MINUTE_OPTIONS)[number] };
export const DEFAULT_PACE: LearnPace = { qpm: 2, minutes: 5 };

/** Cookie „2-5“ → 2 Fragen/Minute, 5 Minuten pro Tag */
export function parsePace(raw: string | null | undefined): LearnPace {
  const [a, b] = String(raw ?? "").split("-").map(Number);
  return {
    qpm: (QPM_OPTIONS as readonly number[]).includes(a!) ? (a as LearnPace["qpm"]) : DEFAULT_PACE.qpm,
    minutes: (MINUTE_OPTIONS as readonly number[]).includes(b!) ? (b as LearnPace["minutes"]) : DEFAULT_PACE.minutes,
  };
}
export const paceToCookie = (p: LearnPace) => `${p.qpm}-${p.minutes}`;
/** Fragen pro Tag und Kapitel */
export const portionSize = (p: LearnPace) => p.qpm * p.minutes;
/** Anzeigedauer einer Frage-Antwort-Folie */
export const qaDurationMs = (p: LearnPace) => Math.round(60_000 / p.qpm);
export const chapterSlideId = (questionId: string) => `kap:${questionId}`;
