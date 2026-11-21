import { describe, expect, it } from "vitest";
import { clampScore, coverageScore, fakeCoverage, parseKeyPoints, pickFollowUp, pickWeighted, sessionPercent, verdictFor, type KeyPoint } from "@/lib/oral";
import { oralQuestions } from "../../prisma/seed-data/oral-questions";

const pts: KeyPoint[] = [
  { id: "k1", text: "Sofort anhalten und Unfallstelle absichern", required: true },
  { id: "k2", text: "Erste Hilfe leisten", required: true },
  { id: "k3", text: "Am Unfallort bleiben", required: false },
];

describe("oral grading rules", () => {
  it("verdict follows required points", () => {
    expect(verdictFor(pts, ["k1", "k2"])).toBe("richtig");
    expect(verdictFor(pts, ["k1", "k2"], 1)).toBe("teilweise");
    expect(verdictFor(pts, ["k3"])).toBe("teilweise");
    expect(verdictFor(pts, [])).toBe("falsch");
  });
  it("score is consistent with verdict", () => {
    expect(clampScore(4, "richtig")).toBe(7);
    expect(clampScore(9, "falsch")).toBe(3);
    expect(clampScore(10, "teilweise")).toBe(8);
    expect(coverageScore(pts, ["k1", "k2", "k3"])).toBe(10);
    expect(coverageScore(pts, ["k3"])).toBe(2);
  });
  it("picks follow-up for first missing required point", () => {
    const fu = [{ trigger_point_id: "k2", question_de: "Was noch?" }];
    expect(pickFollowUp(pts, ["k1"], fu)).toBe("Was noch?");
    expect(pickFollowUp(pts, ["k1", "k2"], fu)).toBeNull();
  });
  it("fake coverage finds points from the model answer", () => {
    for (const q of oralQuestions) {
      const covered = fakeCoverage(q.keyPoints, q.modelAnswerDe);
      expect(verdictFor(q.keyPoints, covered), q.key).toBe("richtig");
    }
    expect(fakeCoverage(pts, "Keine Ahnung")).toEqual([]);
  });
  it("seed is well formed", () => {
    expect(oralQuestions).toHaveLength(10);
    for (const q of oralQuestions) {
      expect(q.keyPoints.length).toBeGreaterThanOrEqual(3);
      expect(q.keyPoints.length).toBeLessThanOrEqual(5);
      expect(q.followUps).toHaveLength(1);
      expect(q.keyPoints.some((k) => k.id === q.followUps[0].trigger_point_id && k.required)).toBe(true);
      expect(parseKeyPoints(q.keyPoints)).toHaveLength(q.keyPoints.length);
    }
  });
  it("weighted pick returns unique items, all categories when possible", () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `q${i}`, categoryId: `c${i % 5}` }));
    const out = pickWeighted(items, 10);
    expect(new Set(out.map((o) => o.id)).size).toBe(10);
    expect(new Set(out.map((o) => o.categoryId)).size).toBeGreaterThanOrEqual(3);
    expect(pickWeighted(items.slice(0, 4), 10)).toHaveLength(4);
  });
  it("session percent", () => {
    expect(sessionPercent([10, 5], 2)).toBe(75);
    expect(sessionPercent([], 0)).toBe(0);
  });
});

import { konzessionCategories, konzessionQuestions as kq } from "../../prisma/seed-data/konzession";
import { buchRwOral, buchRwQuestions } from "../../prisma/seed-data/buch-rechnungswesen";
import { buchBbChapter } from "../../prisma/seed-data/buch-buchhaltung";
import { buchPvChapter } from "../../prisma/seed-data/buch-personal";
import { buchStChapter } from "../../prisma/seed-data/buch-steuerrecht";
import { buchDbChapter, buchFiChapter, buchVkChapter } from "../../prisma/seed-data/buch-kosten";
const konzessionQuestions = [...kq, ...buchRwQuestions, ...buchBbChapter.questions, ...buchPvChapter.questions, ...buchVkChapter.questions, ...buchDbChapter.questions, ...buchFiChapter.questions];

describe("Konzession-Kapitel", () => {
  it("jede Kategorie hat Fragen, jede Frage genau gültige Struktur", () => {
    const slugs = new Set(konzessionCategories.map((c) => c.slug));
    expect(slugs.size).toBe(konzessionCategories.length);
    const ids = new Set(konzessionQuestions.map((q) => q.id));
    expect(ids.size).toBe(konzessionQuestions.length);
    for (const c of konzessionCategories) expect(konzessionQuestions.filter((q) => q.category === c.slug).length, c.slug).toBeGreaterThanOrEqual(3);
    for (const q of konzessionQuestions) {
      expect(slugs.has(q.category), q.id).toBe(true);
      expect(konzessionCategories.find((c) => c.slug === q.category)!.topics.some((t) => t.slug === q.topic), q.id).toBe(true);
      expect(q.options.filter((o) => o[1]).length, q.id).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("Skript Rechnungswesen", () => {
  it("43 mündliche Fragen und mindestens 43 MC-Fragen", () => {
    expect(buchRwOral).toHaveLength(43);
    expect(buchRwQuestions).toHaveLength(43);
    for (const o of buchRwOral) {
      expect(o.keyPoints.some((k) => k.required), o.key).toBe(true);
      expect(o.keyPoints.some((k) => k.id === o.followUps[0].trigger_point_id), o.key).toBe(true);
    }
    for (const o of buchRwOral) expect(verdictFor(o.keyPoints, fakeCoverage(o.keyPoints, o.modelAnswerDe)), o.key).toBe("richtig");
    // Richtige Antwort nicht immer an derselben Stelle
    const firsts = buchRwQuestions.filter((q) => q.options[0][1]).length;
    expect(firsts).toBeLessThan(buchRwQuestions.length * 0.6);
  });
});

describe("Skript Doppelte Buchhaltung", () => {
  it("20 Fragen, vollständige Antwort als richtige Auswahl, mündlich bewertbar", () => {
    expect(buchBbChapter.questions).toHaveLength(20);
    expect(buchBbChapter.oral).toHaveLength(20);
    for (const q of buchBbChapter.questions) expect(q.options.find((o) => o[1])![0], q.id).toBe(q.explanation);
    for (const o of buchBbChapter.oral) expect(verdictFor(o.keyPoints, fakeCoverage(o.keyPoints, o.modelAnswerDe)), o.key).toBe("richtig");
  });
});

describe("Skript Personalverrechnung und Steuerrecht", () => {
  it("22 + 36 Fragen, vollständige Antworten, mündlich bewertbar", () => {
    expect(buchPvChapter.questions).toHaveLength(22);
    expect(buchStChapter.questions).toHaveLength(36);
    for (const ch of [buchPvChapter, buchStChapter]) {
      for (const q of ch.questions) expect(q.options.find((o) => o[1])![0], q.id).toBe(q.explanation);
      for (const o of ch.oral) expect(verdictFor(o.keyPoints, fakeCoverage(o.keyPoints, o.modelAnswerDe)), o.key).toBe("richtig");
    }
    expect(new Set(buchStChapter.questions.map((q) => q.topic))).toEqual(new Set(["umsatzsteuer", "buchhaltung", "registrierkasse"]));
  });
});

describe("Skript Vollkosten, Deckungsbeitrag, Finanzierung", () => {
  it("31 + 15 + 10 Fragen, vollständige Antworten, mündlich bewertbar", () => {
    expect(buchVkChapter.questions).toHaveLength(31);
    expect(buchDbChapter.questions).toHaveLength(15);
    expect(buchFiChapter.questions).toHaveLength(10);
    for (const ch of [buchVkChapter, buchDbChapter, buchFiChapter]) {
      for (const q of ch.questions) expect(q.options.find((o) => o[1])![0], q.id).toBe(q.explanation);
      for (const o of ch.oral) expect(verdictFor(o.keyPoints, fakeCoverage(o.keyPoints, o.modelAnswerDe)), o.key).toBe("richtig");
    }
  });
});

import { buchArChapter } from "../../prisma/seed-data/buch-arbeitsrecht";

describe("Skript Arbeits- und Sozialrecht", () => {
  it("157 Fragen (Nr. 138 und 157 fehlen), 4 verschiedene Antworten, mündlich bewertbar", () => {
    expect(buchArChapter.questions).toHaveLength(157);
    expect(new Set(buchArChapter.questions.map((q) => q.id)).size).toBe(157);
    for (const q of buchArChapter.questions) {
      expect(q.options.find((o) => o[1])![0], q.id).toBe(q.explanation);
      expect(new Set(q.options.map((o) => o[0])).size, q.id).toBe(4);
    }
    for (const o of buchArChapter.oral) expect(verdictFor(o.keyPoints, fakeCoverage(o.keyPoints, o.modelAnswerDe)), o.key).toBe("richtig");
  });
});

import { buchBoChapter } from "../../prisma/seed-data/buch-betriebsordnung";

describe("Skript Betriebsordnung und Tarif", () => {
  it("1 + 52 + 27 + 11 Fragen, eindeutige IDs, 4 verschiedene Antworten, mündlich bewertbar", () => {
    expect(buchBoChapter.questions).toHaveLength(91);
    expect(new Set(buchBoChapter.questions.map((q) => q.id)).size).toBe(91);
    for (const q of buchBoChapter.questions) {
      expect(q.options.find((o) => o[1])![0], q.id).toBe(q.explanation);
      expect(new Set(q.options.map((o) => o[0])).size, q.id).toBe(4);
    }
    for (const o of buchBoChapter.oral) expect(verdictFor(o.keyPoints, fakeCoverage(o.keyPoints, o.modelAnswerDe)), o.key).toBe("richtig");
  });
});
