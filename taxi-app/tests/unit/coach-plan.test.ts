import { describe, expect, it } from "vitest";
import { buildDailyPlan, buildWeeklyReport, weakestCategory } from "@/lib/coach-plan";

const cats = [
  { name: "StVO", slug: "stvo", answered30: 40, accuracy30: 90, masteredPct: 80 },
  { name: "Ortskunde", slug: "ort", answered30: 10, accuracy30: 40, masteredPct: 10 },
  { name: "Gewerbe", slug: "gew", answered30: 0, accuracy30: null, masteredPct: 0 },
];

describe("Tagesplan", () => {
  it("enthält fällige Wiederholungen, Schwerpunkt, Fehler, Challenge und Tagesziel", () => {
    const p = buildDailyPlan({ dueToday: 12, openMistakes: 3, goalQuestions: 20, daysToExam: 40, dayOfYear: 101, categories: cats });
    expect(p.map((x) => x.kind)).toEqual(["review", "category", "mistakes", "challenge", "goal"]);
    expect(p[1].slug).toBe("gew");
  });
  it("Prüfungssimulation, wenn die Prüfung bald ist", () => {
    const p = buildDailyPlan({ dueToday: 0, openMistakes: 0, goalQuestions: 10, daysToExam: 7, dayOfYear: 101, categories: cats });
    expect(p.some((x) => x.kind === "exam")).toBe(true);
    expect(p.some((x) => x.kind === "review")).toBe(false);
  });
  it("schwächste Kategorie", () => expect(weakestCategory(cats)?.slug).toBe("gew"));
});

describe("Wochenbericht", () => {
  it("Stärken, Schwächen und genau 3 Schritte", () => {
    const r = buildWeeklyReport({
      name: "Anna",
      answeredWeek: 100,
      correctWeek: 85,
      activeDays: 6,
      streak: 9,
      dueToday: 4,
      openMistakes: 2,
      categories: cats,
      prognosis: { readyDate: "2027-01-10", confidence: "mittel", onTrack: true, trend: "steigend" },
    });
    expect(r.headline).toContain("Starke Woche");
    expect(r.strengths[0].name).toBe("StVO");
    expect(r.weaknesses.map((w) => w.slug)).toEqual(["gew", "ort"]);
    expect(r.actions).toHaveLength(3);
    expect(r.stats.accuracy).toBe(85);
  });
});
