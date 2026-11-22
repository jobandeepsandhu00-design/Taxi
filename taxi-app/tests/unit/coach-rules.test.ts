import { describe, expect, it } from "vitest";
import { evaluateRules, lessonsPerDay, moodOf, planFromInsights, RULES, topWeaknesses, weakestCategory, type CategoryStat, type UserStats } from "@/lib/coach/rules";
import { fill, pickVariant, TEMPLATES } from "@/lib/coach/templates.de";

const cat = (o: Partial<CategoryStat> = {}): CategoryStat => ({ slug: "k-a", name: "Kapitel A", total: 20, attempts7: 0, accuracy7: null, attempts30: 0, accuracy30: null, masteredPct: 0, ...o });

const base = (o: Partial<UserStats> = {}): UserStats => ({
  today: "2026-11-22",
  hour: 12,
  dueCount: 0,
  streak: 0,
  activeToday: true,
  todayAnswered: 5,
  dailyGoal: 20,
  examDate: "2027-06-01",
  daysToExam: 191,
  readiness: 50,
  readinessWeekAgo: 50,
  accuracy7: 70,
  accuracyPrev7: 70,
  answered7: 30,
  answeredPrev7: 30,
  answeredTotal: 100,
  categories: [cat()],
  openMistakes: 0,
  unmastered: 300,
  lessonsToday: 0,
  oralAttempts7: 1,
  lernbuch: { read: 10, total: 696, dueAgain: 0, checksPassed: 0, nextUnread: null, readyForCheck: null },
  lastActiveDay: "2026-11-22",
  ...o,
});

const ids = (s: UserStats) => evaluateRules(s).map((i) => i.id);

describe("Regel-Engine", () => {
  it("hat mindestens 25 Regeln mit je 3–5 Textvarianten", () => {
    expect(RULES.length).toBeGreaterThanOrEqual(25);
    for (const r of RULES) {
      const v = TEMPLATES[r.id];
      expect(v, r.id).toBeDefined();
      expect(v.length, r.id).toBeGreaterThanOrEqual(3);
      expect(v.length, r.id).toBeLessThanOrEqual(5);
    }
  });

  it("fällige Fragen → Wiederholung mit Minuten", () => {
    const i = evaluateRules(base({ dueCount: 12 })).find((x) => x.id === "due_reviews")!;
    expect(i.action?.route).toBe("/ueben/wiederholung");
    expect(i.title_de + i.text_de).toMatch(/12/);
    expect(i.text_de).not.toMatch(/\{/);
  });

  it("schwächstes Kapitel nur ab 10 Versuchen und < 60 %", () => {
    expect(weakestCategory([cat({ attempts30: 9, accuracy30: 20 })])).toBeNull();
    expect(weakestCategory([cat({ attempts30: 12, accuracy30: 65 })])).toBeNull();
    const w = weakestCategory([cat({ slug: "a", attempts30: 12, accuracy30: 55 }), cat({ slug: "b", attempts30: 15, accuracy30: 40 })]);
    expect(w?.slug).toBe("b");
    expect(ids(base({ categories: [cat({ attempts30: 15, accuracy30: 40 })] }))).toContain("weak_category");
  });

  it("Prüfung in ≤ 14 Tagen und Reife < 70 → Lektionen pro Tag", () => {
    expect(lessonsPerDay(100, 10)).toBe(2);
    expect(lessonsPerDay(101, 10)).toBe(3);
    expect(lessonsPerDay(0, 5)).toBe(0);
    const i = evaluateRules(base({ daysToExam: 10, examDate: "2026-12-02", readiness: 55, unmastered: 100 })).find((x) => x.id === "exam_soon_low")!;
    expect(i.mood).toBe("concerned");
    expect(i.title_de + i.text_de).toMatch(/2/);
    expect(ids(base({ daysToExam: 10, readiness: 75 }))).not.toContain("exam_soon_low");
  });

  it("Serie ≥ 7 → feiern; Serie in Gefahr nach 18 Uhr ohne Aktivität", () => {
    expect(ids(base({ streak: 8 }))).toContain("streak_celebrate");
    expect(ids(base({ streak: 8, hour: 19, activeToday: false }))).toContain("streak_risk");
    expect(ids(base({ streak: 8, hour: 15, activeToday: false }))).not.toContain("streak_risk");
  });

  it("ungelesenes Lernbuch-Kapitel → Lies zuerst …", () => {
    const i = evaluateRules(base({ lernbuch: { read: 5, total: 696, dueAgain: 0, checksPassed: 0, nextUnread: { title: "Steuerrecht", href: "/lernbuch/rechnungswesen/steuerrecht" }, readyForCheck: null } })).find((x) => x.id === "lernbuch_next")!;
    expect(i.title_de + i.text_de).toMatch(/Steuerrecht/);
    expect(i.action?.route).toBe("/lernbuch/rechnungswesen/steuerrecht");
  });

  it("≥ 3 Tage inaktiv → Comeback", () => {
    expect(ids(base({ activeToday: false, lastActiveDay: "2026-11-18" }))).toContain("inactive_comeback");
    expect(ids(base({ activeToday: false, lastActiveDay: "2026-11-21" }))).not.toContain("inactive_comeback");
  });

  it("Trefferquote +10 Punkte → Lob mit Zahl", () => {
    const i = evaluateRules(base({ accuracy7: 82, accuracyPrev7: 70 })).find((x) => x.id === "accuracy_up")!;
    expect(i.mood).toBe("celebrate");
    expect(i.title_de + i.text_de).toMatch(/12|82/);
  });

  it("nach 23 Uhr → Schlaf-Hinweis", () => {
    expect(ids(base({ hour: 23 }))).toContain("late_night");
    expect(ids(base({ hour: 22 }))).not.toContain("late_night");
  });

  it("Prüfung morgen → Checkliste mit höchster Priorität", () => {
    const list = evaluateRules(base({ daysToExam: 1, dueCount: 30 }));
    expect(list[0].id).toBe("exam_tomorrow");
    expect(list[0].text_de).toMatch(/Ausweis/);
  });

  it("ganz neu → erste Schritte, Stimmung happy", () => {
    const list = evaluateRules(base({ answeredTotal: 0, lernbuch: { read: 0, total: 696, dueAgain: 0, checksPassed: 0, nextUnread: { title: "Rechnungswesen", href: "/x" }, readyForCheck: null } }));
    expect(list[0].id).toBe("first_steps");
    expect(moodOf(list)).toBe("happy");
  });

  it("sortiert nach Priorität und lässt keep_going weg, wenn es mehr gibt", () => {
    const list = evaluateRules(base({ dueCount: 5, openMistakes: 7 }));
    for (let k = 1; k < list.length; k++) expect(list[k - 1].priority).toBeGreaterThanOrEqual(list[k].priority);
    expect(list.map((i) => i.id)).not.toContain("keep_going");
  });

  it("Tagesplan hat 3–5 Punkte ohne doppelte Ziele", () => {
    const insights = evaluateRules(base({ dueCount: 5, openMistakes: 7, categories: [cat({ attempts30: 15, accuracy30: 40 })] }));
    const plan = planFromInsights(insights, { dailyGoal: 20 });
    expect(plan.length).toBeGreaterThanOrEqual(3);
    expect(plan.length).toBeLessThanOrEqual(5);
    expect(new Set(plan.map((p) => p.route)).size).toBe(plan.length);
    expect(planFromInsights([], { dailyGoal: 10 }).length).toBe(3);
  });

  it("Top-3-Schwächen", () => {
    const list = topWeaknesses([cat({ slug: "a", accuracy30: 90, masteredPct: 80 }), cat({ slug: "b", accuracy30: 30 }), cat({ slug: "c", accuracy30: 50 }), cat({ slug: "d", accuracy30: 70 })]);
    expect(list.map((c) => c.slug)).toEqual(["b", "c", "d"]);
  });
});

describe("Textbausteine", () => {
  it("Platzhalter werden ersetzt, unbekannte bleiben stehen", () => {
    expect(fill("{n} Fragen – {min} Minuten", { n: 4, min: 2 })).toBe("4 Fragen – 2 Minuten");
    expect(fill("{x}", {})).toBe("{x}");
  });

  it("keine Wiederholung derselben Variante innerhalb von 3 Tagen", () => {
    for (const id of Object.keys(TEMPLATES)) {
      const days = ["2026-11-20", "2026-11-21", "2026-11-22"].map((d) => pickVariant(id, d).title);
      expect(new Set(days).size, id).toBe(3);
    }
  });
});
