import { describe, expect, it } from "vitest";
import { choicesFor, fillStatement, gradeNumberInput, parseNumber } from "@/lib/number-facts";
import { gapIndexes, isMastered, routeUnits, splitStages } from "@/lib/route-stages";

describe("Zahlen-Trainer", () => {
  it("setzt den Wert in die Aussage ein", () => expect(fillStatement("Promillegrenze: {x}", "0,5 ‰")).toBe("Promillegrenze: 0,5 ‰"));
  it("liest Zahlen mit Komma oder Punkt", () => {
    expect(parseNumber("0,5")).toBe(0.5);
    expect(parseNumber("1.6")).toBe(1.6);
    expect(parseNumber("15. April")).toBeNull();
  });
  it("bewertet Eingabe inkl. Einheit", () => {
    expect(gradeNumberInput({ value: "0,5", unit: "‰" }, "0.5", "‰")).toBe(true);
    expect(gradeNumberInput({ value: "0,5", unit: "‰" }, "0,5", "%")).toBe(false);
    expect(gradeNumberInput({ value: "5", unit: "m" }, "6", "m")).toBe(false);
  });
  it("4 eindeutige Auswahlwerte inkl. richtigem", () => {
    const c = choicesFor({ value: "5", distractors: ["2", "10", "15", "5", "10"] });
    expect(c).toHaveLength(4);
    expect(new Set(c).size).toBe(4);
    expect(c).toContain("5");
  });
});

describe("Routen in Etappen", () => {
  const s = (n: number) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
  it("kurze Routen (≤ 6) werden nicht geteilt", () => expect(splitStages(s(6))).toEqual([]));
  it("7 Straßen → 2 Etappen mit 1 Überlappung", () => {
    const st = splitStages(s(7));
    expect(st.map((x) => x.streets)).toEqual([["S1", "S2", "S3", "S4"], ["S4", "S5", "S6", "S7"]]);
  });
  it("jede Etappe hat 3–4 Straßen und überlappt die vorige", () => {
    for (const n of [7, 8, 9, 10, 11, 13]) {
      const st = splitStages(s(n));
      expect(st[st.length - 1].end).toBe(n);
      st.forEach((x, i) => {
        expect(x.streets.length).toBeGreaterThanOrEqual(3);
        expect(x.streets.length).toBeLessThanOrEqual(4);
        if (i > 0) expect(x.start).toBeLessThan(st[i - 1].end);
      });
    }
  });
  it("Einheiten: Etappen, dann ganze Route", () => {
    const u = routeUnits(s(7));
    expect(u.map((x) => x.label)).toEqual(["Etappe 1", "Etappe 2", "Ganze Route"]);
  });
  it("gemeistert erst an zwei verschiedenen Tagen", () => {
    expect(isMastered(["2026-11-20", "2026-11-20"])).toBe(false);
    expect(isMastered(["2026-11-20", "2026-11-21"])).toBe(true);
  });
  it("Stufe 3: Hälfte der Straßen als Lücken", () => expect(gapIndexes(7)).toHaveLength(4));
});
