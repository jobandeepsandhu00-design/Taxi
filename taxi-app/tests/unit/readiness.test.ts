import { describe, expect, it } from "vitest";
import { categoryScore, computeReadinessV2, levelFor, projectReadyDate } from "@/lib/readiness";

const cat = (over: Partial<Parameters<typeof categoryScore>[0]> = {}) => ({ id: "c", name: "StVO", slug: "stvo", total: 10, seen: 10, mastered: 10, answered: 10, correct: 10, ...over });

describe("Prüfungsreife-Score", () => {
  it("neu: 0 Punkte, „Noch am Anfang“", () => {
    const r = computeReadinessV2({ totalQuestions: 100, seen: 0, mastered: 0, recentCorrect: 0, recentTotal: 0, examScores: [], categories: [] });
    expect(r.score).toBe(0);
    expect(r.label).toBe("Noch am Anfang");
  });

  it("gewichtet 25/35/25/15", () => {
    const r = computeReadinessV2({ totalQuestions: 100, seen: 100, mastered: 100, recentCorrect: 100, recentTotal: 100, examScores: [100, 100, 100], categories: [cat()] });
    expect(r.score).toBe(100);
    const only = computeReadinessV2({ totalQuestions: 100, seen: 100, mastered: 0, recentCorrect: 0, recentTotal: 10, examScores: [], categories: [] });
    expect(only.score).toBe(25);
  });

  it("Prüfungsanteil nimmt Durchschnitt der letzten 3", () => {
    const r = computeReadinessV2({ totalQuestions: 10, seen: 0, mastered: 0, recentCorrect: 0, recentTotal: 0, examScores: [90, 60, 30, 0], categories: [] });
    expect(r.factors.exam).toBeCloseTo(0.6);
    expect(r.score).toBe(9);
  });

  it("deckelt bei 69, wenn eine Kategorie unter 50 % liegt", () => {
    const r = computeReadinessV2({
      totalQuestions: 100, seen: 100, mastered: 95, recentCorrect: 95, recentTotal: 100, examScores: [95],
      categories: [cat(), cat({ id: "o", name: "Ortskunde", slug: "ortskunde", seen: 3, mastered: 1, answered: 3, correct: 1 })],
    });
    expect(r.capped).toBe(true);
    expect(r.score).toBe(69);
    expect(r.categories[0].name).toBe("Ortskunde");
  });

  it("Stufen und Beschriftungen", () => {
    expect(levelFor(39).label).toBe("Noch am Anfang");
    expect(levelFor(40).label).toBe("Auf gutem Weg");
    expect(levelFor(70).label).toBe("Fast bereit");
    expect(levelFor(85).label).toBe("Prüfungsbereit");
  });
});

describe("Prognose (lineare Hochrechnung)", () => {
  const days = (scores: number[]) => scores.map((score, k) => ({ day: `2026-11-${String(10 + k).padStart(2, "0")}`, score }));
  it("braucht mindestens 5 Tage", () => {
    expect(projectReadyDate(days([10, 20, 30, 40]), "2026-11-14").enoughData).toBe(false);
  });
  it("rechnet den Trend linear hoch", () => {
    const r = projectReadyDate(days([40, 45, 50, 55, 60]), "2026-11-14");
    expect(r.date).toBe("2026-11-19");
  });
  it("kein Anstieg → kein Datum", () => {
    expect(projectReadyDate(days([50, 50, 49, 50, 50]), "2026-11-14").date).toBeNull();
  });
});
