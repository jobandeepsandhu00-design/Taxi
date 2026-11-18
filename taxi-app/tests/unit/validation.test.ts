import { describe, expect, it } from "vitest";
import { questionSchema, registerSchema } from "@/lib/validation";
import { dayKey, diffDays, lastNDays } from "@/lib/dates";

const baseQuestion = {
  text: "Welche Höchstgeschwindigkeit gilt im Ortsgebiet?",
  explanation: "Grundsätzlich 50 km/h.",
  categoryId: "cat1",
  topicId: null,
  difficulty: "EASY" as const,
  multipleCorrect: false,
  imageUrl: null,
  tags: [],
  status: "DRAFT" as const,
  origin: "PRACTICE" as const,
  sourceId: null,
  sourceDetail: null,
  options: [
    { label: "A" as const, text: "30", isCorrect: false },
    { label: "B" as const, text: "50", isCorrect: true },
    { label: "C" as const, text: "70", isCorrect: false },
    { label: "D" as const, text: "80", isCorrect: false },
  ],
};

describe("questionSchema", () => {
  it("akzeptiert eine gültige Frage", () => {
    expect(questionSchema.safeParse(baseQuestion).success).toBe(true);
  });
  it("verlangt mindestens eine richtige Antwort", () => {
    const r = questionSchema.safeParse({ ...baseQuestion, options: baseQuestion.options.map((o) => ({ ...o, isCorrect: false })) });
    expect(r.success).toBe(false);
  });
  it("verbietet mehrere richtige Antworten bei Einfachauswahl", () => {
    const options = baseQuestion.options.map((o, i) => ({ ...o, isCorrect: i < 2 }));
    expect(questionSchema.safeParse({ ...baseQuestion, options }).success).toBe(false);
    expect(questionSchema.safeParse({ ...baseQuestion, multipleCorrect: true, options }).success).toBe(true);
  });
  it("verlangt genau vier Antworten", () => {
    expect(questionSchema.safeParse({ ...baseQuestion, options: baseQuestion.options.slice(0, 3) }).success).toBe(false);
  });
  it("lehnt javascript:-Bild-URLs ab", () => {
    expect(questionSchema.safeParse({ ...baseQuestion, imageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(questionSchema.safeParse({ ...baseQuestion, imageUrl: "/api/media/abc" }).success).toBe(true);
  });
});

describe("registerSchema", () => {
  it("normalisiert die E-Mail und prüft das Passwort", () => {
    const ok = registerSchema.safeParse({ name: "Max", email: " Max@Example.AT ", password: "sicher12345" });
    expect(ok.success && ok.data.email).toBe("max@example.at");
    expect(registerSchema.safeParse({ name: "Max", email: "max@example.at", password: "kurz1" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Max", email: "max@example.at", password: "nurbuchstaben" }).success).toBe(false);
  });
});

describe("Datumshilfen", () => {
  it("dayKey nutzt die Wiener Zeitzone", () => {
    // 23:30 UTC am 31.12. ist in Wien bereits der 1.1.
    expect(dayKey(new Date("2025-12-31T23:30:00Z"))).toBe("2026-01-01");
  });
  it("lastNDays liefert aufsteigende Tage inkl. heute", () => {
    expect(lastNDays(3, "2026-03-01")).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);
  });
  it("diffDays", () => {
    expect(diffDays("2026-01-01", "2026-01-31")).toBe(30);
  });
});
