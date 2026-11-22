import { describe, expect, it } from "vitest";
import { configLabel, configToQuery, parseQuizConfig, simulationQuestionCount } from "@/lib/quiz-config";

describe("Quiz-Konfiguration", () => {
  it("URL hin und zurück", () => {
    const cfg = { type: "muendlich" as const, mode: "simulation" as const, durationMin: 30 };
    expect(configToQuery(cfg)).toBe("type=muendlich&mode=simulation&d=30");
    expect(parseQuizConfig(new URLSearchParams(configToQuery(cfg)))).toEqual(cfg);
    const ch = { type: "schriftlich" as const, mode: "chapter" as const, chapterIds: ["a1", "b2"], questionCount: 20, timeLimitMin: 15 };
    expect(parseQuizConfig(new URLSearchParams(configToQuery(ch)))).toEqual(ch);
  });
  it("ungültige Werte werden abgelehnt bzw. korrigiert", () => {
    expect(parseQuizConfig(new URLSearchParams("type=x&mode=mini"))).toBeNull();
    expect(parseQuizConfig({ type: "schriftlich", mode: "simulation", d: "45" })?.durationMin).toBe(30);
    expect(parseQuizConfig({ type: "schriftlich", mode: "chapter", ch: "ok,<script>", n: "7" })).toEqual({ type: "schriftlich", mode: "chapter", chapterIds: ["ok"], questionCount: 10, timeLimitMin: 0 });
    // gespeichertes Objekt aus der DB
    expect(parseQuizConfig({ type: "muendlich", mode: "chapter", chapterIds: ["x"], questionCount: 0 })?.chapterIds).toEqual(["x"]);
  });
  it("Fragenanzahl und Beschriftung", () => {
    expect(simulationQuestionCount("schriftlich", 30)).toBe(30);
    expect(simulationQuestionCount("muendlich", 15)).toBe(9);
    expect(simulationQuestionCount("muendlich", 60)).toBeGreaterThan(30);
    expect(configLabel({ type: "schriftlich", mode: "simulation", durationMin: 30 })).toBe("Schriftlich · 30 min");
    expect(configLabel({ type: "muendlich", mode: "mini" })).toBe("Mündlich · Mini-Quiz");
  });
});
