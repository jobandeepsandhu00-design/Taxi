/** Zahlen-Trainer – reine Hilfsfunktionen (unit-getestet). */

export function formatValue(value: string, unit: string): string {
  if (!unit) return value;
  return unit === "‰" || unit === "%" ? `${value} ${unit}` : `${value} ${unit}`;
}

/** Setzt den Wert in die Aussage ein („{x}“). */
export function fillStatement(statement: string, shown: string): string {
  return statement.includes("{x}") ? statement.replace("{x}", shown) : `${statement} ${shown}`;
}

/** „0,5“ / „1.6“ / „130“ → Zahl; null, wenn kein reiner Zahlenwert. */
export function parseNumber(v: string): number | null {
  const t = v.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

export function isNumericFact(value: string): boolean {
  return parseNumber(value) !== null;
}

/** Eingabe prüfen: Zahl gleich (Komma/Punkt egal) und Einheit passend. */
export function gradeNumberInput(fact: { value: string; unit: string }, input: string, unit: string): boolean {
  const want = parseNumber(fact.value);
  const got = parseNumber(input);
  if (want === null || got === null) return input.trim().toLowerCase() === fact.value.trim().toLowerCase();
  return Math.abs(want - got) < 1e-9 && unit.trim() === fact.unit.trim();
}

export function shuffleWith<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 4 Auswahlwerte: richtiger Wert + bis zu 3 Ablenker (ohne Duplikate). */
export function choicesFor(fact: { value: string; distractors: string[] }, random: () => number = Math.random): string[] {
  const d = Array.from(new Set(fact.distractors.filter((x) => x && x !== fact.value))).slice(0, 3);
  return shuffleWith([fact.value, ...d], random);
}
