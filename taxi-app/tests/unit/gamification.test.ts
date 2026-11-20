import { describe, expect, it } from "vitest";
import { achievementInfo, categoryMastered, greetingFor, isNightOwl, levelFor, nextLeitner } from "@/lib/gamification";

describe("levelFor", () => {
  it("startet als Fahrgast", () => {
    const l = levelFor(0);
    expect(l.name).toBe("Fahrgast");
    expect(l.next?.name).toBe("Lehrling");
    expect(l.progress).toBe(0);
  });
  it("berechnet Fortschritt zwischen zwei Levels", () => {
    const l = levelFor(625);
    expect(l.name).toBe("Lehrling");
    expect(l.progress).toBeCloseTo(0.5);
    expect(l.xpToNext).toBe(375);
  });
  it("Höchstlevel hat kein nächstes Level", () => {
    const l = levelFor(99999);
    expect(l.name).toBe("Wiener Taxi-Legende");
    expect(l.next).toBeNull();
    expect(l.progress).toBe(1);
  });
  it("negative Werte gelten als 0", () => expect(levelFor(-5).index).toBe(0));
});

describe("nextLeitner", () => {
  it("neue richtige Antwort → Fach 2 (2 Tage)", () => expect(nextLeitner(null, true)).toEqual({ box: 2, days: 2 }));
  it("richtig rückt ein Fach vor", () => expect(nextLeitner(3, true)).toEqual({ box: 4, days: 8 }));
  it("Fach 5 bleibt Fach 5", () => expect(nextLeitner(5, true)).toEqual({ box: 5, days: 16 }));
  it("richtig, aber unsicher → Fach bleibt", () => expect(nextLeitner(3, true, true)).toEqual({ box: 3, days: 4 }));
  it("neu, richtig aber unsicher → Fach 1", () => expect(nextLeitner(null, true, true)).toEqual({ box: 1, days: 1 }));
  it("falsch trotz unsicher → Fach 1", () => expect(nextLeitner(4, false, true)).toEqual({ box: 1, days: 1 }));
  it("falsch → zurück in Fach 1, morgen fällig", () => expect(nextLeitner(4, false)).toEqual({ box: 1, days: 1 }));
});

describe("Hilfsfunktionen", () => {
  it("Begrüßung nach Tageszeit", () => {
    expect(greetingFor(7)).toBe("Guten Morgen");
    expect(greetingFor(14)).toBe("Servus");
    expect(greetingFor(20)).toBe("Guten Abend");
    expect(greetingFor(23)).toBe("Gute Nacht");
    expect(greetingFor(2)).toBe("Gute Nacht");
  });
  it("Nachteule ab 22 Uhr Wiener Zeit", () => {
    expect(isNightOwl(new Date("2026-07-01T20:30:00Z"))).toBe(true); // 22:30 MESZ
    expect(isNightOwl(new Date("2026-07-01T12:00:00Z"))).toBe(false);
  });
  it("Kategorie gemeistert ab 90 % und mind. 5 Fragen", () => {
    expect(categoryMastered(9, 10)).toBe(true);
    expect(categoryMastered(8, 10)).toBe(false);
    expect(categoryMastered(4, 4)).toBe(false);
  });
  it("Abzeichen- und Level-Infos", () => {
    expect(achievementInfo("serie-7")?.title).toBe("7-Tage-Serie");
    expect(achievementInfo("level-2")?.title).toBe("Level 3: Lenker");
    expect(achievementInfo("gibts-nicht")).toBeNull();
  });
});
