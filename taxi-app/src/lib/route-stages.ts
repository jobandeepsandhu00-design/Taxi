/**
 * Routen in Etappen: lange Routen (> 6 Straßen) werden in Etappen zu 3–4 Straßen geteilt,
 * jede Etappe überlappt die vorige um (mindestens) 1 Straße.
 */
export const STAGE_SIZE = 4;
export const SPLIT_ABOVE = 6;

export interface Stage {
  index: number;
  start: number;
  end: number; // exklusiv
  streets: string[];
}

export function splitStages(streets: string[]): Stage[] {
  if (streets.length <= SPLIT_ABOVE) return [];
  const out: Stage[] = [];
  let start = 0;
  for (;;) {
    let end = Math.min(streets.length, start + STAGE_SIZE);
    // letzte Etappe mindestens 3 Straßen: Anfang nach vorne schieben (Überlappung wird größer)
    if (end - start < 3) start = Math.max(0, end - 3);
    end = Math.min(streets.length, start + STAGE_SIZE);
    out.push({ index: out.length, start, end, streets: streets.slice(start, end) });
    if (end >= streets.length) break;
    start = end - 1;
  }
  return out;
}

export interface Unit {
  stageIndex: number;
  label: string;
  streets: string[];
  start: number;
  end: number;
  full: boolean;
}

/** Lerneinheiten: alle Etappen, danach die ganze Route. */
export function routeUnits(streets: string[]): Unit[] {
  const stages = splitStages(streets);
  const units: Unit[] = stages.map((s) => ({ stageIndex: s.index, label: `Etappe ${s.index + 1}`, streets: s.streets, start: s.start, end: s.end, full: false }));
  units.push({ stageIndex: stages.length, label: "Ganze Route", streets, start: 0, end: streets.length, full: true });
  return units;
}

export const LEVELS = [
  { level: 1, name: "Anschauen", desc: "Route ansehen – das Taxi fährt sie ab." },
  { level: 2, name: "Eine Lücke", desc: "Eine Straße fehlt – wähle aus 4." },
  { level: 3, name: "Mehrere Lücken", desc: "Die Hälfte fehlt – zieh die Straßen in die Lücken." },
  { level: 4, name: "Ganze Route", desc: "Bring alle Straßen selbst in die richtige Reihenfolge." },
] as const;

/** Gemeistert: Stufe 4 der ganzen Route an zwei verschiedenen Tagen richtig. */
export function isMastered(fullCorrectDays: string[]): boolean {
  return new Set(fullCorrectDays).size >= 2;
}

/** Lückenpositionen für Stufe 3: die Hälfte (aufgerundet), gleichmäßig zufällig. */
export function gapIndexes(n: number, random: () => number = Math.random): number[] {
  const k = Math.max(1, Math.ceil(n / 2));
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, k).sort((a, b) => a - b);
}
