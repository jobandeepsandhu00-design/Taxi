import { describe, expect, it } from "vitest";
import { prognose, type PrognosisInput } from "@/lib/prognosis";

const base: PrognosisInput = {
  today: "2026-11-21",
  mastered: 200,
  totalQuestions: 400,
  accuracy30: 0.8,
  accuracyLast7: 0.82,
  accuracyPrev7: 0.78,
  newlyMastered14: 70,
  answered14: 200,
  examDate: "2027-01-15",
};

describe("Prüfungsreife-Prognose", () => {
  it("bereits bereit → heute, hohe Sicherheit", () => {
    const p = prognose({ ...base, mastered: 380, accuracy30: 0.9 });
    expect(p.daysNeeded).toBe(0);
    expect(p.readyDate).toBe("2026-11-21");
    expect(p.confidence).toBe("hoch");
  });
  it("berechnet ein Datum aus Lerntempo und Abdeckungslücke", () => {
    const p = prognose(base);
    expect(p.trend).toBe("steigend");
    expect(p.daysNeeded).toBeGreaterThan(0);
    expect(p.readyDate! > base.today).toBe(true);
    expect(p.onTrack).toBe(true);
  });
  it("ohne Lerntempo kein Datum, niedrige Sicherheit", () => {
    const p = prognose({ ...base, newlyMastered14: 0, answered14: 5 });
    expect(p.readyDate).toBeNull();
    expect(p.confidence).toBe("niedrig");
    expect(p.onTrack).toBeNull();
  });
  it("fallender Trend senkt die Sicherheit", () => {
    const p = prognose({ ...base, accuracyLast7: 0.6, accuracyPrev7: 0.8 });
    expect(p.trend).toBe("fallend");
    expect(p.confidence).toBe("mittel");
  });
  it("Prüfung zu früh → nicht im Plan", () => {
    const p = prognose({ ...base, examDate: "2026-11-25" });
    expect(p.onTrack).toBe(false);
  });
});
