import { describe, expect, it } from "vitest";
import { decimalToWords, intToWords, ordinalToWords, yearToWords } from "@/lib/tts/numbers";
import { normalizeForSpeech, ssmlBodyFor, ssmlToPlain, wrapSsml } from "@/lib/tts/prepare";

describe("Zahlwörter", () => {
  it("ganze Zahlen", () => {
    expect(intToWords(0)).toBe("null");
    expect(intToWords(1)).toBe("eins");
    expect(intToWords(21)).toBe("einundzwanzig");
    expect(intToWords(24)).toBe("vierundzwanzig");
    expect(intToWords(100)).toBe("einhundert");
    expect(intToWords(101)).toBe("einhunderteins");
    expect(intToWords(1001)).toBe("eintausendeins");
    expect(intToWords(700000)).toBe("siebenhunderttausend");
    expect(intToWords(35000)).toBe("fünfunddreißigtausend");
    expect(intToWords(2_500_000)).toBe("zwei Millionen fünfhunderttausend");
    expect(intToWords(1_000_000)).toBe("eine Million");
  });
  it("Jahre, Ordnungszahlen, Dezimal", () => {
    expect(yearToWords(1990)).toBe("neunzehnhundertneunzig");
    expect(yearToWords(2025)).toBe("zweitausendfünfundzwanzig");
    expect(ordinalToWords(1)).toBe("erster");
    expect(ordinalToWords(7)).toBe("siebter");
    expect(ordinalToWords(30)).toBe("dreißigster");
    expect(decimalToWords("0,1")).toBe("null Komma eins");
    expect(decimalToWords("0,05")).toBe("null Komma null fünf");
  });
});

describe("Text für die Sprachausgabe", () => {
  it("Einheiten und Beträge", () => {
    expect(normalizeForSpeech("Abstand 5 m")).toBe("Abstand fünf Meter");
    expect(normalizeForSpeech("Grenze 0,1 ‰")).toBe("Grenze null Komma eins Promille");
    expect(normalizeForSpeech("Tempo 50 km/h")).toBe("Tempo fünfzig Kilometer pro Stunde");
    expect(normalizeForSpeech("Kapital 700.000 €")).toBe("Kapital siebenhunderttausend Euro");
    expect(normalizeForSpeech("Gebühr 2,50 €")).toBe("Gebühr zwei Euro fünfzig");
    expect(normalizeForSpeech("1 km")).toBe("ein Kilometer");
    expect(normalizeForSpeech("20 %")).toBe("zwanzig Prozent");
  });
  it("Paragrafen, Abkürzungen, Datum, Uhrzeit", () => {
    expect(normalizeForSpeech("§ 24 Abs. 1 StVO")).toBe("Paragraf vierundzwanzig Absatz eins Straßenverkehrsordnung");
    expect(normalizeForSpeech("lt. KFG bzw. GelverkG, z.B. Taxi")).toBe("laut Kraftfahrgesetz beziehungsweise Gelegenheitsverkehrsgesetz, zum Beispiel Taxi");
    expect(normalizeForSpeech("01. Januar 2025")).toBe("erster Januar zweitausendfünfundzwanzig");
    expect(normalizeForSpeech("am 01.07.2025")).toBe("am erster siebter zweitausendfünfundzwanzig");
    expect(normalizeForSpeech("um 14:30 Uhr")).toBe("um vierzehn Uhr dreißig");
  });
  it("eigenes Lexikon hat Vorrang (längster Begriff zuerst)", () => {
    expect(normalizeForSpeech("Die StVO gilt", [{ term: "StVO", spoken: "Ess-Te-Vau-O" }])).toBe("Die Ess-Te-Vau-O gilt");
  });
});

describe("SSML", () => {
  const q = { text: "Was ist die Höchstgeschwindigkeit?", answer: "50 km/h", explanation: "Im Ortsgebiet gilt 50 km/h, außer anders beschildert.", options: [{ label: "A", text: "30 km/h" }, { label: "B", text: "50 km/h" }] };
  it("Frage liest nur die Frage, mit Pause und Tempo 95 %", () => {
    const s = ssmlBodyFor("question", q)!;
    expect(s).toContain('<prosody rate="95%">');
    expect(s).toContain('<break time="400ms"/>');
    expect(s).not.toContain("Antwort A");
  });
  it("Antwort: „Richtig ist … Weil …“ nur mit zusätzlicher Erklärung", () => {
    expect(ssmlToPlain(ssmlBodyFor("answer", q)!)).toMatch(/^Richtig ist: fünfzig Kilometer pro Stunde … Weil: Im Ortsgebiet/);
    expect(ssmlToPlain(ssmlBodyFor("answer", { ...q, explanation: "50 km/h" })!)).toBe("fünfzig Kilometer pro Stunde");
    expect(ssmlBodyFor("explanation", { ...q, explanation: "50 km/h" })).toBeNull();
  });
  it("Optionen A–D und Escaping", () => {
    expect(ssmlToPlain(ssmlBodyFor("options", q)!)).toContain("Antwort A: dreißig Kilometer pro Stunde");
    expect(wrapSsml("a &amp; b", "de-AT-IngridNeural")).toContain('<voice name="de-AT-IngridNeural">');
    expect(ssmlBodyFor("question", { ...q, text: "A < B & C" })).toContain("A &lt; B &amp; C");
  });
});
