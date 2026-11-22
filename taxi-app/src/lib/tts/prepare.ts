/**
 * Text → SSML für natürliche Sprachausgabe (Abkürzungen, Zahlen, Einheiten, §, Datum, Pausen).
 * Reine Funktionen – client- und servertauglich, unit-getestet.
 */
import { decimalToWords, intToWords, MONTHS, ordinalToWords, yearToWords } from "./numbers";

export type LexiconEntry = { term: string; spoken: string };

/** Standard-Wörterbuch (in der Admin-Tabelle tts_lexicon erweiterbar/überschreibbar). */
export const DEFAULT_LEXICON: LexiconEntry[] = [
  { term: "StVO", spoken: "Straßenverkehrsordnung" },
  { term: "KFG", spoken: "Kraftfahrgesetz" },
  { term: "GelverkG", spoken: "Gelegenheitsverkehrsgesetz" },
  { term: "GewO", spoken: "Gewerbeordnung" },
  { term: "ASVG", spoken: "A S V G" },
  { term: "UGB", spoken: "Unternehmensgesetzbuch" },
  { term: "ABGB", spoken: "A B G B" },
  { term: "GmbH", spoken: "G m b H" },
  { term: "KG", spoken: "K G" },
  { term: "OG", spoken: "O G" },
  { term: "AfA", spoken: "Absetzung für Abnutzung" },
  { term: "USt", spoken: "Umsatzsteuer" },
  { term: "MwSt", spoken: "Mehrwertsteuer" },
  { term: "KöSt", spoken: "Körperschaftsteuer" },
  { term: "ESt", spoken: "Einkommensteuer" },
  { term: "WKO", spoken: "W K O" },
  { term: "SVS", spoken: "S V S" },
  { term: "ÖGK", spoken: "Ö G K" },
  { term: "PKW", spoken: "P K W" },
  { term: "Pkw", spoken: "P K W" },
  { term: "LKW", spoken: "L K W" },
  { term: "Kfz", spoken: "K F Z" },
  { term: "KFZ", spoken: "K F Z" },
  { term: "KV", spoken: "Kollektivvertrag" },
  { term: "bzw.", spoken: "beziehungsweise" },
  { term: "z.B.", spoken: "zum Beispiel" },
  { term: "z. B.", spoken: "zum Beispiel" },
  { term: "ca.", spoken: "circa" },
  { term: "inkl.", spoken: "inklusive" },
  { term: "exkl.", spoken: "exklusive" },
  { term: "lt.", spoken: "laut" },
  { term: "Nr.", spoken: "Nummer" },
  { term: "u.a.", spoken: "unter anderem" },
  { term: "u. a.", spoken: "unter anderem" },
  { term: "usw.", spoken: "und so weiter" },
  { term: "etc.", spoken: "et cetera" },
  { term: "d.h.", spoken: "das heißt" },
  { term: "d. h.", spoken: "das heißt" },
  { term: "evtl.", spoken: "eventuell" },
  { term: "ggf.", spoken: "gegebenenfalls" },
  { term: "max.", spoken: "maximal" },
  { term: "mind.", spoken: "mindestens" },
  { term: "min.", spoken: "mindestens" },
  { term: "vgl.", spoken: "vergleiche" },
  { term: "Abs.", spoken: "Absatz" },
  { term: "lit.", spoken: "litera" },
  { term: "Z.", spoken: "Ziffer" },
  { term: "Art.", spoken: "Artikel" },
  { term: "Jh.", spoken: "Jahrhundert" },
  { term: "Str.", spoken: "Straße" },
  // Wiener Orte (Aussprache-Hilfen)
  { term: "Praterstern", spoken: "Prater-stern" },
  { term: "Gürtel", spoken: "Gürtel" },
  { term: "Hietzing", spoken: "Hiet-zing" },
  { term: "Simmering", spoken: "Simme-ring" },
];

const UNITS: [RegExp, string, string][] = [
  // [Muster für Einheit, Singular, Plural]
  [/^km\/h$/i, "Kilometer pro Stunde", "Kilometer pro Stunde"],
  [/^km$/i, "Kilometer", "Kilometer"],
  [/^m$/, "Meter", "Meter"],
  [/^cm$/, "Zentimeter", "Zentimeter"],
  [/^kg$/i, "Kilogramm", "Kilogramm"],
  [/^t$/, "Tonne", "Tonnen"],
  [/^l$/, "Liter", "Liter"],
  [/^h$/, "Stunde", "Stunden"],
  [/^min$/, "Minute", "Minuten"],
  [/^‰$/, "Promille", "Promille"],
  [/^%$/, "Prozent", "Prozent"],
  [/^(€|EUR|Euro)$/, "Euro", "Euro"],
];

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Zahl (mit . oder Leerzeichen als Tausender, Komma als Dezimal) → Wörter. */
function numberWords(raw: string): string {
  const clean = raw.replace(/[.\s](?=\d{3}(\D|$))/g, "");
  return clean.includes(",") ? decimalToWords(clean) : intToWords(Number(clean));
}

/** Text für die Sprachausgabe aufbereiten (ohne SSML-Tags). */
export function normalizeForSpeech(input: string, lexicon: LexiconEntry[] = DEFAULT_LEXICON): string {
  let t = ` ${input.replace(/\s+/g, " ").trim()} `;
  // Aufzählungszeichen / Nummerierung am Zeilenanfang
  t = t.replace(/(^|\s)[•▪◦-]\s+/g, "$1");
  // Lexikon (längste Begriffe zuerst; ganze Wörter)
  const entries = [...lexicon].sort((a, b) => b.term.length - a.term.length);
  for (const e of entries) {
    const re = new RegExp(`(^|[\\s(„"'/])${escapeRe(e.term)}(?=$|[\\s),.;:!?“"'/])`, "g");
    t = t.replace(re, `$1${e.spoken}`);
  }
  // Paragrafen: §§ 24 und 25 / § 24 Abs. 1
  t = t.replace(/§§\s*/g, "Paragrafen ").replace(/§\s*/g, "Paragraf ");
  // Datum: 01.07.2025 → erster Siebter zweitausendfünfundzwanzig; 01. Januar 2025
  t = t.replace(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g, (_, d, m, y) => `${ordinalToWords(Number(d))} ${ordinalToWords(Number(m))} ${yearToWords(Number(y))}`);
  t = t.replace(new RegExp(`\\b(\\d{1,2})\\.\\s*(${MONTHS.join("|")})(\\s+(\\d{4}))?`, "g"), (_, d, mon, __, y) => `${ordinalToWords(Number(d))} ${mon}${y ? ` ${yearToWords(Number(y))}` : ""}`);
  // Uhrzeit: 14:30 Uhr → vierzehn Uhr dreißig
  t = t.replace(/\b(\d{1,2}):(\d{2})\s*Uhr\b/g, (_, h, m) => `${intToWords(Number(h))} Uhr${Number(m) ? ` ${intToWords(Number(m))}` : ""}`);
  t = t.replace(/\b(\d{1,2})\s*Uhr\b/g, (_, h) => `${intToWords(Number(h))} Uhr`);
  // Euro mit Cent: 2,50 € → zwei Euro fünfzig
  t = t.replace(/(\d[\d.\s]*),(\d{2})\s*(€|EUR|Euro)(?=\W|$)/g, (_, i, c, ) => `${numberWords(i)} Euro${Number(c) ? ` ${intToWords(Number(c))}` : ""}`);
  // € vor der Zahl: € 700.000
  t = t.replace(/(€|EUR)\s*(\d[\d.\s]*(?:,\d+)?)/g, (_, __, n) => `${numberWords(n.trim())} Euro`);
  // Zahl + Einheit
  t = t.replace(/(\d[\d.\s]*(?:,\d+)?)\s*(km\/h|km|cm|kg|m|t|l|h|min|‰|%|€|EUR|Euro)(?=$|[\s),.;:!?/])/g, (m, n: string, unit: string) => {
    const u = UNITS.find(([re]) => re.test(unit));
    if (!u) return m;
    const words = numberWords(n.trim());
    return `${words} ${words === "eins" ? u[1] : u[2]}`.replace(/^eins (\S)/, "ein $1");
  });
  // Jahreszahlen allein (1900–2099 nach „im Jahr“ oder als 4-stellige Zahl)
  t = t.replace(/\b(1[89]\d{2}|20\d{2})\b/g, (_, y) => yearToWords(Number(y)));
  // übrige Zahlen
  t = t.replace(/\d+(?:[.\s]\d{3})*(?:,\d+)?/g, (n) => numberWords(n));
  // Abs. 1, Z 2 bleiben über die Zahlwort-Regel lesbar
  return t.replace(/\s+/g, " ").trim();
}

export type SsmlOptions = { rate?: number; breakAfterMs?: number };

/** Satz → SSML-Absatz mit optionaler Pause danach. */
export function toSsmlBody(text: string, lexicon?: LexiconEntry[], opts: SsmlOptions = {}): string {
  const spoken = escapeXml(normalizeForSpeech(text, lexicon));
  const rate = opts.rate && opts.rate !== 1 ? `<prosody rate="${Math.round(opts.rate * 100)}%">${spoken}</prosody>` : spoken;
  return `${rate}${opts.breakAfterMs ? `<break time="${opts.breakAfterMs}ms"/>` : ""}`;
}

export type AudioKind = "question" | "answer" | "options" | "explanation";
export const AUDIO_KINDS: AudioKind[] = ["question", "answer", "options", "explanation"];

export type QuestionForAudio = { text: string; answer: string; explanation: string | null; options: { label: string; text: string }[] };

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Erklärung nur, wenn sie mehr als die Antwort enthält. */
export function extraExplanationText(q: QuestionForAudio): string | null {
  if (!q.explanation?.trim()) return null;
  return norm(q.explanation) === norm(q.answer) ? null : q.explanation;
}

/** SSML-Inhalt (ohne <speak>/<voice>) für eine Audio-Art. null = für diese Frage nicht nötig. */
export function ssmlBodyFor(kind: AudioKind, q: QuestionForAudio, lexicon?: LexiconEntry[]): string | null {
  switch (kind) {
    case "question":
      // Nur die Frage – die mündliche Prüfung fragt offen (ohne Antwortmöglichkeiten)
      return toSsmlBody(q.text, lexicon, { rate: 0.95, breakAfterMs: 400 });
    case "answer": {
      const expl = extraExplanationText(q);
      const first = expl ? `Richtig ist: ${q.answer}` : q.answer;
      return `${toSsmlBody(first, lexicon, { breakAfterMs: expl ? 400 : 0 })}${expl ? toSsmlBody(`Weil: ${expl}`, lexicon) : ""}`;
    }
    case "options":
      return q.options.map((o) => toSsmlBody(`Antwort ${o.label}: ${o.text}`, lexicon, { breakAfterMs: 350 })).join("");
    case "explanation": {
      const expl = extraExplanationText(q);
      return expl ? toSsmlBody(expl, lexicon) : null;
    }
  }
}

/** Vollständiges SSML-Dokument für Anbieter mit SSML-Unterstützung. */
export function wrapSsml(body: string, voice: string, lang = "de-AT"): string {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${escapeXml(voice)}">${body}</voice></speak>`;
}

/** SSML → reiner Text (für Anbieter ohne SSML). */
export function ssmlToPlain(ssml: string): string {
  return ssml
    .replace(/<break[^>]*>/g, " … ")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
