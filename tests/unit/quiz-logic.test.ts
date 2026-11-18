import { describe, expect, it } from "vitest";
import {
  computeExamResult,
  computeReadiness,
  effectiveStreak,
  gradeAnswer,
  nextMistakeState,
  pickRandomUnique,
  remainingSeconds,
  selectExamQuestions,
  shuffle,
  updateStreak,
} from "@/lib/quiz-logic";

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("gradeAnswer", () => {
  it("bewertet Einfachauswahl korrekt", () => {
    expect(gradeAnswer(["a"], ["a"])).toBe(true);
    expect(gradeAnswer(["b"], ["a"])).toBe(false);
  });
  it("verlangt bei Mehrfachauswahl exakt alle richtigen Antworten", () => {
    expect(gradeAnswer(["a", "c"], ["c", "a"])).toBe(true);
    expect(gradeAnswer(["a"], ["a", "c"])).toBe(false);
    expect(gradeAnswer(["a", "b", "c"], ["a", "c"])).toBe(false);
  });
  it("wertet leere Auswahl als falsch", () => {
    expect(gradeAnswer([], ["a"])).toBe(false);
  });
  it("ignoriert doppelte Auswahl-IDs", () => {
    expect(gradeAnswer(["a", "a"], ["a"])).toBe(true);
  });
});

describe("Zufallsauswahl", () => {
  it("shuffle verändert die Eingabe nicht und behält alle Elemente", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seeded());
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(input);
  });
  it("pickRandomUnique liefert keine Duplikate", () => {
    const out = pickRandomUnique(["a", "a", "b", "c", "c", "d"], 10, seeded());
    expect(new Set(out).size).toBe(out.length);
    expect(out.length).toBe(4);
  });
});

describe("selectExamQuestions", () => {
  const pool = Array.from({ length: 50 }, (_, i) => ({ id: `q${i}`, categoryId: i < 10 ? "A" : i < 30 ? "B" : "C" }));

  it("wählt die gewünschte Anzahl ohne Duplikate", () => {
    const ids = selectExamQuestions(pool, 40, null, seeded(1));
    expect(ids).toHaveLength(40);
    expect(new Set(ids).size).toBe(40);
  });
  it("respektiert die Verteilung je Kategorie", () => {
    const ids = selectExamQuestions(pool, 20, { A: 10, C: 5 }, seeded(2));
    const byId = new Map(pool.map((p) => [p.id, p.categoryId]));
    expect(ids.filter((id) => byId.get(id) === "A")).toHaveLength(10);
    expect(ids.filter((id) => byId.get(id) === "C").length).toBeGreaterThanOrEqual(5);
    expect(new Set(ids).size).toBe(20);
  });
  it("liefert höchstens so viele Fragen wie vorhanden", () => {
    expect(selectExamQuestions(pool.slice(0, 5), 40)).toHaveLength(5);
  });
});

describe("computeExamResult", () => {
  it("berechnet Prozent und Bestehen", () => {
    const r = computeExamResult([{ isCorrect: true }, { isCorrect: true }, { isCorrect: false }, { isCorrect: true }], 4, 75);
    expect(r).toEqual({ correctCount: 3, totalCount: 4, scorePercent: 75, passed: true });
  });
  it("rundet auf eine Nachkommastelle", () => {
    expect(computeExamResult([{ isCorrect: true }, { isCorrect: false }, { isCorrect: false }], 3, 50).scorePercent).toBe(33.3);
  });
  it("wertet unbeantwortete Fragen über totalCount als falsch", () => {
    const r = computeExamResult([{ isCorrect: true }], 10, 70);
    expect(r.scorePercent).toBe(10);
    expect(r.passed).toBe(false);
  });
  it("leere Prüfung ist nicht bestanden", () => {
    expect(computeExamResult([], 0, 0).passed).toBe(false);
  });
});

describe("nextMistakeState", () => {
  it("legt bei falscher Antwort einen Eintrag an", () => {
    expect(nextMistakeState(null, false, 2)).toEqual({ wrongCount: 1, correctStreak: 0, resolved: false });
  });
  it("legt bei richtiger Antwort ohne Eintrag nichts an", () => {
    expect(nextMistakeState(null, true, 2)).toBeNull();
  });
  it("entfernt nach Erreichen der Schwelle", () => {
    let s = nextMistakeState(null, false, 2)!;
    s = nextMistakeState(s, true, 2)!;
    expect(s.resolved).toBe(false);
    s = nextMistakeState(s, true, 2)!;
    expect(s.resolved).toBe(true);
  });
  it("setzt die Serie bei erneutem Fehler zurück und reaktiviert", () => {
    const s = nextMistakeState({ wrongCount: 1, correctStreak: 5, resolved: true }, false, 2)!;
    expect(s).toEqual({ wrongCount: 2, correctStreak: 0, resolved: false });
  });
});

describe("Lernserie", () => {
  it("startet mit 1", () => {
    expect(updateStreak(null, "2026-01-10")).toEqual({ currentStreak: 1, longestStreak: 1, lastActiveDayKey: "2026-01-10" });
  });
  it("zählt aufeinanderfolgende Tage hoch", () => {
    const s = updateStreak({ currentStreak: 3, longestStreak: 3, lastActiveDayKey: "2026-01-09" }, "2026-01-10");
    expect(s.currentStreak).toBe(4);
    expect(s.longestStreak).toBe(4);
  });
  it("bleibt am selben Tag unverändert", () => {
    const st = { currentStreak: 3, longestStreak: 5, lastActiveDayKey: "2026-01-10" };
    expect(updateStreak(st, "2026-01-10")).toBe(st);
  });
  it("beginnt nach einer Lücke neu, behält aber den Rekord", () => {
    const s = updateStreak({ currentStreak: 7, longestStreak: 7, lastActiveDayKey: "2026-01-01" }, "2026-01-10");
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(7);
  });
  it("funktioniert über Monats- und Jahreswechsel", () => {
    expect(updateStreak({ currentStreak: 2, longestStreak: 2, lastActiveDayKey: "2025-12-31" }, "2026-01-01").currentStreak).toBe(3);
  });
  it("effectiveStreak verfällt nach einem ausgelassenen Tag", () => {
    const st = { currentStreak: 4, longestStreak: 4, lastActiveDayKey: "2026-01-08" };
    expect(effectiveStreak(st, "2026-01-09")).toBe(4);
    expect(effectiveStreak(st, "2026-01-10")).toBe(0);
  });
});

describe("computeReadiness", () => {
  it("niedrig ohne Lernaktivität", () => {
    expect(computeReadiness({ coverage: 0, recentAccuracy: 0, recentExamScores: [], passPercentage: 70 }).level).toBe("niedrig");
  });
  it("bereit nur mit bestandenen Simulationen", () => {
    const strong = computeReadiness({ coverage: 0.95, recentAccuracy: 0.95, recentExamScores: [92, 88], passPercentage: 70 });
    expect(strong.level).toBe("bereit");
    const noExam = computeReadiness({ coverage: 1, recentAccuracy: 1, recentExamScores: [], passPercentage: 70 });
    expect(noExam.level).toBe("hoch");
  });
  it("begrenzt Werte auf 0–100", () => {
    expect(computeReadiness({ coverage: 3, recentAccuracy: 2, recentExamScores: [500], passPercentage: 70 }).score).toBe(100);
  });
});

describe("remainingSeconds", () => {
  it("ist nie negativ", () => {
    const now = new Date("2026-01-01T10:00:00Z");
    expect(remainingSeconds(new Date("2026-01-01T10:01:30Z"), now)).toBe(90);
    expect(remainingSeconds(new Date("2026-01-01T09:00:00Z"), now)).toBe(0);
  });
});
