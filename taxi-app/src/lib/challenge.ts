/** Daily Challenge & Duell – reine Hilfsfunktionen (unit-getestet). */

export const DAILY_COUNT = 5;

/** Einfacher, stabiler String-Hash (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministische Auswahl: gleicher Tag + gleicher Fragenpool → für alle dieselben Fragen. */
export function dailyQuestionIds(day: string, pool: string[], count = DAILY_COUNT): string[] {
  const ids = [...pool].sort();
  const rnd = mulberry32(hashString(`taxi-challenge-${day}`));
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, Math.min(count, ids.length));
}

/** Anzeigename für Ranglisten: Vorname + Initiale (Datenschutz), Gäste als „Gast“. */
export function publicName(name: string, isGuest: boolean): string {
  if (isGuest) return "Gast";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

/** Rangliste: mehr richtige Antworten zuerst, bei Gleichstand die schnellere Zeit. */
export function rankResults<T extends { correct: number; durationSec: number }>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => b.correct - a.correct || a.durationSec - b.durationSec);
  let rank = 0;
  return sorted.map((r, i) => {
    if (i === 0 || r.correct !== sorted[i - 1].correct || r.durationSec !== sorted[i - 1].durationSec) rank = i + 1;
    return { ...r, rank };
  });
}

/** 6-stelliger Duell-Code ohne verwechselbare Zeichen. */
export function duelCode(random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
}

/** Duell-Gewinner: mehr richtige, sonst schnellere Gesamtzeit; null = unentschieden. */
export function duelWinner(a: { correct: number; timeMs: number }, b: { correct: number; timeMs: number }): "a" | "b" | null {
  if (a.correct !== b.correct) return a.correct > b.correct ? "a" : "b";
  if (a.timeMs !== b.timeMs) return a.timeMs < b.timeMs ? "a" : "b";
  return null;
}
