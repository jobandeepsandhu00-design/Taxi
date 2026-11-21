import Papa from "papaparse";
import { OPTION_LABELS } from "./quiz-logic";

/**
 * CSV-Format für Import/Export (Trennzeichen „;“ oder „,“, UTF-8, Kopfzeile erforderlich):
 * id;kategorie;thema;frage;antwort_a;antwort_b;antwort_c;antwort_d;richtig;erklaerung;
 * erklaerung_a;erklaerung_b;erklaerung_c;erklaerung_d;schwierigkeit;herkunft;status;
 * quelle;fundstelle;tags;bild_url
 *
 * - kategorie: Slug der Kategorie (z. B. "stvo")
 * - richtig: Buchstaben der richtigen Antworten, z. B. "B" oder "A,C"
 * - schwierigkeit: LEICHT | MITTEL | SCHWER (oder EASY | MEDIUM | HARD)
 * - herkunft: UEBUNG | DEMO | OFFIZIELL (oder PRACTICE | DEMO | OFFICIAL)
 * - status: ENTWURF | VEROEFFENTLICHT | ARCHIVIERT (oder DRAFT | PUBLISHED | ARCHIVED)
 * - tags: durch "|" getrennt
 */
export const CSV_HEADERS = [
  "id",
  "kategorie",
  "thema",
  "frage",
  "antwort_a",
  "antwort_b",
  "antwort_c",
  "antwort_d",
  "richtig",
  "erklaerung",
  "erklaerung_a",
  "erklaerung_b",
  "erklaerung_c",
  "erklaerung_d",
  "schwierigkeit",
  "herkunft",
  "status",
  "quelle",
  "fundstelle",
  "tags",
  "bild_url",
  "merkhilfe",
] as const;

export type CsvRow = Record<(typeof CSV_HEADERS)[number], string>;

export interface ParsedCsvQuestion {
  rowNumber: number;
  id?: string;
  categorySlug: string;
  topicName?: string;
  text: string;
  options: { label: "A" | "B" | "C" | "D"; text: string; isCorrect: boolean; explanation?: string }[];
  multipleCorrect: boolean;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  origin: "OFFICIAL" | "PRACTICE" | "DEMO";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sourceTitle?: string;
  sourceDetail?: string;
  tags: string[];
  imageUrl?: string;
  mnemonic?: string;
}

export interface CsvParseResult {
  questions: ParsedCsvQuestion[];
  errors: { rowNumber: number; message: string }[];
}

const DIFFICULTY_MAP: Record<string, ParsedCsvQuestion["difficulty"]> = {
  LEICHT: "EASY",
  EASY: "EASY",
  MITTEL: "MEDIUM",
  MEDIUM: "MEDIUM",
  SCHWER: "HARD",
  HARD: "HARD",
};
const ORIGIN_MAP: Record<string, ParsedCsvQuestion["origin"]> = {
  UEBUNG: "PRACTICE",
  ÜBUNG: "PRACTICE",
  PRACTICE: "PRACTICE",
  DEMO: "DEMO",
  OFFIZIELL: "OFFICIAL",
  OFFICIAL: "OFFICIAL",
};
const STATUS_MAP: Record<string, ParsedCsvQuestion["status"]> = {
  ENTWURF: "DRAFT",
  DRAFT: "DRAFT",
  VEROEFFENTLICHT: "PUBLISHED",
  VERÖFFENTLICHT: "PUBLISHED",
  PUBLISHED: "PUBLISHED",
  ARCHIVIERT: "ARCHIVED",
  ARCHIVED: "ARCHIVED",
};

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseQuestionCsv(content: string): CsvParseResult {
  const text = content.replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const result: CsvParseResult = { questions: [], errors: [] };
  const fields = parsed.meta.fields ?? [];
  const required = ["kategorie", "frage", "antwort_a", "antwort_b", "antwort_c", "antwort_d", "richtig", "erklaerung"];
  const missing = required.filter((r) => !fields.includes(r));
  if (missing.length) {
    result.errors.push({ rowNumber: 1, message: `Fehlende Spalten: ${missing.join(", ")}` });
    return result;
  }

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2; // Kopfzeile = 1
    const problems: string[] = [];
    const categorySlug = clean(row.kategorie).toLowerCase();
    const questionText = clean(row.frage);
    const explanation = clean(row.erklaerung);
    if (!categorySlug) problems.push("Kategorie fehlt");
    if (questionText.length < 5) problems.push("Fragetext fehlt oder ist zu kurz");
    if (!explanation) problems.push("Erklärung fehlt");

    const correctLabels = clean(row.richtig)
      .toUpperCase()
      .split(/[\s,|/]+/)
      .filter(Boolean);
    if (correctLabels.length === 0) problems.push("Keine richtige Antwort angegeben");
    const invalid = correctLabels.filter((l) => !(OPTION_LABELS as readonly string[]).includes(l));
    if (invalid.length) problems.push(`Ungültige Antwortbuchstaben: ${invalid.join(", ")}`);

    const options = OPTION_LABELS.map((label) => {
      const key = label.toLowerCase();
      return {
        label,
        text: clean(row[`antwort_${key}`]),
        isCorrect: correctLabels.includes(label),
        explanation: clean(row[`erklaerung_${key}`]) || undefined,
      };
    });
    if (options.some((o) => !o.text)) problems.push("Alle vier Antworten (A–D) sind erforderlich");

    const diffRaw = clean(row.schwierigkeit).toUpperCase() || "MITTEL";
    const difficulty = DIFFICULTY_MAP[diffRaw];
    if (!difficulty) problems.push(`Unbekannte Schwierigkeit „${row.schwierigkeit}“`);
    const originRaw = clean(row.herkunft).toUpperCase() || "UEBUNG";
    const origin = ORIGIN_MAP[originRaw];
    if (!origin) problems.push(`Unbekannte Herkunft „${row.herkunft}“`);
    const statusRaw = clean(row.status).toUpperCase() || "ENTWURF";
    const status = STATUS_MAP[statusRaw];
    if (!status) problems.push(`Unbekannter Status „${row.status}“`);
    const sourceTitle = clean(row.quelle) || undefined;
    if (origin === "OFFICIAL" && !sourceTitle) problems.push("Offizielle Fragen benötigen eine Quelle");
    const imageUrl = clean(row.bild_url) || undefined;
    if (imageUrl && !imageUrl.startsWith("/") && !imageUrl.startsWith("https://"))
      problems.push("Bild-URL muss mit https:// oder / beginnen");

    if (problems.length) {
      result.errors.push({ rowNumber, message: problems.join("; ") });
      return;
    }
    result.questions.push({
      rowNumber,
      id: clean(row.id) || undefined,
      categorySlug,
      topicName: clean(row.thema) || undefined,
      text: questionText,
      options,
      multipleCorrect: correctLabels.length > 1,
      explanation,
      difficulty: difficulty!,
      origin: origin!,
      status: status!,
      sourceTitle,
      sourceDetail: clean(row.fundstelle) || undefined,
      tags: clean(row.tags)
        .split("|")
        .map((t) => t.trim())
        .filter(Boolean),
      imageUrl,
      mnemonic: clean(row.merkhilfe) || undefined,
    });
  });
  return result;
}

export function serializeQuestionsCsv(rows: CsvRow[]): string {
  return (
    "﻿" +
    Papa.unparse(
      { fields: [...CSV_HEADERS], data: rows.map((r) => CSV_HEADERS.map((h) => r[h] ?? "")) },
      { delimiter: ";", newline: "\r\n" },
    )
  );
}
