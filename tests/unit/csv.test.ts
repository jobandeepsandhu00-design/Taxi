import { describe, expect, it } from "vitest";
import { CSV_HEADERS, parseQuestionCsv, serializeQuestionsCsv, type CsvRow } from "@/lib/csv";

const header = CSV_HEADERS.join(";");
const row = (overrides: Partial<CsvRow> = {}) => {
  const base: CsvRow = {
    id: "",
    kategorie: "stvo",
    thema: "Vorrang",
    frage: "Wer hat an einer ungeregelten Kreuzung Vorrang?",
    antwort_a: "Von links",
    antwort_b: "Von rechts",
    antwort_c: "Der Schnellere",
    antwort_d: "Der Größere",
    richtig: "B",
    erklaerung: "Es gilt die Rechtsregel.",
    erklaerung_a: "",
    erklaerung_b: "Richtig",
    erklaerung_c: "",
    erklaerung_d: "",
    schwierigkeit: "LEICHT",
    herkunft: "UEBUNG",
    status: "VEROEFFENTLICHT",
    quelle: "StVO",
    fundstelle: "§ 19 StVO",
    tags: "vorrang|kreuzung",
    bild_url: "",
  };
  return CSV_HEADERS.map((h) => {
    const v = (overrides[h] ?? base[h]) as string;
    return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(";");
};

describe("parseQuestionCsv", () => {
  it("parst eine gültige Zeile", () => {
    const { questions, errors } = parseQuestionCsv(`${header}\n${row()}`);
    expect(errors).toEqual([]);
    expect(questions).toHaveLength(1);
    const q = questions[0];
    expect(q.categorySlug).toBe("stvo");
    expect(q.difficulty).toBe("EASY");
    expect(q.origin).toBe("PRACTICE");
    expect(q.status).toBe("PUBLISHED");
    expect(q.multipleCorrect).toBe(false);
    expect(q.options.find((o) => o.isCorrect)?.label).toBe("B");
    expect(q.tags).toEqual(["vorrang", "kreuzung"]);
  });

  it("erkennt Mehrfachauswahl", () => {
    const { questions } = parseQuestionCsv(`${header}\n${row({ richtig: "A, C" })}`);
    expect(questions[0].multipleCorrect).toBe(true);
    expect(questions[0].options.filter((o) => o.isCorrect).map((o) => o.label)).toEqual(["A", "C"]);
  });

  it("meldet fehlende Pflichtspalten", () => {
    const { errors } = parseQuestionCsv("kategorie;frage\nstvo;Test?");
    expect(errors[0].message).toMatch(/Fehlende Spalten/);
  });

  it("meldet ungültige Zeilen mit Zeilennummer und überspringt sie", () => {
    const csv = `${header}\n${row()}\n${row({ richtig: "E" })}\n${row({ antwort_c: "" })}`;
    const { questions, errors } = parseQuestionCsv(csv);
    expect(questions).toHaveLength(1);
    expect(errors.map((e) => e.rowNumber)).toEqual([3, 4]);
  });

  it("verlangt Quelle für offizielle Fragen", () => {
    const { errors } = parseQuestionCsv(`${header}\n${row({ herkunft: "OFFIZIELL", quelle: "" })}`);
    expect(errors[0].message).toMatch(/Quelle/);
  });

  it("lehnt unsichere Bild-URLs ab", () => {
    const { errors } = parseQuestionCsv(`${header}\n${row({ bild_url: "javascript:alert(1)" })}`);
    expect(errors[0].message).toMatch(/Bild-URL/);
  });

  it("verarbeitet BOM, Kommatrennung und Anführungszeichen", () => {
    const commaHeader = CSV_HEADERS.join(",");
    const values = row({ frage: 'Was bedeutet "Vorrang geben"?' }).split(";").map((v) => (v.includes(",") ? `"${v}"` : v));
    const { questions, errors } = parseQuestionCsv(`﻿${commaHeader}\n${values.join(",")}`);
    expect(errors).toEqual([]);
    expect(questions[0].text).toBe('Was bedeutet "Vorrang geben"?');
  });
});

describe("serializeQuestionsCsv", () => {
  it("erzeugt eine CSV, die wieder eingelesen werden kann (Roundtrip)", () => {
    const parsed = parseQuestionCsv(`${header}\n${row({ frage: "Text mit; Semikolon und \"Zitat\"" })}`);
    const q = parsed.questions[0];
    const csv = serializeQuestionsCsv([
      {
        id: "abc",
        kategorie: q.categorySlug,
        thema: q.topicName ?? "",
        frage: q.text,
        antwort_a: q.options[0].text,
        antwort_b: q.options[1].text,
        antwort_c: q.options[2].text,
        antwort_d: q.options[3].text,
        richtig: "B",
        erklaerung: q.explanation,
        erklaerung_a: "",
        erklaerung_b: "",
        erklaerung_c: "",
        erklaerung_d: "",
        schwierigkeit: "LEICHT",
        herkunft: "DEMO",
        status: "ENTWURF",
        quelle: "",
        fundstelle: "",
        tags: "",
        bild_url: "",
      },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    const again = parseQuestionCsv(csv);
    expect(again.errors).toEqual([]);
    expect(again.questions[0].text).toBe('Text mit; Semikolon und "Zitat"');
    expect(again.questions[0].id).toBe("abc");
    expect(again.questions[0].origin).toBe("DEMO");
  });
});
