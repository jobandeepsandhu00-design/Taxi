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
  mc("01", T, "EASY", "Welche 4 Teilgebiete des Rechnungswesens sind?", [
    ["Buchführung (Geschäftsaufzeichnung), Kostenrechnung, Statistik, Planungsrechnung und Finanzierung", true, "Laut Skript."],
    ["Buchführung, Marketing, Personalverwaltung, Einkauf", false, "Marketing, Personal und Einkauf sind keine Teilgebiete."],
    ["Kassabuch, Hauptbuch, Journal, Hilfsbücher", false, "Das sind Bücher der Buchhaltung."],
    ["Bilanz, GuV, Inventur, Mahnwesen", false, "Falsch."],
  ], "Chronologisch und systematisch durchgeführt werden: 1) Buchführung, Geschäftsaufzeichnung – mit 2) Einnahmen-Ausgaben-Rechnung, 3) doppelter Buchhaltung (Bilanz), 4) Pauschalierung; a) Kostenrechnung, b) Statistik, c) Planungsrechnung und Finanzierung."),
  mc("02", T, "MEDIUM", "Welche Formvorschriften gelten in Österreich für die Buchführung?", [
    ["Bücher im Inland führen, 7 Jahre aufbewahren, keine radierbaren Mittel, keine leeren Zwischenräume, chronologisch/zeitgerecht/richtig/vollständig, jederzeit überprüfbar, Seiten fortlaufend nummerieren, in deutscher Sprache", true, "Laut Skript."],
    ["Bücher im Ausland führen, 3 Jahre aufbewahren, mit Bleistift schreiben", false, "Falsch."],
    ["Leere Zwischenräume lassen, Seiten nicht nummerieren, beliebige Sprache", false, "Falsch."],
    ["Nur einmal im Jahr eintragen, Korrekturen mit Tipp-Ex", false, "Falsch."],
  ], "1) Alle Firmen Bücher im Inland führen, 2) alle Unterlagen müssen 7 Jahre aufbewahrt werden, 3) keine radierbaren Mittel verwenden, 4) keine leeren Zwischenräume, 5) die Eintragung chronologisch, zeitgerecht, richtig und vollständig führen, 6) die Überprüfung muss jederzeit möglich sein, 7) Seiten fortlaufend nummerieren, 8) in deutscher Sprache führen, ansonsten eine beglaubigte Übersetzung."),
  mc("03", B, "EASY", "Was bedeuten Beleggrundsätze?", [
    ["Keine Buchung ohne Beleg; Belege nicht verändern oder unleserlich machen; Änderungen eindeutig kennzeichnen; unordentliche Belegbearbeitung = keine Glaubwürdigkeit", true, "Laut Skript."],
    ["Belege dürfen nach der Buchung weggeworfen werden", false, "Falsch."],
    ["Buchungen sind auch ohne Beleg erlaubt", false, "Keine Buchung ohne Beleg."],
    ["Belege dürfen jederzeit verändert werden", false, "Belege sind Dokumente."],
  ], "1) Keine Buchung ohne Beleg, 2) Belege sind Dokumente, man darf sie nicht verändern oder unleserlich machen, 3) die Änderungen muss man eindeutig kennzeichnen, 4) wenn die Belegbearbeitung unordentlich ist, dann gibt es keine Glaubwürdigkeit."),
  mc("04", B, "EASY", "Welche Arten von Belegen gibt es?", [
    ["Eingangsrechnung, Ausgangsrechnung, Eingangsgutschrift, Ausgangsgutschrift, Kassabeleg, Ersatzbeleg, Bankbeleg", true, "Laut Skript."],
    ["Preisliste, Visitenkarte, Werbeprospekt", false, "Das sind keine Belege."],
    ["Nur Kassabelege", false, "Es gibt sieben Belegarten."],
    ["Führerschein, Zulassungsschein, Taxilenkerausweis", false, "Das sind Dokumente, keine Buchungsbelege."],
  ], "1) Eingangsrechnung (ER), 2) Ausgangsrechnung (AR), 3) Eingangsgutschrift (EG), 4) Ausgangsgutschrift (AG), 5) Kassabeleg, 6) Ersatzbeleg, 7) Bankbeleg."),
  mc("05", E, "MEDIUM", "Wann entsteht die Steuerschuld?", [
    ["Mit Ablauf des Kalendermonats", true, "Laut Skript."],
    ["Am Jahresende", false, "Falsch."],
    ["Mit Abgabe der Jahreserklärung", false, "Falsch."],
    ["Bei einer Betriebsprüfung", false, "Falsch."],
  ], "Die Steuerschuld entsteht mit Ablauf des Kalendermonats."),
  mc("06", E, "MEDIUM", "Wann ist die Fälligkeit der USt-Zahllast?", [
    ["15. des zweitfolgenden Kalendermonats (1 Monat + 15 Tage)", true, "Laut Skript."],
    ["15. des Folgemonats", false, "Einen Monat zu früh."],
    ["Letzter Tag des Kalendermonats", false, "Falsch."],
    ["31. Dezember", false, "Falsch."],
  ], "15. des zweitfolgenden Kalendermonats (1 Monat + 15 Tage)."),
  mc("07", B, "HARD", "Erklären Sie die Ermittlung der Tageslosung?", [
    ["Bargeld bei Geschäftsschluss + Barausgänge des Tages − Bargeldbestand am Geschäftsbeginn − sonstige Eingänge = Tageslosung (indirekte Methode); direkte Methode: Registrierkasse oder Scanner-Kassa", true, "Laut Skript."],
    ["Bargeld bei Geschäftsbeginn + sonstige Eingänge − Barausgänge = Tageslosung", false, "Falsche Rechnung."],
    ["Umsatz laut Taxameter minus Trinkgeld", false, "Nicht die Methode laut Skript."],
    ["Kontostand am Monatsende geteilt durch 30", false, "Falsch."],
  ], "Bei der rechnerischen Ermittlung wird das Geld in der Kasse täglich nach Geschäftsschluss ausgezählt; im Zählprotokoll werden für jede Münze und jeden Geldschein Anzahl und Betrag eingetragen. Es gibt 2 Methoden: Indirekte Methode (Taxi): Bargeld bei Geschäftsschluss + Barausgänge des Tages = Zwischensumme − Bargeldbestand am Geschäftsbeginn − sonstige Eingänge (z. B. Mieteinnahmen) = Tageslosung. Direkte Methode: entweder Registrierkasse oder Scanner-Kassa."),
  mc("08", E, "EASY", "Einnahmen-Ausgaben-Rechnung?", [
    ["+ Betriebseinnahmen − Betriebsausgaben = Überschuss oder Unterschuss; − Abschreibungen (AfA) = Gewinn oder Verlust (Besteuerungsbasis)", true, "Laut Skript."],
    ["Vermögen − Schulden = Eigenkapital", false, "Das ist die Bilanzgleichung."],
    ["Erlös − variable Kosten = Deckungsbeitrag", false, "Das ist die Deckungsbeitragsrechnung."],
    ["Umsatz × 12 % = Gewinn", false, "Falsch."],
  ], "Erfolgsermittlung der Einnahmen-Ausgaben-Rechnung: + Betriebseinnahmen − Betriebsausgaben = Überschuss oder Unterschuss − Abschreibungen (AfA, wird später berücksichtigt) = Gewinn oder Verlust, Besteuerungsbasis."),
  mc("09", E, "MEDIUM", "Was umfasst die Aufzeichnungspflicht?", [
    ["Aufzeichnung für Einnahmen, Ausgaben und Eigenverbrauch; Anlagenverzeichnis (AfA); Lohnkonten (ÖGK-SV); Aufzeichnung der Betriebseinnahmen und Betriebsausgaben", true, "Laut Skript."],
    ["Nur ein Fahrtenbuch mit Fahrgastnamen", false, "Falsch."],
    ["Nur die Bilanz", false, "Falsch."],
    ["Keine Aufzeichnungen nötig", false, "Falsch."],
  ], "1) Aufzeichnung für Einnahmen, Ausgaben und Eigenverbrauch, 2) Anlagenverzeichnis (AfA), 3) Lohnkonten – ÖGK-SV, 4) nur die Aufzeichnung der Betriebseinnahmen und Betriebsausgaben."),
  mc("10", E, "MEDIUM", "Was fällt nicht unter die Betriebsausgaben?", [
    ["Kreditrückzahlung, Privatentnahme, Einkommensteuerzahlungen, Ausgaben für Investitionen (Privateinlage: keine Betriebseinnahme)", true, "Laut Skript."],
    ["Treibstoff, Reparaturen, Versicherung", false, "Das sind Betriebsausgaben."],
    ["Löhne und Sozialversicherung", false, "Das sind Betriebsausgaben."],
    ["Miete für den Abstellplatz", false, "Das ist eine Betriebsausgabe."],
  ], "1) Kreditrückzahlung → keine Betriebsausgabe, 2) Privatentnahme → keine Betriebsausgabe, 3) Einkommensteuerzahlungen → keine Betriebsausgabe, 4) Ausgaben für Investitionen → keine Betriebsausgabe, 5) Privateinlage → keine Betriebseinnahme."),
  mc("11", E, "EASY", "Kleinunternehmer?", [
    ["Jahresnettoumsatz bis 55.000 €, keine Umsatzsteuer in der Rechnung, kein Vorsteuerabzug, Kleinunternehmen ist keine Gesellschaft", true, "Laut Skript (sehr wichtig)."],
    ["Jahresnettoumsatz bis 220.000 €, mit Vorsteuerabzug", false, "Falsch."],
    ["Jahresnettoumsatz bis 1.000.000 €, Buchführungspflicht", false, "Falsch."],
    ["Jede GmbH mit unter 10 Mitarbeitern", false, "Falsch."],
  ], "1) Jahresnettoumsatz bis 55.000 €, 2) keine Umsatzsteuer in der Rechnung, 3) kein Vorsteuerabzug (VSt), 4) Kleinunternehmen ist keine Gesellschaft (sehr wichtig)."),
  mc("12", T, "EASY", "Was bedeutet Buchführung?", [
    ["Der Begriff Buchhaltung bezeichnet die Abteilung im Unternehmen, die sich mit der Buchführung befasst", true, "Laut Skript."],
    ["Die Lagerhaltung von Büchern", false, "Falsch."],
    ["Die Steuerprüfung durch das Finanzamt", false, "Falsch."],
    ["Die Werbung für das Unternehmen", false, "Falsch."],
  ], "Der Begriff Buchhaltung bezeichnet die Abteilung im Unternehmen, die sich mit der Buchführung befasst."),
  mc("13", T, "MEDIUM", "Welche Buchführungsgrenze kennen Sie?", [
    ["2 × 700.000 € Nettoumsatz oder über 1.000.000 € Nettoumsatz in einem Jahr", true, "Laut Skript."],
    ["55.000 € Nettoumsatz", false, "Kleinunternehmergrenze."],
    ["150.000 € Nettoumsatz", false, "Grenze der Kammerumlage 1."],
    ["220.000 € Nettoumsatz", false, "Grenze der Pauschalierung laut Skript."],
  ], "2 × 700.000 € Nettoumsatz oder über 1.000.000 € Nettoumsatz in einem Jahr."),
  mc("14", E, "EASY", "Was heißt Abschreibung (AfA)?", [
    ["Absetzung für Abnutzung: Verteilung des Anschaffungswerts durch die voraussichtliche Nutzungsdauer und absetzen", true, "Laut Skript (sehr wichtig)."],
    ["Abgabe für Arbeitnehmer", false, "Falsch."],
    ["Anmeldung für Auslandsfahrten", false, "Falsch."],
    ["Abzug für Altfahrzeuge", false, "Falsch."],
  ], "Absetzung für Abnutzung: Verteilung des Anschaffungswerts durch die voraussichtliche Nutzungsdauer und absetzen (sehr wichtig)."),
  mc("15", E, "MEDIUM", "Was versteht man unter geringwertige Wirtschaftsgüter (GWG) und welche Bedeutung haben sie für die AfA?", [
    ["Wenn der Nettopreis bis 1.000 € beträgt (GWG – geringwertige Wirtschaftsgüter)", true, "Laut Skript."],
    ["Wenn der Nettopreis über 10.000 € beträgt", false, "Falsch."],
    ["Alle Fahrzeuge", false, "Falsch."],
    ["Wenn das Wirtschaftsgut gebraucht gekauft wurde", false, "Falsch."],
  ], "Wenn der Nettopreis bis 1.000 € beträgt (GWG – geringwertige Wirtschaftsgüter)."),
  mc("16", E, "MEDIUM", "Was ist ein Anlagegut?", [
    ["Über 1.000 € netto (ab 2023), mindestens 1 Jahr im Betrieb, mindestens 80 % für den Betriebszweck", true, "Laut Skript."],
    ["Unter 1.000 € netto, sofort verbraucht", false, "Das ist kein Anlagegut."],
    ["Nur Grundstücke", false, "Falsch."],
    ["Alles, was weniger als 1 Monat im Betrieb bleibt", false, "Falsch."],
  ], "1) Über 1.000 € netto Anlagegut (ab 2023 1.000 € netto), 2) Anlagegut soll mindestens 1 Jahr im Betrieb bleiben, 3) mindestens 80 % für Betriebszweck."),
  mc("17", E, "MEDIUM", "Erklären Sie die AfA?", [
    ["Hat ein Wirtschaftsgut einen Anschaffungswert über 1.000 € netto, muss er langfristig über eine Nutzungsdauer abgeschrieben werden; die AfA beginnt nach Aktivierung im Anlagenverzeichnis (Inbetriebnahmedatum)", true, "Laut Skript (sehr wichtig)."],
    ["Die AfA beginnt mit der Bestellung des Wirtschaftsguts", false, "Falsch."],
    ["Alle Anschaffungen werden sofort im Kaufjahr abgesetzt", false, "Nur GWG bis 1.000 €."],
    ["Die AfA beginnt erst beim Verkauf", false, "Falsch."],
  ], "Wenn ein Wirtschaftsgut einen Anschaffungswert über 1.000 € netto hat, muss dieser langfristig über eine Nutzungsdauer abgeschrieben werden. Die AfA beginnt nach Aktivierung im Anlagenverzeichnis, Inbetriebnahmedatum (sehr wichtig)."),
  mc("18", E, "EASY", "Wie rechnet man die AfA?", [
    ["Anschaffungswert (AW) / Nutzungsdauer (ND)", true, "Laut Skript."],
    ["Anschaffungswert × Nutzungsdauer", false, "Falsch."],
    ["Nutzungsdauer / Anschaffungswert", false, "Falsch."],
    ["Restwert + Umsatz", false, "Falsch."],
  ], "Anschaffungswert (AW) / Nutzungsdauer (ND)."),
  mc("19", E, "MEDIUM", "Wann ist AfA-Stichtag?", [
    ["01. Jänner bis 30. Juni: volle AfA; 01. Juli bis 31. Dezember: halbe AfA", true, "Laut Skript."],
    ["Immer volle AfA, egal wann", false, "Falsch."],
    ["01. Jänner bis 30. Juni: halbe AfA; 01. Juli bis 31. Dezember: volle AfA", false, "Vertauscht."],
    ["Nur bei Kauf am 1. Jänner gibt es AfA", false, "Falsch."],
  ], "01. Januar 2025 bis 30. Juni 2025 wird die volle AfA, 01. Juli 2025 bis 31. Dezember 2025 wird die halbe AfA angesetzt."),
  mc("20", E, "MEDIUM", "Dafür braucht man ein Anlagenverzeichnis (Anlagekartei) (AfA) – was steht darin?", [
    ["Laufende Nummer, Vermögensart, Inbetriebnahme/Datum, Lieferant (Name und Adresse), Anschaffungswert, Nutzungsdauer, AfA, Restwert/Buchwert", true, "Laut Skript."],
    ["Fahrgastnamen, Fahrtziele, Trinkgeld", false, "Falsch."],
    ["Nur der Kaufpreis", false, "Zu wenig."],
    ["Kontostand und Kreditrahmen", false, "Falsch."],
  ], "1) Laufende Nummer (LFN), 2) Vermögensart, 3) Inbetriebnahme, Datum und Anschaffungswert, 4) Lieferant (Name und Adresse), 5) Anschaffungswert (AW), 6) Nutzungsdauer (ND), 7) AfA, 8) Restwert Buchwert (RW)."),
  mc("21", T, "EASY", "Telebanking: Was bedeutet der Begriff Telebanking?", [
    ["Überweisungen per Internet; man spart Bankweg, Formulare und Drucksortenkosten; 24 Std. Zugriff; Kontostand jederzeit; Sicherheit durch persönlichen Code", true, "Laut Skript."],
    ["Bankgeschäfte nur telefonisch mit einem Berater", false, "Falsch."],
    ["Überweisungen nur am Bankschalter", false, "Falsch."],
    ["Ein Kredit ohne Sicherheiten", false, "Falsch."],
  ], "1) Telebanking bietet eine große Erleichterung im Bankverkehr; Überweisungen per Internet. 2) Man spart sich den Bankweg, das Ausfüllen von Formularen und die Kosten für Drucksorten, 3) man hat 24 Std. lang Zugriff, 4) man kann jederzeit Informationen holen und den Kontostand kontrollieren, 5) Sicherheit durch persönlichen Code."),
  mc("22", E, "HARD", "Ermittlung des Gewinns bei Pauschalierung:", [
    ["Umsatz netto, Wareneinkauf netto, Personalausgaben, Werkshonorar für die Leistungserstellung", true, "Laut Skript."],
    ["Nur Privatentnahmen", false, "Falsch."],
    ["Vermögen minus Schulden", false, "Bilanzgleichung."],
    ["Einkommensteuer plus Umsatzsteuer", false, "Falsch."],
  ], "1) Umsatz netto, 2) Wareneinkauf netto, 3) Personalausgaben, 4) Werkshonorar für die Leistungserstellung."),
  mc("23", E, "HARD", "Was bedeutet Pauschalierung?", [
    ["Keine Buchführungspflicht, Vorjahresumsatz max. 220.000 € netto, Ausgabenpauschale 6 % oder 12 %, einmal in 5 Jahren Grenze um 15 % überschreitbar; Umsatz − 12 % Pauschale = zu versteuernder Gewinn", true, "Laut Skript."],
    ["Buchführungspflicht ab dem ersten Euro", false, "Falsch."],
    ["Pauschale Steuer von 50 % auf den Umsatz", false, "Falsch."],
    ["Nur für GmbHs mit über 1.000.000 € Umsatz", false, "Falsch."],
  ], "Voraussetzungen: 1) es besteht keine Buchführungspflicht, 2) Umsatz des Vorjahres max. netto 220.000 €, 3) Ausgabenpauschale 6 % oder 12 %, 4) man darf einmal in 5 Jahren die Grenze um 15 % überschreiten. − 12 % Betriebsausgabenpauschale vom Nettoumsatz = der zu versteuernde Gewinn. (Hinweis: Werte der Basispauschalierung wurden ab 2025 angehoben – aktuelle Werte prüfen.)"),
  mc("24", T, "EASY", "Welche Bücher und Aufzeichnungen müssen in der Buchhaltung in einem Unternehmen geführt werden?", [
    ["Journal (Grundbuch), Hauptbuch, Nebenbücher (Kassabuch), Hilfsbücher (Provision)", true, "Laut Skript."],
    ["Fahrtenbuch, Telefonbuch, Tagebuch", false, "Falsch."],
    ["Nur das Kassabuch", false, "Zu wenig."],
    ["Bilanz, Inventur, Mahnbuch", false, "Falsch."],
  ], "1) Journal (Grundbuch), 2) Hauptbuch, 3) Nebenbücher (Kassabuch), 4) Hilfsbücher (Provision)."),
  mc("25", T, "MEDIUM", "Welche Steuern müssen Unternehmer bezahlen?", [
    ["Einzelunternehmen und Personengesellschaften (KG, OG): Einkommensteuer; Kapitalgesellschaften (GmbH, AG): Körperschaftsteuer", true, "Laut Skript."],
    ["Alle Unternehmen zahlen nur Körperschaftsteuer", false, "Falsch."],
    ["GmbH und AG zahlen Einkommensteuer, Einzelunternehmen Körperschaftsteuer", false, "Vertauscht."],
    ["Unternehmer zahlen keine Ertragsteuern", false, "Falsch."],
  ], "Die Rechtsform eines Unternehmens bestimmt, ob Einkommen- oder Körperschaftsteuer fällig wird. 1) Personengesellschaften KG, OG, Einzelunternehmen zahlen Einkommensteuer, 2) Kapitalgesellschaften GmbH, AG zahlen Körperschaftsteuer."),
  mc("26", B, "MEDIUM", "Was muss auf einer Rechnung enthalten sein?", [
    ["Name und Anschrift des Unternehmens, Datum, Warenmenge/Bezeichnung/Preis, Steuersatz; über 400 € zusätzlich Name und Anschrift des Kunden, UID-Nummer, Rechnungsnummer, Mehrwertsteuer (netto, Steuersatz, brutto); über 10.000 € auch UID-Nummer des Kunden", true, "Laut Skript."],
    ["Nur der Betrag", false, "Zu wenig."],
    ["Nur Name des Kunden und Unterschrift", false, "Zu wenig."],
    ["Fahrtziel und Kilometerstand", false, "Falsch."],
  ], "1) Name und Anschrift des Unternehmens, 2) Datum, 3) Warenmenge, Bezeichnung, Preis, 4) Steuersatz, 5) Stempel und Unterschrift, 6) wenn der Betrag höher als 400 € beträgt, müssen folgende Punkte enthalten sein: 7) Name und Anschrift des Kunden, 8) UID-Nummer, 9) Rechnungsnummer, 10) Mehrwertsteuer (netto, Steuersatz, brutto), 11) auf der Rechnung ist ein QR-Code anzubringen, 12) wenn der Betrag 10.000 € übersteigt, muss auch die UID-Nummer des Kunden enthalten sein."),
  mc("27", E, "MEDIUM", "Fragen zur Einkommensteuer (Wann ist es fällig)?", [
    ["Vorauszahlungen 15. Februar, 15. Mai, 15. August, 15. November; Erklärung bis 30. April, FinanzOnline bis 30. Juni; Abschlusszahlung innerhalb 1 Monat", true, "Laut Skript."],
    ["Monatlich am 1., Erklärung bis 31. Jänner", false, "Falsch."],
    ["Einmal am 31. Dezember", false, "Falsch."],
    ["15. Jänner, 15. April, 15. Juli, 15. Oktober", false, "Falsche Termine."],
  ], "1) Das Finanzamt kann zusätzliche Infos von den Steuerpflichtigen holen. 2) Die Einkommensteuer des Jahres ist mit Einkommensteuerbescheid festgesetzt. 3) Termine für Einkommensteuer-Vorauszahlung sind: 15. Februar, 15. Mai, 15. August, 15. November. 8) Die Erklärung bis Abgabefrist 30. April abgeben, FinanzOnline bis 30. Juni; man kann die Abgabefrist durch ein begründetes Ansuchen verlängern. 9) Die Einkommensteuer-Abschlusszahlung ist innerhalb 1 Monat zu zahlen."),
  mc("28", E, "EASY", "Kilometerabhängige Kosten:", [
    ["Reparaturkosten pro Jahr, Reifengarniturkosten, Treibstoffkosten, Mautgebühren", true, "Laut Skript."],
    ["Kasko- und Haftpflichtversicherung", false, "Zeitabhängig."],
    ["Fremdkapitalzinsen", false, "Zeitabhängig."],
    ["Abstellplatz und Mobiltelefon", false, "Zeitabhängig."],
  ], "1) Reparaturkosten pro Jahr, 2) Reifengarniturkosten, 3) Treibstoffkosten, 4) Mautgebühren."),
  mc("29", E, "EASY", "Zeitabhängige Fahrzeugkosten:", [
    ["Fahrzeuganschaffungswert, Kasko/Haftpflicht oder Teilkasko, Fremdkapitalzinsen, Abschreibung pro Jahr, sonstige Kosten (z. B. Mobiltelefon, Abstellplatz)", true, "Laut Skript."],
    ["Treibstoff, Reifen, Maut", false, "Kilometerabhängig."],
    ["Nur Treibstoff", false, "Kilometerabhängig."],
    ["Reparaturen pro Kilometer", false, "Kilometerabhängig."],
  ], "1) Fahrzeuganschaffungswert, 2) Kasko/Haftpflichtversicherung oder Teilkasko, 3) Fremdkapitalzinsen, 4) Abschreibung pro Jahr, 5) sonstige Kosten: z. B. Kosten für Kommunikationseinrichtungen, Mobiltelefon, Abstellplatz."),
  mc("30", T, "MEDIUM", "Zuschlag zum Dienstgeberbeitrag = DB?", [
    ["Mitglieder der Wirtschaftskammer haben die Kammerumlage 1 an das Finanzamt abzuführen, wenn die steuerbaren Nettoumsätze im Kalenderjahr über 150.000 € liegen", true, "Laut Skript."],
    ["Nur Arbeitnehmer zahlen ihn an die ÖGK", false, "Falsch."],
    ["Er gilt ab dem ersten Euro Umsatz", false, "Falsch."],
    ["Er wird an die Gemeinde gezahlt", false, "Falsch."],
  ], "Mitglieder der Wirtschaftskammer haben in der Regel die Kammerumlage 1 an das Finanzamt abzuführen, wenn die im Inland erzielten steuerbaren Nettoumsätze in einem Kalenderjahr – für Unternehmen mit einem Nettojahresumsatz über 150.000 € – anfallen."),
  mc("31", T, "MEDIUM", "Was bedeutet Grundumlage?", [
    ["Wird jährlich von der zuständigen Fachgruppe (Fachverband der Wirtschaftskammer) beschlossen und ist von jedem Unternehmen zu entrichten", true, "Laut Skript."],
    ["Eine Steuer an das Finanzamt für Grundstücke", false, "Falsch."],
    ["Ein Beitrag der Arbeitnehmer an die Gewerkschaft", false, "Falsch."],
    ["Die Miete für den Taxistandplatz", false, "Falsch."],
  ], "Die Grundumlage wird jährlich von der zuständigen Fachgruppe im Falle einer Fachvertretung vom jeweiligen Fachverband der Wirtschaftskammer beschlossen. Sie wird auf Grundlage einer allgemein feststellbaren Bemessungsgrundlage festgesetzt und ist von jedem Unternehmen zu entrichten."),
  mc("32", T, "MEDIUM", "Was bedeutet Hauptbuch?", [
    ["Alle Sachkonten aus den Buchungen des Grundbuchs werden übertragen; Abschluss der Hauptbuchkonten führt zur Schlussbilanz und zur Gewinn- und Verlustrechnung", true, "Laut Skript."],
    ["Das Buch mit allen Fahrgastnamen", false, "Falsch."],
    ["Das Kassabuch", false, "Das ist ein Nebenbuch."],
    ["Das Gesetzbuch für Unternehmer", false, "Falsch."],
  ], "Im Hauptbuch werden alle Sachkonten aus den im Grundbuch angesprochenen Buchungen übertragen. Es enthält entsprechend dem Kontenplan sämtliche Konten der Geschäftsbuchführung, in die die Geschäftsvorfälle sachlich und systematisch gebucht werden. Der Abschluss der Hauptbuchkonten führt zur Schlussbilanz sowie zur Gewinn- und Verlustrechnung eines Geschäftsjahres."),
  mc("33", T, "EASY", "Was heißt eigentlich Doppik?", [
    ["Doppik ist die Abkürzung von doppelter Buchführung (Bilanz)", true, "Laut Skript."],
    ["Doppelte Kontrolle durch das Finanzamt", false, "Falsch."],
    ["Doppelter Umsatz", false, "Falsch."],
    ["Doppeltes Kassabuch", false, "Falsch."],
  ], "Doppik ist die Abkürzung von doppelter Buchführung, Bilanz."),
  mc("34", E, "EASY", "Was bedeutet Eigenverbrauch?", [
    ["Wenn ein Unternehmer Gegenstände oder Leistungen aus seinem Betrieb für private Zwecke entnimmt (z. B. Privatnutzung des Firmenwagens, Privatanteil bei Telefonkosten)", true, "Laut Skript."],
    ["Treibstoffverbrauch bei Fahrten mit Fahrgästen", false, "Betrieblich."],
    ["Der Stromverbrauch im Büro", false, "Betrieblich."],
    ["Der Verbrauch von Material in der Werkstatt", false, "Betrieblich."],
  ], "Wenn ein Unternehmer Gegenstände oder Leistungen aus seinem Betrieb für private Zwecke entnimmt: „Eigenverbrauch“. Eine solche Entnahme für den Eigenbedarf kommt als Privatanteil in vielen Fällen vor: Privatnutzung des Firmenwagens, Privatanteil bei Telefonkosten."),
  mc("35", T, "MEDIUM", "Was ist ein Journal Buchführung?", [
    ["Grundbuch/Tagebuch: alle Geschäftsvorfälle in chronologischer Reihenfolge mit fortlaufender Nummer, Datum, Betrag und Verweis auf einen Beleg", true, "Laut Skript."],
    ["Eine Zeitschrift für Unternehmer", false, "Falsch."],
    ["Das Buch mit den Sachkonten", false, "Das ist das Hauptbuch."],
    ["Eine Liste der Mitarbeiter", false, "Falsch."],
  ], "Ein wichtiger Bestandteil der Buchhaltung ist das Journal. Es wird auch als Grundbuch oder Tagebuch bezeichnet. Im Journal muss der Unternehmer all seine Geschäftsvorfälle in chronologischer, zeitlicher Reihenfolge mit einer fortlaufenden Nummer, dem Datum, dem Betrag und einem Verweis auf einen Beleg dokumentieren."),
  mc("36", B, "EASY", "Was bedeutet Kassenbuch?", [
    ["Laufende Aufzeichnung aller Bareinnahmen und Barausgaben; in der Regel 12 Kassenbücher pro Jahr (monatlich eines); Grundlage für Jahresabschluss und Versteuerung", true, "Laut Skript."],
    ["Ein Buch nur für Bankeinzahlungen", false, "Falsch."],
    ["Ein Buch, das einmal in 5 Jahren geführt wird", false, "Falsch."],
    ["Die Liste aller Kreditkarten", false, "Falsch."],
  ], "Ein Kassenbuch ist die laufende Aufzeichnung aller Bareinnahmen und Barausgaben eines Unternehmens. In der Regel werden jährlich 12 Kassenbücher (monatlich eines) geführt. Es dient als Grundlage für den Jahresabschluss und die Versteuerung des Einkommens."),
  mc("37", T, "MEDIUM", "Was ist der Unterschied zwischen Hauptbuch und Nebenbuch?", [
    ["Doppik = doppelte Buchführung in den Konten Soll und Haben; dafür braucht man das Hauptbuch, das Grundbuch (Journal) und die Nebenbücher z. B. Kassabuch", true, "Laut Skript."],
    ["Es gibt keinen Unterschied", false, "Falsch."],
    ["Das Nebenbuch ersetzt die Bilanz", false, "Falsch."],
    ["Das Hauptbuch ist nur für Kleinunternehmer", false, "Falsch."],
  ], "1) Doppik ist eine Abkürzung und steht für doppelte Buchführung in den Konten „Soll und Haben“. 2) Die Buchung auf Konten erfordert die Führung von entsprechenden Büchern. Darunter fällt das Hauptbuch, das Grundbuch – Journal und die Nebenbücher z. B. Kassabuch."),
  mc("38", B, "EASY", "Was bedeutet Rechnungspflicht?", [
    ["Eine Rechnung (Faktura) informiert den Kunden über das fällige Entgelt; Fakturierung = Ausstellung der Rechnung und Zusendung an den Kunden", true, "Laut Skript."],
    ["Die Pflicht, jeden Tag die Kasse zu zählen", false, "Falsch."],
    ["Die Pflicht, Rechnungen nur bar zu bezahlen", false, "Falsch."],
    ["Die Pflicht, Rechnungen nicht aufzubewahren", false, "Falsch."],
  ], "Eine Rechnung oder Faktura ist ein Dokument, in dem ein Unternehmer seinen Kunden über das aufgrund des Kaufvertrags fällige Entgelt informiert. Fakturierung nennt man den Vorgang der Ausstellung der Rechnung und der Zusendung an den Kunden. In einer Rechnung werden Lieferungen oder sonstige Leistungen an einen Kunden abgerechnet."),
  mc("39", B, "MEDIUM", "Was ist Barcode?", [
    ["Barcode bedeutet eine elektronische Signatur; QR-Code bietet mit der digitalen Signatur von PDF-Dokumenten die Möglichkeit, Dokumente mit einem Siegel zu versehen", true, "Laut Skript."],
    ["Ein Rabattcode für Fahrgäste", false, "Falsch."],
    ["Die Steuernummer in Klartext", false, "Falsch."],
    ["Eine Werbefläche auf der Rechnung", false, "Falsch."],
  ], "Barcode bedeutet eine elektronische Signatur. Barcode/QR bietet mit der digitalen Signatur von PDF-Dokumenten die Möglichkeit, die Dokumente mit einem Siegel zu versehen."),
  mc("40", E, "MEDIUM", "Welche Vorteile hat man als Kleinunternehmer?", [
    ["Keine Umsatzsteuer in Rechnung stellen; Nachteil: keine Vorsteuererstattung für Eingangsrechnungen mit Umsatzsteuer", true, "Laut Skript."],
    ["Man muss doppelte Umsatzsteuer verrechnen", false, "Falsch."],
    ["Man bekommt immer die Vorsteuer zurück", false, "Gerade nicht."],
    ["Man braucht keine Gewerbeberechtigung", false, "Falsch."],
  ], "1) Die Kleinunternehmerregelung ermöglicht es Unternehmen mit nur geringen Umsätzen, dass sie für ihre erbrachten Leistungen keine Umsatzsteuer in Rechnung stellen müssen. 2) Das bringt zahlreiche Vorteile, jedoch auch den Nachteil, dass es für Eingangsrechnungen mit Umsatzsteuerausweis keine Vorsteuererstattung gibt."),
  mc("41", E, "EASY", "Was ist eine UID-Nummer? Was wissen Sie über die UID-Nummer?", [
    ["Umsatzsteuer-Identifikationsnummer: spezielle Steuernummer zur Identifikation des Unternehmens; bei EU-Einkäufen wird mit ihr die ausländische Umsatzsteuer in Abzug gebracht", true, "Laut Skript."],
    ["Die Sozialversicherungsnummer", false, "Falsch."],
    ["Die Firmenbuchnummer", false, "Falsch."],
    ["Die Taxi-Konzessionsnummer", false, "Falsch."],
  ], "Die Umsatzsteuer-Identifikationsnummer (UID-Nummer) ist eine spezielle Steuernummer, die der Identifikation des Unternehmens dient. Bei betrieblichen Einkäufen im EU-Ausland wird bei Angabe der UID-Nummer die ausländische Umsatzsteuer in Abzug gebracht."),
  mc("42", T, "EASY", "Bilanz ist des Vermögens und der Schulden zum Bilanzstichtag – wie ist sie aufgebaut?", [
    ["Vermögen (Aktiv): Anlagevermögen, Umlaufvermögen – Kapital (Passiv): Eigenkapital, Fremdkapital (LFK + KFK); Summe Gesamtvermögen = Summe Gesamtkapital", true, "Laut Skript."],
    ["Aktiv: Eigenkapital – Passiv: Anlagevermögen", false, "Vertauscht."],
    ["Aktiv: Erlöse – Passiv: Aufwände", false, "Das ist die GuV."],
    ["Nur eine Liste der Schulden", false, "Falsch."],
  ], "Bilanz (01.01.2025 bis 31.12.2025): Vermögen (Aktiv, Investition) – Anlagevermögen, Umlaufvermögen; Kapital (Passiv) – Eigenkapital (EK), Fremdkapital (LFK + KFK). Summe Gesamtvermögen = Summe Gesamtkapital."),
  mc("43", T, "MEDIUM", "Saldenliste per 31.12.2025 Bilanz – was steht auf welcher Seite?", [
    ["Soll/Aktiva: Anlagevermögen (Fuhrpark, Grundstücke, Geschäftseinrichtung, Maschinen, langfristige Wertpapiere) und Umlaufvermögen (Materialvorrat, Kassa, Kundenforderungen, Bankguthaben) – Haben/Passiva: Eigenkapital, langfristiges Fremdkapital (Darlehen, Hypothekarkredit), kurzfristiges Fremdkapital (Rückstellung, Verbindlichkeiten ÖGK/Finanzamt/Lieferanten, Banküberziehung, KKK-Kredit, Steuerberaterschulden)", true, "Laut Skript."],
    ["Soll: Eigenkapital und Darlehen – Haben: Kassa und Bankguthaben", false, "Vertauscht."],
    ["Soll: Erlöse und Einnahmen – Haben: Zinsaufwand und Löhne", false, "Das ist die GuV – und vertauscht."],
    ["Alle Konten stehen auf der Haben-Seite", false, "Falsch."],
  ], "Saldenliste: Aktiva-Seite (Soll) – Anlagevermögen: Fuhrpark (Parkplatz), Grundstücke, Geschäftseinrichtung, Maschinen, langfristige Wertpapiere; Umlaufvermögen: Materialvorrat, Bargeld/Kassa, Kundenforderungen, Bankguthaben. Passiva-Seite (Haben) – Eigenkapital; langfristiges Fremdkapital: Darlehen, Hypothekarkredit; kurzfristiges Fremdkapital: Rückstellung, Verbindlichkeit ÖGK, Verbindlichkeit Finanzamt, Lieferantenverbindlichkeit, Banküberziehungskredit, Kontokorrentkredit (KKK-Kredit), Steuerberaterschulden. Gewinn- und Verlustrechnung: Aufwendungen (Soll) – Zinsaufwand, Sozialversicherung, Gas, Miete, Reparatur/Instandhaltung, Löhne, Materialeinsatz, Beratungskosten; Erträge (Haben) – Erlöse, Einnahmen, Umsatz."),
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
