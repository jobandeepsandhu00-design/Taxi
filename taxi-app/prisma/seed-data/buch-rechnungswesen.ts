/**
 * Kapitel 1 „Rechnungswesen“ – Fragen 1–43 aus dem Skript (Prüfungsfragen 2026).
 * - buchRwQuestions: Multiple-Choice-Fassung (die Skript-Antwort ist richtig)
 * - buchRwOral: mündliche Fassung (Skript-Antwort als Musterantwort, Kernpunkte zur Bewertung)
 * Alles ungeprüft – vor Freigabe gegen die aktuelle Rechtslage prüfen.
 */
import { shuffled } from "./konzession";
import type { OralSeed } from "./oral-questions";
import type { SeedQuestion } from "./questions";

type Opt = [text: string, correct: boolean, explanation: string];
const CAT = "k-rechnungswesen";

function mc(nr: string, topic: string, difficulty: "EASY" | "MEDIUM" | "HARD", text: string, options: [Opt, Opt, Opt, Opt], explanation: string): SeedQuestion {
  const id = `rwb-${nr}`;
  return { id, category: CAT, topic, difficulty, text, options: shuffled(id, options), explanation, detail: `Skript Rechnungswesen, Frage ${nr.replace(/[a-z]$/, "")}`, tags: ["konzession", "skript"] };
}

const T = "grundsaetze";
const B = "belege";
const E = "ea-rechnung";

export const buchRwQuestions: SeedQuestion[] = [
  mc("01", T, "EASY", "Welches der folgenden ist KEIN Teilgebiet des Rechnungswesens?", [
    ["Marketing", true, "Marketing gehört nicht zum Rechnungswesen."],
    ["Buchführung (Geschäftsaufzeichnung)", false, "Die Buchführung ist ein Teilgebiet."],
    ["Kostenrechnung", false, "Die Kostenrechnung ist ein Teilgebiet."],
    ["Planungsrechnung und Finanzierung", false, "Die Planungsrechnung ist ein Teilgebiet."],
  ], "Die 4 Teilgebiete des Rechnungswesens: 1) Buchführung/Geschäftsaufzeichnung (Einnahmen-Ausgaben-Rechnung, doppelte Buchhaltung, Pauschalierung), a) Kostenrechnung, b) Statistik, c) Planungsrechnung und Finanzierung. Sie werden chronologisch und systematisch durchgeführt."),
  mc("01b", T, "EASY", "Welche drei Formen der Buchführung bzw. Gewinnermittlung nennt das Skript?", [
    ["Einnahmen-Ausgaben-Rechnung, doppelte Buchhaltung (Bilanz), Pauschalierung", true, "Das sind die drei Formen."],
    ["Kassasturz, Inventur, Mahnwesen", false, "Das sind keine Formen der Gewinnermittlung."],
    ["Lohnverrechnung, Statistik, Marketing", false, "Falsch."],
    ["Nur die doppelte Buchhaltung", false, "Es gibt drei Formen."],
  ], "Zur Buchführung gehören: Einnahmen-Ausgaben-Rechnung, doppelte Buchhaltung (Bilanz) und Pauschalierung."),
  mc("02", T, "MEDIUM", "Welche Formvorschriften gelten in Österreich für die Buchführung? (Mehrere richtig)", [
    ["Bücher sind im Inland zu führen", true, "Richtig."],
    ["Es dürfen keine radierbaren Mittel verwendet werden", true, "Richtig."],
    ["Leere Zwischenräume sind erlaubt", false, "Es dürfen keine leeren Zwischenräume bleiben."],
    ["Die Bücher dürfen nur auf Englisch geführt werden", false, "In deutscher Sprache, sonst beglaubigte Übersetzung."],
  ], "Formvorschriften: 1) Bücher im Inland führen, 2) Unterlagen 7 Jahre aufbewahren, 3) keine radierbaren Mittel, 4) keine leeren Zwischenräume, 5) Eintragungen chronologisch, zeitgerecht, richtig und vollständig, 6) Überprüfung jederzeit möglich, 7) Seiten fortlaufend nummerieren, 8) in deutscher Sprache, sonst beglaubigte Übersetzung."),
  mc("02b", T, "EASY", "Wie lange müssen alle Buchhaltungsunterlagen aufbewahrt werden?", [
    ["7 Jahre", true, "Laut Formvorschriften 7 Jahre."],
    ["3 Jahre", false, "Zu kurz."],
    ["1 Jahr", false, "Zu kurz."],
    ["30 Jahre", false, "Zu lang."],
  ], "Alle Unterlagen müssen 7 Jahre aufbewahrt werden."),
  mc("03", B, "EASY", "Was gilt nach den Beleggrundsätzen für Änderungen an Belegen?", [
    ["Änderungen müssen eindeutig gekennzeichnet werden", true, "Belege sind Dokumente."],
    ["Belege dürfen unleserlich gemacht werden", false, "Belege darf man nicht verändern oder unleserlich machen."],
    ["Fehler werden mit Korrekturflüssigkeit überdeckt", false, "Keine radierbaren oder überdeckenden Mittel."],
    ["Nach der Buchung darf der Beleg vernichtet werden", false, "Belege sind aufzubewahren."],
  ], "Beleggrundsätze: 1) Keine Buchung ohne Beleg, 2) Belege sind Dokumente – nicht verändern oder unleserlich machen, 3) Änderungen eindeutig kennzeichnen, 4) unordentliche Belegbearbeitung = keine Glaubwürdigkeit."),
  mc("04", B, "EASY", "Welche der folgenden ist KEINE Belegart?", [
    ["Preisliste", true, "Eine Preisliste ist kein Buchungsbeleg."],
    ["Eingangsgutschrift (EG)", false, "Ist eine Belegart."],
    ["Ersatzbeleg", false, "Ist eine Belegart."],
    ["Bankbeleg", false, "Ist eine Belegart."],
  ], "Arten von Belegen: Eingangsrechnung (ER), Ausgangsrechnung (AR), Eingangsgutschrift (EG), Ausgangsgutschrift (AG), Kassabeleg, Ersatzbeleg, Bankbeleg."),
  mc("05", E, "MEDIUM", "Wann entsteht die (Umsatz-)Steuerschuld?", [
    ["Mit Ablauf des Kalendermonats", true, "Laut Skript mit Ablauf des Kalendermonats."],
    ["Erst am Jahresende", false, "Falsch."],
    ["Mit Abgabe der Jahreserklärung", false, "Falsch."],
    ["Erst bei einer Betriebsprüfung", false, "Falsch."],
  ], "Die Steuerschuld entsteht mit Ablauf des Kalendermonats."),
  mc("06", E, "MEDIUM", "Wann ist die USt-Zahllast fällig?", [
    ["Am 15. des zweitfolgenden Kalendermonats (1 Monat + 15 Tage)", true, "Richtig."],
    ["Am 1. des Folgemonats", false, "Zu früh."],
    ["Am 31. Dezember", false, "Falsch."],
    ["Am 15. des Folgemonats", false, "Einen Monat zu früh."],
  ], "Fälligkeit der USt-Zahllast: 15. des zweitfolgenden Kalendermonats (1 Monat + 15 Tage)."),
  mc("07", B, "HARD", "Wie wird die Tageslosung nach der indirekten Methode (Taxi) ermittelt?", [
    ["Bargeld bei Geschäftsschluss + Barausgänge des Tages − Bargeldbestand am Geschäftsbeginn − sonstige Eingänge", true, "So lautet das Schema."],
    ["Bargeld bei Geschäftsbeginn + sonstige Eingänge − Barausgänge", false, "Falsche Reihenfolge und Vorzeichen."],
    ["Nur das Bargeld bei Geschäftsschluss", false, "Barausgänge und Anfangsbestand fehlen."],
    ["Umsatz laut Taxameter minus Trinkgeld", false, "Nicht die Methode laut Skript."],
  ], "Indirekte Methode: Bargeld bei Geschäftsschluss + Barausgänge des Tages = Zwischensumme − Bargeldbestand am Geschäftsbeginn − sonstige Eingänge (z. B. Mieteinnahmen) = Tageslosung. Direkte Methode: Registrierkasse oder Scannerkassa. Bei der Ermittlung wird das Geld täglich nach Geschäftsschluss gezählt (Zählprotokoll)."),
  mc("07b", B, "EASY", "Womit wird die Tageslosung nach der direkten Methode ermittelt?", [
    ["Mit Registrierkasse oder Scannerkassa", true, "Richtig."],
    ["Durch Schätzung", false, "Falsch."],
    ["Mit dem Kontoauszug am Monatsende", false, "Falsch."],
    ["Durch Rückrechnung aus dem Kassastand", false, "Das ist die indirekte Methode."],
  ], "Es gibt 2 Methoden: indirekt (Taxi, Rückrechnung) und direkt (Registrierkasse oder Scannerkassa)."),
  mc("08", E, "EASY", "Wie lautet das Schema der Einnahmen-Ausgaben-Rechnung?", [
    ["Betriebseinnahmen − Betriebsausgaben = Überschuss oder Unterschuss", true, "Danach werden die Abschreibungen (AfA) berücksichtigt."],
    ["Vermögen − Schulden = Eigenkapital", false, "Das ist die Bilanzgleichung."],
    ["Umsatz × 12 % = Gewinn", false, "Das ist keine E/A-Rechnung."],
    ["Erlös − variable Kosten = Deckungsbeitrag", false, "Das ist die Deckungsbeitragsrechnung."],
  ], "+ Betriebseinnahmen − Betriebsausgaben = Überschuss oder Unterschuss − Abschreibungen (AfA) = Gewinn oder Verlust (Besteuerungsbasis)."),
  mc("09", E, "MEDIUM", "Was gehört zur Aufzeichnungspflicht bei der Einnahmen-Ausgaben-Rechnung? (Mehrere richtig)", [
    ["Aufzeichnung der Einnahmen, Ausgaben und des Eigenverbrauchs", true, "Richtig."],
    ["Anlagenverzeichnis (AfA)", true, "Richtig."],
    ["Lohnkonten (ÖGK-SV)", true, "Richtig."],
    ["Liste aller Fahrgastnamen", false, "Gehört nicht zur Aufzeichnungspflicht."],
  ], "Aufzeichnungspflicht: 1) Einnahmen, Ausgaben, Eigenverbrauch, 2) Anlagenverzeichnis (AfA), 3) Lohnkonten (ÖGK-SV), 4) Aufzeichnung der Betriebseinnahmen und Betriebsausgaben."),
  mc("10", E, "MEDIUM", "Welche Zahlung ist eine Betriebsausgabe?", [
    ["Treibstoff für das Taxi", true, "Laufende betriebliche Ausgabe."],
    ["Kreditrückzahlung", false, "Keine Betriebsausgabe."],
    ["Privatentnahme", false, "Keine Betriebsausgabe."],
    ["Einkommensteuerzahlung", false, "Keine Betriebsausgabe."],
  ], "Keine Betriebsausgaben: Kreditrückzahlung, Privatentnahme, Einkommensteuerzahlungen, Ausgaben für Investitionen (nur über AfA). Eine Privateinlage ist keine Betriebseinnahme."),
  mc("11", E, "EASY", "Bis zu welchem Jahresnettoumsatz gilt man als Kleinunternehmer?", [
    ["55.000 €", true, "Laut Skript bis 55.000 €."],
    ["35.000 €", false, "Falsch."],
    ["100.000 €", false, "Falsch."],
    ["220.000 €", false, "Das ist die Grenze der Pauschalierung laut Skript."],
  ], "Kleinunternehmer: Jahresnettoumsatz bis 55.000 €, keine Umsatzsteuer in der Rechnung, kein Vorsteuerabzug. Laut Skript (sehr wichtig): Ein Kleinunternehmen ist keine Gesellschaft."),
  mc("12", T, "EASY", "Was bezeichnet der Begriff Buchhaltung?", [
    ["Die Abteilung im Unternehmen, die sich mit der Buchführung befasst", true, "Laut Skript."],
    ["Die Lagerhaltung von Büchern", false, "Falsch."],
    ["Die Steuerprüfung durch das Finanzamt", false, "Falsch."],
    ["Die Werbung für das Unternehmen", false, "Falsch."],
  ], "Der Begriff Buchhaltung bezeichnet die Abteilung im Unternehmen, die sich mit der Buchführung befasst."),
  mc("13", T, "MEDIUM", "Welche Buchführungsgrenze gilt?", [
    ["2 × 700.000 € Nettoumsatz oder über 1.000.000 € Nettoumsatz in einem Jahr", true, "Laut Skript."],
    ["55.000 € Nettoumsatz", false, "Das ist die Kleinunternehmergrenze."],
    ["150.000 € Nettoumsatz", false, "Das ist die Grenze der Kammerumlage 1."],
    ["Es gibt keine Grenze", false, "Falsch."],
  ], "Buchführungspflicht (doppelte Buchhaltung): 2 × 700.000 € Nettoumsatz oder über 1.000.000 € Nettoumsatz in einem Jahr."),
  mc("14", E, "EASY", "Was heißt AfA?", [
    ["Absetzung für Abnutzung – Verteilung des Anschaffungswerts auf die voraussichtliche Nutzungsdauer", true, "Sehr wichtig laut Skript."],
    ["Abgabe für Arbeitnehmer", false, "Falsch."],
    ["Anmeldung für Auslandsfahrten", false, "Falsch."],
    ["Ausgabe für Anschaffungen sofort im ersten Jahr", false, "Das gilt nur für GWG."],
  ], "AfA = Absetzung für Abnutzung: Verteilung des Anschaffungswerts über die voraussichtliche Nutzungsdauer und absetzen."),
  mc("15", E, "MEDIUM", "Bis zu welchem Nettopreis gilt ein Wirtschaftsgut als geringwertiges Wirtschaftsgut (GWG)?", [
    ["1.000 €", true, "Laut Skript (ab 2023) bis 1.000 € netto."],
    ["400 €", false, "Alte Grenze."],
    ["800 €", false, "Alte Grenze."],
    ["5.000 €", false, "Zu hoch."],
  ], "GWG: Nettopreis bis 1.000 € – kann sofort abgesetzt werden, keine Verteilung über die Nutzungsdauer."),
  mc("16", E, "MEDIUM", "Was ist laut Skript ein Anlagegut?", [
    ["Über 1.000 € netto, mindestens 1 Jahr im Betrieb, mindestens 80 % für den Betriebszweck", true, "Laut Skript."],
    ["Jede Anschaffung unter 1.000 €", false, "Das ist ein GWG."],
    ["Nur Grundstücke", false, "Zu eng."],
    ["Alles, was weniger als 1 Monat im Betrieb bleibt", false, "Anlagegüter bleiben mindestens 1 Jahr."],
  ], "Anlagegut: 1) über 1.000 € netto (ab 2023), 2) mindestens 1 Jahr im Betrieb, 3) mindestens 80 % für den Betriebszweck."),
  mc("17", E, "MEDIUM", "Wann beginnt die AfA?", [
    ["Nach Aktivierung im Anlagenverzeichnis – mit dem Inbetriebnahmedatum", true, "Sehr wichtig laut Skript."],
    ["Mit der Bestellung", false, "Falsch."],
    ["Mit der Bezahlung der Rechnung", false, "Falsch."],
    ["Immer am 1. Jänner", false, "Falsch."],
  ], "Hat ein Wirtschaftsgut einen Anschaffungswert über 1.000 € netto, muss er langfristig über die Nutzungsdauer abgeschrieben werden. Die AfA beginnt nach Aktivierung im Anlagenverzeichnis (Inbetriebnahmedatum)."),
  mc("18", E, "EASY", "Wie rechnet man die AfA?", [
    ["Anschaffungswert (AW) ÷ Nutzungsdauer (ND)", true, "Richtig."],
    ["Anschaffungswert × Nutzungsdauer", false, "Falsch."],
    ["Nutzungsdauer ÷ Anschaffungswert", false, "Falsch."],
    ["Restwert + Umsatz", false, "Falsch."],
  ], "AfA pro Jahr = Anschaffungswert (AW) / Nutzungsdauer (ND)."),
  mc("18b", E, "MEDIUM", "Ein Taxi kostet 40.000 € netto, die Nutzungsdauer beträgt 8 Jahre. Wie hoch ist die jährliche AfA?", [
    ["5.000 €", true, "40.000 € ÷ 8 = 5.000 €."],
    ["8.000 €", false, "Falsch gerechnet."],
    ["4.000 €", false, "Falsch gerechnet."],
    ["320.000 €", false, "Multipliziert statt dividiert."],
  ], "AfA = AW / ND = 40.000 € / 8 Jahre = 5.000 € pro Jahr."),
  mc("19", E, "MEDIUM", "Ein Taxi wird im August in Betrieb genommen. Wie viel AfA steht für dieses Jahr zu?", [
    ["Die halbe Jahres-AfA", true, "Inbetriebnahme im zweiten Halbjahr = halbe AfA."],
    ["Die volle Jahres-AfA", false, "Die volle AfA gibt es nur bei Inbetriebnahme im ersten Halbjahr."],
    ["Keine AfA", false, "Falsch."],
    ["Die doppelte AfA", false, "Falsch."],
  ], "AfA-Stichtag: Inbetriebnahme 1. Jänner bis 30. Juni = volle AfA, 1. Juli bis 31. Dezember = halbe AfA."),
  mc("20", E, "EASY", "Was gehört NICHT in das Anlagenverzeichnis?", [
    ["Name des Fahrgastes", true, "Gehört nicht hinein."],
    ["Inbetriebnahmedatum und Anschaffungswert", false, "Gehört hinein."],
    ["Nutzungsdauer", false, "Gehört hinein."],
    ["Restwert/Buchwert", false, "Gehört hinein."],
  ], "Anlagenverzeichnis (Anlagekartei): laufende Nummer, Vermögensart, Inbetriebnahme/Datum, Lieferant (Name und Adresse), Anschaffungswert (AW), Nutzungsdauer (ND), AfA, Restwert/Buchwert (RW)."),
  mc("21", T, "EASY", "Welcher Vorteil gehört zum Telebanking?", [
    ["24 Stunden Zugriff und Kontostand jederzeit kontrollierbar", true, "Richtig."],
    ["Keine Sicherheitscodes notwendig", false, "Sicherheit durch persönlichen Code."],
    ["Überweisungen nur am Bankschalter", false, "Gerade nicht."],
    ["Höhere Druckkosten", false, "Man spart Kosten für Drucksorten."],
  ], "Telebanking: Überweisungen per Internet, Bankweg und Formulare sparen, 24 Stunden Zugriff, jederzeit Informationen und Kontostand, Sicherheit durch persönlichen Code."),
  mc("22", E, "HARD", "Was wird bei der Pauschalierung zur Gewinnermittlung herangezogen? (Mehrere richtig)", [
    ["Umsatz netto", true, "Richtig."],
    ["Wareneinkauf netto", true, "Richtig."],
    ["Personalausgaben", true, "Richtig."],
    ["Privatentnahmen", false, "Nicht Teil der Gewinnermittlung."],
  ], "Gewinnermittlung bei Pauschalierung: Umsatz netto, Wareneinkauf netto, Personalausgaben, Werkshonorar für die Leistungserstellung."),
  mc("23", E, "HARD", "Welche Voraussetzung nennt das Skript für die Pauschalierung?", [
    ["Keine Buchführungspflicht und Vorjahresumsatz max. 220.000 € netto", true, "Laut Skript."],
    ["Mindestens 10 Mitarbeiter", false, "Falsch."],
    ["Buchführungspflicht", false, "Gerade keine Buchführungspflicht."],
    ["Umsatz über 1.000.000 €", false, "Falsch."],
  ], "Laut Skript: keine Buchführungspflicht, Vorjahresumsatz max. 220.000 € netto, Ausgabenpauschale 6 % oder 12 %, einmal in 5 Jahren darf die Grenze um 15 % überschritten werden. Umsatz − 12 % Betriebsausgabenpauschale = zu versteuernder Gewinn. Hinweis: Grenzen und Sätze der Basispauschalierung wurden ab 2025 angehoben – aktuelle Werte prüfen."),
  mc("24", T, "EASY", "Welches Buch wird auch Grundbuch genannt?", [
    ["Das Journal", true, "Journal = Grundbuch (Tagebuch)."],
    ["Das Hauptbuch", false, "Im Hauptbuch stehen die Sachkonten."],
    ["Das Kassabuch", false, "Das ist ein Nebenbuch."],
    ["Das Provisionsbuch", false, "Das ist ein Hilfsbuch."],
  ], "Bücher der Buchhaltung: Journal (Grundbuch), Hauptbuch, Nebenbücher (Kassabuch), Hilfsbücher (Provision)."),
  mc("25", T, "MEDIUM", "Welche Steuer zahlt eine GmbH auf ihren Gewinn?", [
    ["Körperschaftsteuer", true, "Kapitalgesellschaften (GmbH, AG) zahlen Körperschaftsteuer."],
    ["Einkommensteuer", false, "Die zahlen Einzelunternehmer und Gesellschafter von OG/KG."],
    ["Kommunalsteuer", false, "Das ist eine Lohnabgabe."],
    ["Grundumlage", false, "Das ist ein Kammerbeitrag."],
  ], "Die Rechtsform bestimmt die Steuer: Einzelunternehmen und Personengesellschaften (KG, OG) → Einkommensteuer; Kapitalgesellschaften (GmbH, AG) → Körperschaftsteuer."),
  mc("26", B, "MEDIUM", "Ab welchem Rechnungsbetrag müssen zusätzlich Name und Anschrift des Kunden, Rechnungsnummer und UID-Nummer angegeben werden?", [
    ["Über 400 €", true, "Laut Skript ab einem Betrag über 400 €."],
    ["Über 10 €", false, "Falsch."],
    ["Über 55.000 €", false, "Falsch."],
    ["Nie", false, "Falsch."],
  ], "Rechnung: Name und Anschrift des Unternehmens, Datum, Menge/Bezeichnung/Preis, Steuersatz. Über 400 € zusätzlich: Name und Anschrift des Kunden, UID-Nummer, Rechnungsnummer, Mehrwertsteuer (netto, Steuersatz, brutto). Über 10.000 € auch die UID-Nummer des Kunden."),
  mc("26b", B, "MEDIUM", "Ab welchem Betrag muss die UID-Nummer des Kunden auf der Rechnung stehen?", [
    ["Über 10.000 €", true, "Laut Skript."],
    ["Über 400 €", false, "Ab 400 € gilt die eigene UID-Nummer."],
    ["Über 100 €", false, "Falsch."],
    ["Über 1.000.000 €", false, "Falsch."],
  ], "Übersteigt der Rechnungsbetrag 10.000 €, muss auch die UID-Nummer des Kunden enthalten sein."),
  mc("27", E, "MEDIUM", "Wann sind die Einkommensteuer-Vorauszahlungen fällig?", [
    ["15. Februar, 15. Mai, 15. August, 15. November", true, "Richtig."],
    ["Monatlich am 1.", false, "Falsch."],
    ["Einmal jährlich am 31. Dezember", false, "Falsch."],
    ["15. Jänner, 15. April, 15. Juli, 15. Oktober", false, "Falsche Termine."],
  ], "ESt-Vorauszahlungen: 15. Februar, 15. Mai, 15. August, 15. November. Die Jahressteuer wird mit Einkommensteuerbescheid festgesetzt; die Abschlusszahlung ist innerhalb 1 Monat zu zahlen."),
  mc("27b", E, "MEDIUM", "Bis wann ist die Steuererklärung abzugeben?", [
    ["Auf Papier bis 30. April, über FinanzOnline bis 30. Juni", true, "Laut Skript; Verlängerung durch begründetes Ansuchen möglich."],
    ["Bis 31. Jänner", false, "Falsch."],
    ["Bis 31. Dezember des Folgejahres", false, "Falsch."],
    ["Es gibt keine Frist", false, "Falsch."],
  ], "Abgabefrist: 30. April (Papier), FinanzOnline bis 30. Juni. Die Frist kann durch begründetes Ansuchen verlängert werden."),
  mc("28", E, "EASY", "Welche Kosten sind kilometerabhängig? (Mehrere richtig)", [
    ["Treibstoffkosten", true, "Steigen mit den Kilometern."],
    ["Reifengarniturkosten", true, "Abhängig von der Fahrleistung."],
    ["Mautgebühren", true, "Fallen pro Strecke an."],
    ["Haftpflichtversicherung", false, "Zeitabhängig."],
  ], "Kilometerabhängige Kosten: Reparaturkosten, Reifengarniturkosten, Treibstoffkosten, Mautgebühren."),
  mc("29", E, "EASY", "Welche Kosten sind zeitabhängig?", [
    ["Kasko- und Haftpflichtversicherung", true, "Fallen pro Zeitraum an."],
    ["Treibstoff", false, "Kilometerabhängig."],
    ["Reifen", false, "Kilometerabhängig."],
    ["Maut", false, "Kilometerabhängig."],
  ], "Zeitabhängige Fahrzeugkosten: Fahrzeuganschaffungswert, Kasko/Haftpflicht/Teilkasko, Fremdkapitalzinsen, Abschreibung pro Jahr, sonstige Kosten (z. B. Mobiltelefon, Abstellplatz)."),
  mc("30", T, "MEDIUM", "Ab welchem Nettojahresumsatz haben Wirtschaftskammer-Mitglieder die Kammerumlage 1 an das Finanzamt abzuführen?", [
    ["Über 150.000 €", true, "Laut Skript."],
    ["Über 55.000 €", false, "Falsch."],
    ["Über 700.000 €", false, "Falsch."],
    ["Ab dem ersten Euro", false, "Falsch."],
  ], "Kammerumlage 1: wenn die im Inland erzielten steuerbaren Nettoumsätze in einem Kalenderjahr über 150.000 € liegen. (Der Zuschlag zum Dienstgeberbeitrag wird auch Kammerumlage 2 genannt.)"),
  mc("31", T, "MEDIUM", "Wer beschließt die Grundumlage?", [
    ["Die zuständige Fachgruppe bzw. der Fachverband der Wirtschaftskammer", true, "Sie ist von jedem Unternehmen zu entrichten."],
    ["Das Finanzamt", false, "Falsch."],
    ["Die Gemeinde", false, "Falsch."],
    ["Die ÖGK", false, "Falsch."],
  ], "Die Grundumlage wird jährlich von der zuständigen Fachgruppe (bzw. vom Fachverband) der Wirtschaftskammer beschlossen und ist von jedem Unternehmen zu entrichten."),
  mc("32", T, "MEDIUM", "Wozu führt der Abschluss der Hauptbuchkonten?", [
    ["Zur Schlussbilanz sowie zur Gewinn- und Verlustrechnung", true, "Richtig."],
    ["Zur Einkommensteuer-Vorauszahlung", false, "Falsch."],
    ["Zur Gewerbeanmeldung", false, "Falsch."],
    ["Zum Kassabuch", false, "Das ist ein Nebenbuch."],
  ], "Im Hauptbuch werden alle Sachkonten aus den Buchungen des Grundbuchs geführt (sachlich, systematisch). Der Abschluss führt zur Schlussbilanz und zur Gewinn- und Verlustrechnung."),
  mc("33", T, "EASY", "Wofür steht „Doppik“?", [
    ["Doppelte Buchführung (Bilanz)", true, "Richtig."],
    ["Doppelte Kontrolle durch das Finanzamt", false, "Falsch."],
    ["Doppelter Umsatz", false, "Falsch."],
    ["Doppeltes Kassabuch", false, "Falsch."],
  ], "Doppik ist die Abkürzung für doppelte Buchführung (Bilanz), gebucht wird im Soll und im Haben."),
  mc("34", E, "EASY", "Was ist ein Beispiel für Eigenverbrauch?", [
    ["Privatnutzung des Firmenwagens", true, "Entnahme für private Zwecke."],
    ["Kauf von Treibstoff für Fahrten mit Fahrgästen", false, "Betrieblich."],
    ["Zahlung der Kfz-Versicherung", false, "Betrieblich."],
    ["Lohnzahlung an Mitarbeiter", false, "Betrieblich."],
  ], "Eigenverbrauch: Der Unternehmer entnimmt Gegenstände oder Leistungen aus dem Betrieb für private Zwecke – z. B. Privatnutzung des Firmenwagens, Privatanteil bei Telefonkosten."),
  mc("35", T, "MEDIUM", "Was muss im Journal zu jedem Geschäftsfall erfasst werden?", [
    ["Fortlaufende Nummer, Datum, Betrag und Verweis auf den Beleg – in chronologischer Reihenfolge", true, "Richtig."],
    ["Nur der Betrag", false, "Zu wenig."],
    ["Name und Adresse jedes Fahrgastes", false, "Falsch."],
    ["Die Bilanzsumme", false, "Falsch."],
  ], "Das Journal (Grundbuch, Tagebuch) enthält alle Geschäftsfälle in chronologischer Reihenfolge mit fortlaufender Nummer, Datum, Betrag und Belegverweis."),
  mc("36", B, "EASY", "Wie viele Kassenbücher werden in der Regel pro Jahr geführt?", [
    ["12 – monatlich eines", true, "Richtig."],
    ["1", false, "Falsch."],
    ["4 – quartalsweise", false, "Falsch."],
    ["52 – wöchentlich", false, "Falsch."],
  ], "Das Kassenbuch ist die laufende Aufzeichnung aller Bareinnahmen und Barausgaben; in der Regel 12 Kassenbücher pro Jahr. Grundlage für Jahresabschluss und Versteuerung."),
  mc("37", T, "EASY", "Welches ist ein Nebenbuch?", [
    ["Das Kassabuch", true, "Richtig."],
    ["Das Hauptbuch", false, "Ist das Hauptbuch."],
    ["Das Journal", false, "Ist das Grundbuch."],
    ["Die Bilanz", false, "Kein Buch."],
  ], "Die Buchung auf Konten erfordert Bücher: Hauptbuch, Grundbuch (Journal) und Nebenbücher, z. B. Kassabuch. Doppik = Buchung im Soll und Haben."),
  mc("38", B, "EASY", "Was bedeutet Fakturierung?", [
    ["Ausstellung der Rechnung und Zusendung an den Kunden", true, "Richtig."],
    ["Einkauf von Waren", false, "Falsch."],
    ["Zählen der Tageslosung", false, "Falsch."],
    ["Anmeldung beim Finanzamt", false, "Falsch."],
  ], "Eine Rechnung (Faktura) informiert den Kunden über das fällige Entgelt. Fakturierung = Ausstellung der Rechnung und Zusendung an den Kunden."),
  mc("39", B, "MEDIUM", "Was ist laut Skript ein Barcode (QR-Code) auf Dokumenten?", [
    ["Eine elektronische Signatur – Dokumente werden mit einem digitalen Siegel versehen", true, "Laut Skript."],
    ["Eine Werbefläche", false, "Falsch."],
    ["Die Steuernummer in Klartext", false, "Falsch."],
    ["Ein Rabattcode", false, "Falsch."],
  ], "Barcode bedeutet eine elektronische Signatur; der QR-Code bietet mit der digitalen Signatur von PDF-Dokumenten die Möglichkeit, Dokumente mit einem Siegel zu versehen."),
  mc("40", E, "MEDIUM", "Welchen Nachteil hat die Kleinunternehmerregelung?", [
    ["Keine Vorsteuererstattung für Eingangsrechnungen", true, "Richtig."],
    ["Man muss Umsatzsteuer verrechnen", false, "Gerade nicht."],
    ["Man darf kein Taxi fahren", false, "Falsch."],
    ["Man zahlt doppelte Umsatzsteuer", false, "Falsch."],
  ], "Vorteil: keine Umsatzsteuer in Rechnung stellen. Nachteil: keine Vorsteuererstattung für Eingangsrechnungen mit Umsatzsteuer."),
  mc("41", E, "EASY", "Was ist die UID-Nummer?", [
    ["Die Umsatzsteuer-Identifikationsnummer – eine spezielle Steuernummer für das Unternehmen", true, "Bei EU-Einkäufen wird mit ihr die ausländische USt in Abzug gebracht."],
    ["Die Sozialversicherungsnummer", false, "Falsch."],
    ["Die Firmenbuchnummer", false, "Falsch."],
    ["Die Taxi-Konzessionsnummer", false, "Falsch."],
  ], "Die UID-Nummer dient der Identifikation des Unternehmens; bei betrieblichen Einkäufen im EU-Ausland wird bei Angabe der UID-Nummer die ausländische Umsatzsteuer in Abzug gebracht."),
  mc("42", T, "EASY", "Was steht auf der Passivseite der Bilanz?", [
    ["Eigenkapital und Fremdkapital (langfristig und kurzfristig)", true, "Kapital (Passiv)."],
    ["Anlagevermögen und Umlaufvermögen", false, "Das ist die Aktivseite."],
    ["Erlöse und Einnahmen", false, "Das steht in der GuV."],
    ["Zinsaufwand und Löhne", false, "Das steht in der GuV."],
  ], "Die Bilanz zeigt Vermögen und Schulden zum Bilanzstichtag: Aktiv = Vermögen (Anlagevermögen, Umlaufvermögen), Passiv = Kapital (Eigenkapital, Fremdkapital LFK + KFK). Summe Gesamtvermögen = Summe Gesamtkapital."),
  mc("43", T, "MEDIUM", "Wohin gehört „Kundenforderungen“ in der Bilanz?", [
    ["Aktivseite – Umlaufvermögen", true, "Richtig."],
    ["Aktivseite – Anlagevermögen", false, "Forderungen sind kurzfristig."],
    ["Passivseite – kurzfristiges Fremdkapital", false, "Forderungen sind Vermögen."],
    ["Gewinn- und Verlustrechnung – Aufwand", false, "Falsch."],
  ], "Umlaufvermögen: Materialvorrat, Bargeld/Kassa, Kundenforderungen, Bankguthaben. Anlagevermögen: Fuhrpark, Grundstücke, Geschäftseinrichtung, Maschinen, langfristige Wertpapiere."),
  mc("43b", T, "MEDIUM", "Wohin gehört „Verbindlichkeit Finanzamt“ in der Bilanz?", [
    ["Passivseite – kurzfristiges Fremdkapital", true, "Richtig."],
    ["Passivseite – langfristiges Fremdkapital", false, "Langfristig sind z. B. Darlehen und Hypothekarkredit."],
    ["Aktivseite – Umlaufvermögen", false, "Verbindlichkeiten sind Schulden."],
    ["Passivseite – Eigenkapital", false, "Falsch."],
  ], "Kurzfristiges Fremdkapital: Rückstellung, Verbindlichkeit ÖGK, Verbindlichkeit Finanzamt, Lieferantenverbindlichkeit, Banküberziehungskredit, Kontokorrentkredit, Steuerberaterschulden. Langfristig: Darlehen, Hypothekarkredit."),
  mc("43c", T, "MEDIUM", "Wo steht der „Zinsaufwand“?", [
    ["In der Gewinn- und Verlustrechnung bei den Aufwendungen (Soll)", true, "Richtig."],
    ["In der Bilanz beim Anlagevermögen", false, "Falsch."],
    ["In der GuV bei den Erträgen (Haben)", false, "Zinsaufwand ist ein Aufwand."],
    ["In der Bilanz beim Eigenkapital", false, "Falsch."],
  ], "GuV: Aufwendungen (Soll) – Zinsaufwand, Sozialversicherung, Gas, Miete, Reparatur/Instandhaltung, Löhne, Materialeinsatz, Beratungskosten. Erträge (Haben) – Erlöse, Einnahmen, Umsatz."),
];

/* ───────────── Mündliche Fassung ───────────── */

function oral(nr: number, questionDe: string, modelAnswerDe: string, points: (string | [string, false])[], difficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM"): OralSeed {
  const keyPoints = points.map((p, i) => (Array.isArray(p) ? { id: `k${i + 1}`, text: p[0], required: false } : { id: `k${i + 1}`, text: p, required: true }));
  const first = keyPoints.find((k) => k.required) ?? keyPoints[0];
  return {
    key: `rwb-${String(nr).padStart(2, "0")}`,
    categorySlug: CAT,
    difficulty,
    questionDe,
    modelAnswerDe,
    keyPoints,
    legalReference: `Skript Rechnungswesen, Frage ${nr}`,
    followUps: [{ trigger_point_id: first.id, question_de: "Kannst du das noch genauer erklären – was gehört noch dazu?" }],
  };
}

export const buchRwOral: OralSeed[] = [
  oral(1, "Welche 4 Teilgebiete des Rechnungswesens gibt es?", "Buchführung bzw. Geschäftsaufzeichnung (mit Einnahmen-Ausgaben-Rechnung, doppelter Buchhaltung und Pauschalierung), Kostenrechnung, Statistik sowie Planungsrechnung und Finanzierung. Sie werden chronologisch und systematisch durchgeführt.", ["Buchführung / Geschäftsaufzeichnung", "Kostenrechnung", "Statistik", "Planungsrechnung und Finanzierung"]),
  oral(2, "Welche Formvorschriften gelten in Österreich für die Buchführung?", "Bücher im Inland führen, alle Unterlagen 7 Jahre aufbewahren, keine radierbaren Mittel, keine leeren Zwischenräume, Eintragungen chronologisch, zeitgerecht, richtig und vollständig, Überprüfung jederzeit möglich, Seiten fortlaufend nummerieren, in deutscher Sprache – sonst beglaubigte Übersetzung.", ["Im Inland führen", "7 Jahre aufbewahren", "Keine radierbaren Mittel / keine leeren Zwischenräume", "Chronologisch, zeitgerecht, richtig, vollständig", ["Seiten fortlaufend nummerieren, deutsche Sprache", false]], "HARD"),
  oral(3, "Was bedeuten die Beleggrundsätze?", "Keine Buchung ohne Beleg. Belege sind Dokumente, man darf sie nicht verändern oder unleserlich machen. Änderungen muss man eindeutig kennzeichnen. Ist die Belegbearbeitung unordentlich, gibt es keine Glaubwürdigkeit.", ["Keine Buchung ohne Beleg", "Belege nicht verändern oder unleserlich machen", ["Änderungen eindeutig kennzeichnen", false]], "EASY"),
  oral(4, "Welche Arten von Belegen gibt es?", "Eingangsrechnung, Ausgangsrechnung, Eingangsgutschrift, Ausgangsgutschrift, Kassabeleg, Ersatzbeleg und Bankbeleg.", ["Eingangs- und Ausgangsrechnung", "Eingangs- und Ausgangsgutschrift", "Kassabeleg", ["Ersatzbeleg, Bankbeleg", false]]),
  oral(5, "Wann entsteht die Steuerschuld?", "Mit Ablauf des Kalendermonats.", ["Mit Ablauf des Kalendermonats"], "EASY"),
  oral(6, "Wann ist die USt-Zahllast fällig?", "Am 15. des zweitfolgenden Kalendermonats – also 1 Monat und 15 Tage nach dem Voranmeldungszeitraum.", ["15. des zweitfolgenden Kalendermonats"], "EASY"),
  oral(7, "Erklären Sie die Ermittlung der Tageslosung.", "Das Geld in der Kasse wird täglich nach Geschäftsschluss ausgezählt und im Zählprotokoll eingetragen. Indirekte Methode (Taxi): Bargeld bei Geschäftsschluss plus Barausgänge des Tages, minus Bargeldbestand am Geschäftsbeginn, minus sonstige Eingänge ergibt die Tageslosung. Direkte Methode: Registrierkasse oder Scannerkassa.", ["Täglich nach Geschäftsschluss zählen (Zählprotokoll)", "Indirekte Methode: Endbestand + Barausgänge − Anfangsbestand − sonstige Eingänge", "Direkte Methode: Registrierkasse/Scannerkassa"], "HARD"),
  oral(8, "Wie funktioniert die Einnahmen-Ausgaben-Rechnung?", "Betriebseinnahmen minus Betriebsausgaben ergibt den Überschuss oder Unterschuss. Danach werden die Abschreibungen (AfA) berücksichtigt; das Ergebnis ist der Gewinn oder Verlust als Besteuerungsbasis.", ["Betriebseinnahmen minus Betriebsausgaben", "Überschuss oder Unterschuss", ["AfA wird abgezogen → Gewinn/Verlust", false]]),
  oral(9, "Was umfasst die Aufzeichnungspflicht?", "Aufzeichnung der Einnahmen, Ausgaben und des Eigenverbrauchs, ein Anlagenverzeichnis für die AfA und Lohnkonten für die ÖGK-Sozialversicherung.", ["Einnahmen, Ausgaben und Eigenverbrauch", "Anlagenverzeichnis", "Lohnkonten"]),
  oral(10, "Was fällt nicht unter die Betriebsausgaben?", "Kreditrückzahlung, Privatentnahme, Einkommensteuerzahlungen und Ausgaben für Investitionen sind keine Betriebsausgaben. Eine Privateinlage ist keine Betriebseinnahme.", ["Kreditrückzahlung", "Privatentnahme", "Einkommensteuerzahlungen", ["Investitionen (nur über AfA)", false]]),
  oral(11, "Was ist ein Kleinunternehmer?", "Jahresnettoumsatz bis 55.000 €, keine Umsatzsteuer in der Rechnung, kein Vorsteuerabzug. Ein Kleinunternehmen ist keine Gesellschaft.", ["Jahresnettoumsatz bis 55.000 €", "Keine Umsatzsteuer in der Rechnung", "Kein Vorsteuerabzug"]),
  oral(12, "Was bedeutet Buchführung bzw. Buchhaltung?", "Der Begriff Buchhaltung bezeichnet die Abteilung im Unternehmen, die sich mit der Buchführung befasst.", ["Abteilung, die sich mit der Buchführung befasst"], "EASY"),
  oral(13, "Welche Buchführungsgrenze kennen Sie?", "Zweimal 700.000 € Nettoumsatz oder über 1.000.000 € Nettoumsatz in einem Jahr.", ["2 × 700.000 € Nettoumsatz", "Über 1.000.000 € in einem Jahr"]),
  oral(14, "Was heißt Abschreibung (AfA)?", "Absetzung für Abnutzung: Der Anschaffungswert wird auf die voraussichtliche Nutzungsdauer verteilt und abgesetzt.", ["Absetzung für Abnutzung", "Anschaffungswert auf Nutzungsdauer verteilen"], "EASY"),
  oral(15, "Was versteht man unter geringwertigen Wirtschaftsgütern und welche Bedeutung haben sie für die AfA?", "Geringwertige Wirtschaftsgüter sind solche mit einem Nettopreis bis 1.000 €. Sie können sofort abgesetzt werden.", ["Nettopreis bis 1.000 €", ["Sofort absetzbar", false]]),
  oral(16, "Was ist ein Anlagegut?", "Über 1.000 € netto (ab 2023), das Anlagegut soll mindestens 1 Jahr im Betrieb bleiben und mindestens zu 80 % dem Betriebszweck dienen.", ["Über 1.000 € netto", "Mindestens 1 Jahr im Betrieb", ["Mindestens 80 % betrieblich", false]]),
  oral(17, "Erklären Sie die AfA.", "Hat ein Wirtschaftsgut einen Anschaffungswert über 1.000 € netto, muss er langfristig über die Nutzungsdauer abgeschrieben werden. Die AfA beginnt nach Aktivierung im Anlagenverzeichnis mit dem Inbetriebnahmedatum.", ["Über 1.000 € netto über die Nutzungsdauer abschreiben", "Beginn nach Aktivierung im Anlagenverzeichnis / Inbetriebnahme"]),
  oral(18, "Wie rechnet man die AfA?", "Anschaffungswert geteilt durch Nutzungsdauer.", ["Anschaffungswert ÷ Nutzungsdauer"], "EASY"),
  oral(19, "Wann ist der AfA-Stichtag?", "Bei Inbetriebnahme von 1. Jänner bis 30. Juni gibt es die volle AfA, von 1. Juli bis 31. Dezember die halbe AfA.", ["Erstes Halbjahr: volle AfA", "Zweites Halbjahr: halbe AfA"]),
  oral(20, "Was steht im Anlagenverzeichnis?", "Laufende Nummer, Vermögensart, Inbetriebnahmedatum, Lieferant mit Name und Adresse, Anschaffungswert, Nutzungsdauer, AfA und Restwert bzw. Buchwert.", ["Anschaffungswert und Inbetriebnahmedatum", "Nutzungsdauer und AfA", "Restwert/Buchwert", ["Laufende Nummer, Vermögensart, Lieferant", false]], "HARD"),
  oral(21, "Was bedeutet Telebanking?", "Bankgeschäfte und Überweisungen per Internet. Man spart Bankweg, Formulare und Drucksortenkosten, hat 24 Stunden Zugriff, kann jederzeit den Kontostand kontrollieren; Sicherheit durch persönlichen Code.", ["Überweisungen per Internet", "24 Stunden Zugriff / Kontostand jederzeit", ["Sicherheit durch persönlichen Code", false]], "EASY"),
  oral(22, "Wie wird der Gewinn bei der Pauschalierung ermittelt?", "Aus Umsatz netto, Wareneinkauf netto, Personalausgaben und Werkshonorar für die Leistungserstellung.", ["Umsatz netto", "Wareneinkauf netto", "Personalausgaben", ["Werkshonorar", false]]),
  oral(23, "Was bedeutet Pauschalierung und welche Voraussetzungen gibt es?", "Keine Buchführungspflicht, Umsatz des Vorjahres maximal 220.000 € netto, Ausgabenpauschale 6 % oder 12 %, einmal in 5 Jahren darf die Grenze um 15 % überschritten werden. Umsatz minus 12 % Betriebsausgabenpauschale ergibt den zu versteuernden Gewinn.", ["Keine Buchführungspflicht", "Umsatzgrenze Vorjahr (220.000 € netto laut Skript)", "Ausgabenpauschale 6 % oder 12 %"], "HARD"),
  oral(24, "Welche Bücher und Aufzeichnungen müssen in der Buchhaltung geführt werden?", "Journal (Grundbuch), Hauptbuch, Nebenbücher wie das Kassabuch und Hilfsbücher wie das Provisionsbuch.", ["Journal (Grundbuch)", "Hauptbuch", "Nebenbücher (Kassabuch)", ["Hilfsbücher", false]]),
  oral(25, "Welche Steuern müssen Unternehmer bezahlen?", "Die Rechtsform bestimmt, ob Einkommen- oder Körperschaftsteuer fällig wird. Einzelunternehmen und Personengesellschaften wie KG und OG zahlen Einkommensteuer, Kapitalgesellschaften wie GmbH und AG zahlen Körperschaftsteuer.", ["Einzelunternehmen/OG/KG: Einkommensteuer", "GmbH/AG: Körperschaftsteuer"]),
  oral(26, "Was muss auf einer Rechnung enthalten sein?", "Name und Anschrift des Unternehmens, Datum, Menge, Bezeichnung und Preis, Steuersatz. Über 400 € zusätzlich Name und Anschrift des Kunden, UID-Nummer, Rechnungsnummer und die Mehrwertsteuer mit Netto, Steuersatz und Brutto. Über 10.000 € auch die UID-Nummer des Kunden.", ["Name/Anschrift des Unternehmens, Datum", "Menge, Bezeichnung, Preis, Steuersatz", "Über 400 €: Kundendaten, UID, Rechnungsnummer", ["Über 10.000 €: UID des Kunden", false]], "HARD"),
  oral(27, "Was wissen Sie über die Einkommensteuer – wann ist sie fällig?", "Die Einkommensteuer wird mit Bescheid festgesetzt. Vorauszahlungen am 15. Februar, 15. Mai, 15. August und 15. November. Erklärung bis 30. April, über FinanzOnline bis 30. Juni; Verlängerung durch begründetes Ansuchen. Die Abschlusszahlung ist innerhalb eines Monats zu zahlen.", ["Vorauszahlungen 15.2., 15.5., 15.8., 15.11.", "Abgabe 30. April / FinanzOnline 30. Juni", ["Abschlusszahlung innerhalb 1 Monat", false]], "HARD"),
  oral(28, "Welche Kosten sind kilometerabhängig?", "Reparaturkosten, Reifengarniturkosten, Treibstoffkosten und Mautgebühren.", ["Treibstoff", "Reifen", "Reparaturen", ["Maut", false]], "EASY"),
  oral(29, "Welche Fahrzeugkosten sind zeitabhängig?", "Fahrzeuganschaffungswert, Kasko- und Haftpflichtversicherung, Fremdkapitalzinsen, Abschreibung pro Jahr und sonstige Kosten wie Mobiltelefon oder Abstellplatz.", ["Versicherung (Kasko/Haftpflicht)", "Abschreibung pro Jahr", ["Fremdkapitalzinsen, Abstellplatz, Telefon", false]]),
  oral(30, "Was wissen Sie über die Kammerumlage 1?", "Mitglieder der Wirtschaftskammer haben die Kammerumlage 1 an das Finanzamt abzuführen, wenn die im Inland erzielten steuerbaren Nettoumsätze in einem Kalenderjahr über 150.000 € liegen.", ["An das Finanzamt abzuführen", "Ab Nettojahresumsatz über 150.000 €"]),
  oral(31, "Was bedeutet Grundumlage?", "Die Grundumlage wird jährlich von der zuständigen Fachgruppe bzw. dem Fachverband der Wirtschaftskammer beschlossen und ist von jedem Unternehmen zu entrichten.", ["Von Fachgruppe/Fachverband der WKO beschlossen", "Jedes Unternehmen zahlt"]),
  oral(32, "Was bedeutet Hauptbuch?", "Im Hauptbuch werden alle Sachkonten aus den Buchungen des Grundbuchs übertragen und sachlich und systematisch gebucht. Der Abschluss der Hauptbuchkonten führt zur Schlussbilanz und zur Gewinn- und Verlustrechnung.", ["Sachkonten aus dem Grundbuch", "Abschluss führt zu Schlussbilanz und GuV"]),
  oral(33, "Was heißt Doppik?", "Doppik ist die Abkürzung von doppelter Buchführung (Bilanz).", ["Doppelte Buchführung"], "EASY"),
  oral(34, "Was bedeutet Eigenverbrauch?", "Wenn ein Unternehmer Gegenstände oder Leistungen aus seinem Betrieb für private Zwecke entnimmt, zum Beispiel die Privatnutzung des Firmenwagens oder den Privatanteil bei Telefonkosten.", ["Entnahme aus dem Betrieb für private Zwecke", ["Beispiel: Firmenwagen, Telefon", false]], "EASY"),
  oral(35, "Was ist ein Journal in der Buchführung?", "Das Journal, auch Grundbuch oder Tagebuch, enthält alle Geschäftsfälle in chronologischer Reihenfolge mit fortlaufender Nummer, Datum, Betrag und Verweis auf den Beleg.", ["Grundbuch/Tagebuch", "Chronologisch", ["Nummer, Datum, Betrag, Belegverweis", false]]),
  oral(36, "Was bedeutet Kassenbuch?", "Die laufende Aufzeichnung aller Bareinnahmen und Barausgaben eines Unternehmens. In der Regel werden jährlich 12 Kassenbücher geführt – monatlich eines. Es dient als Grundlage für Jahresabschluss und Versteuerung.", ["Alle Bareinnahmen und Barausgaben", ["12 pro Jahr (monatlich)", false]], "EASY"),
  oral(37, "Was ist der Unterschied zwischen Hauptbuch und Nebenbuch?", "In der doppelten Buchführung wird im Soll und Haben gebucht. Dafür braucht man das Hauptbuch mit den Sachkonten, das Grundbuch (Journal) und Nebenbücher wie das Kassabuch.", ["Hauptbuch: Sachkonten", "Nebenbuch: z. B. Kassabuch"]),
  oral(38, "Was bedeutet Rechnungspflicht?", "Eine Rechnung oder Faktura informiert den Kunden über das fällige Entgelt; darin werden Lieferungen oder sonstige Leistungen abgerechnet. Fakturierung ist die Ausstellung der Rechnung und die Zusendung an den Kunden.", ["Rechnung informiert über fälliges Entgelt", ["Fakturierung = Ausstellen und Zusenden", false]]),
  oral(39, "Was ist ein Barcode bzw. QR-Code?", "Eine elektronische Signatur – mit der digitalen Signatur können Dokumente wie PDFs mit einem Siegel versehen werden.", ["Elektronische Signatur / Siegel"], "EASY"),
  oral(40, "Welche Vor- und Nachteile hat man als Kleinunternehmer?", "Vorteil: keine Umsatzsteuer in Rechnung stellen. Nachteil: keine Vorsteuererstattung für Eingangsrechnungen mit Umsatzsteuer.", ["Keine Umsatzsteuer in Rechnung", "Keine Vorsteuererstattung"]),
  oral(41, "Was ist eine UID-Nummer?", "Die Umsatzsteuer-Identifikationsnummer ist eine spezielle Steuernummer zur Identifikation des Unternehmens. Bei betrieblichen Einkäufen im EU-Ausland wird mit ihr die ausländische Umsatzsteuer in Abzug gebracht.", ["Umsatzsteuer-Identifikationsnummer", ["EU-Einkäufe ohne ausländische USt", false]], "EASY"),
  oral(42, "Was zeigt die Bilanz?", "Die Bilanz zeigt Vermögen und Schulden zum Bilanzstichtag. Aktivseite: Vermögen mit Anlage- und Umlaufvermögen. Passivseite: Kapital mit Eigenkapital und Fremdkapital (langfristig und kurzfristig). Gesamtvermögen ist gleich Gesamtkapital.", ["Aktiva: Anlage- und Umlaufvermögen", "Passiva: Eigenkapital und Fremdkapital", ["Summen sind gleich", false]]),
  oral(43, "Nennen Sie Beispiele für Anlagevermögen, Umlaufvermögen und kurzfristiges Fremdkapital.", "Anlagevermögen: Fuhrpark, Grundstücke, Geschäftseinrichtung, Maschinen. Umlaufvermögen: Materialvorrat, Kassa, Kundenforderungen, Bankguthaben. Kurzfristiges Fremdkapital: Verbindlichkeiten bei ÖGK, Finanzamt und Lieferanten, Kontokorrentkredit. Langfristig: Darlehen, Hypothekarkredit.", ["Anlagevermögen: z. B. Fuhrpark, Grundstücke", "Umlaufvermögen: z. B. Kassa, Forderungen, Bank", "Kurzfristiges FK: z. B. Verbindlichkeiten ÖGK/Finanzamt"], "HARD"),
];
