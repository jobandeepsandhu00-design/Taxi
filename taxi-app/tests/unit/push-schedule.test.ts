import { describe, expect, it } from "vitest";
import { inQuietHours, localParts, reminderDue, toMinutes } from "@/lib/push/schedule";
import { pickText, PUSH_TEXTS } from "@/lib/push/texts";

describe("push schedule", () => {
  it("Ruhezeiten über Mitternacht", () => {
    expect(inQuietHours(toMinutes("23:00"), "22:00", "08:00")).toBe(true);
    expect(inQuietHours(toMinutes("07:59"), "22:00", "08:00")).toBe(true);
    expect(inQuietHours(toMinutes("08:00"), "22:00", "08:00")).toBe(false);
    expect(inQuietHours(toMinutes("18:00"), "22:00", "08:00")).toBe(false);
    expect(inQuietHours(toMinutes("13:00"), "12:00", "14:00")).toBe(true);
  });
  it("Erinnerungsfenster 15 min", () => {
    expect(reminderDue("18:00", toMinutes("18:00"))).toBe(true);
    expect(reminderDue("18:10", toMinutes("18:00"))).toBe(true);
    expect(reminderDue("18:15", toMinutes("18:00"))).toBe(false);
    expect(reminderDue("17:59", toMinutes("18:00"))).toBe(false);
    expect(reminderDue("00:05", toMinutes("23:55"))).toBe(true);
  });
  it("Wiener Ortszeit (Winter UTC+1, Sommer UTC+2)", () => {
    expect(localParts(new Date("2026-12-01T17:00:00Z")).hm).toBe("18:00");
    expect(localParts(new Date("2026-07-01T16:00:00Z")).hm).toBe("18:00");
    expect(localParts(new Date("2026-12-01T23:30:00Z")).date).toBe("2026-12-02");
  });
});

describe("push texts", () => {
  it("füllt Platzhalter und wiederholt den letzten Text nicht", () => {
    for (let i = 0; i < 30; i++) {
      const first = pickText("due", { n: 7 });
      expect(first.body).not.toMatch(/\{/);
      const next = pickText("due", { n: 7 }, first.body);
      expect(next.body).not.toBe(first.body);
    }
  });
  it("3–5 Varianten pro Haupttyp", () => {
    for (const t of ["daily", "due", "streak", "lernbuch", "challenge", "exam", "weekly", "duel"] as const) {
      expect(PUSH_TEXTS[t].length).toBeGreaterThanOrEqual(3);
      expect(PUSH_TEXTS[t].length).toBeLessThanOrEqual(5);
    }
  });
});
