import { describe, expect, it } from "vitest";
import { dailyQuestionIds, duelCode, duelWinner, publicName, rankResults } from "@/lib/challenge";

const pool = Array.from({ length: 40 }, (_, i) => `q${i}`);

describe("Daily Challenge", () => {
  it("gleicher Tag → gleiche Fragen, unabhängig von der Reihenfolge des Pools", () => {
    const a = dailyQuestionIds("2026-11-20", pool);
    const b = dailyQuestionIds("2026-11-20", [...pool].reverse());
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    expect(new Set(a).size).toBe(5);
  });
  it("anderer Tag → andere Auswahl", () => {
    expect(dailyQuestionIds("2026-11-21", pool)).not.toEqual(dailyQuestionIds("2026-11-20", pool));
  });
  it("kleiner Pool liefert alle Fragen", () => expect(dailyQuestionIds("2026-11-20", ["a", "b"])).toHaveLength(2));
  it("öffentlicher Name: Vorname + Initiale, Gäste anonym", () => {
    expect(publicName("Anna Maria Huber", false)).toBe("Anna H.");
    expect(publicName("Ali", false)).toBe("Ali");
    expect(publicName("Gast", true)).toBe("Gast");
  });
  it("Rangliste nach Treffern, dann Zeit; Gleichstand teilt den Rang", () => {
    const r = rankResults([
      { id: 1, correct: 4, durationSec: 50 },
      { id: 2, correct: 5, durationSec: 90 },
      { id: 3, correct: 4, durationSec: 50 },
      { id: 4, correct: 4, durationSec: 40 },
    ]);
    expect(r.map((x) => [x.id, x.rank])).toEqual([[2, 1], [4, 2], [1, 3], [3, 3]]);
  });
});

describe("Duell", () => {
  it("Code hat 6 Zeichen ohne 0/O/1/I", () => {
    const c = duelCode();
    expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
  it("Gewinner nach Treffern, dann Zeit", () => {
    expect(duelWinner({ correct: 4, timeMs: 9000 }, { correct: 3, timeMs: 1000 })).toBe("a");
    expect(duelWinner({ correct: 3, timeMs: 9000 }, { correct: 3, timeMs: 8000 })).toBe("b");
    expect(duelWinner({ correct: 3, timeMs: 8000 }, { correct: 3, timeMs: 8000 })).toBeNull();
  });
});
