import { describe, expect, it } from "vitest";
import { generateStudyPlan, weakness, type PlanCategory } from "@/lib/study-plan";

const cats: PlanCategory[] = [
  { id: "a", name: "StVO", slug: "stvo", progress: 80, accuracy: 90 },
  { id: "b", name: "Ortskunde", slug: "ort", progress: 10, accuracy: 40 },
  { id: "c", name: "Gewerberecht", slug: "gew", progress: 0, accuracy: null },
];

describe("generateStudyPlan", () => {
  it("ohne Termin: 14 Lerntage, schwächste Kategorien zuerst", () => {
    const p = generateStudyPlan({ today: "2026-11-20", examDate: null, goalQuestions: 20, categories: cats });
    expect(p.days).toHaveLength(14);
    expect(p.daysLeft).toBeNull();
    expect(p.days[0].focus.map((f) => f.id)).toEqual(["c", "b"]);
  });
  it("mit Termin: endet mit Generalprobe und Prüfungstag", () => {
    const p = generateStudyPlan({ today: "2026-11-20", examDate: "2026-11-30", goalQuestions: 20, categories: cats });
    expect(p.daysLeft).toBe(10);
    expect(p.days).toHaveLength(11);
    expect(p.days.at(-1)?.type).toBe("exam-day");
    expect(p.days.at(-2)?.type).toBe("final");
    expect(p.days.some((d) => d.type === "exam-sim")).toBe(true);
  });
  it("lange Vorlaufzeit wird auf maxDays gekürzt", () => {
    const p = generateStudyPlan({ today: "2026-11-20", examDate: "2027-06-01", goalQuestions: 10, categories: cats, maxDays: 28 });
    expect(p.days).toHaveLength(28);
    expect(p.truncated).toBe(true);
  });
  it("vergangener Termin liefert nur den heutigen Tag nicht", () => {
    const p = generateStudyPlan({ today: "2026-11-20", examDate: "2026-11-10", goalQuestions: 10, categories: cats });
    expect(p.days).toHaveLength(0);
  });
  it("Schwächewert gewichtet Fortschritt und Trefferquote", () => {
    expect(weakness(cats[2])).toBe(0);
    expect(weakness(cats[0])).toBeCloseTo(84);
  });
});
