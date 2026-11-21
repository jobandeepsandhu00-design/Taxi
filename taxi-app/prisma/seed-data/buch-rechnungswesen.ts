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
    ["Chronologisch und systematisch durchgeführt werden:\n1) Buchführung, Geschäftsaufzeichnung\n2) Einnahmen - Ausgaben - Rechnung\n3) Doppelte Buchhaltung (Bilanz)\n4) Pauschalierung\na) Kostenrechnung\nb) Statistik\nc) Planungsrechnung und Finanzierung", true, "Antwort laut Skript."],
    ["Buchführung, Marketing, Personalverwaltung, Einkauf", false, "Marketing, Personal und Einkauf sind keine Teilgebiete."],
    ["Kassabuch, Hauptbuch, Journal, Hilfsbücher", false, "Das sind Bücher der Buchhaltung."],
    ["Bilanz, GuV, Inventur, Mahnwesen", false, "Falsch."],
  ], "Chronologisch und systematisch durchgeführt werden:\n1) Buchführung, Geschäftsaufzeichnung\n2) Einnahmen - Ausgaben - Rechnung\n3) Doppelte Buchhaltung (Bilanz)\n4) Pauschalierung\na) Kostenrechnung\nb) Statistik\nc) Planungsrechnung und Finanzierung"),
  mc("02", T, "MEDIUM", "Welche Formvorschriften gelten in Österreich für die Buchführung? Mindestens 7 Punkte aufzählen:", [
    ["1) Alle Firmen Bücher im Inland zu führen\n2) Alle Unterlagen müssen 7 Jahre aufbewahrt werden\n3) Keine radierbaren Mittel verwenden\n4) Keine leeren Zwischenräume\n5) Die Eintragung chronologisch, zeitgerecht, richtig und vollständig führen\n6) Die Überprüfung muss jederzeit möglich sein\n7) Seiten fortlaufend nummerieren\n8) In deutscher Sprache führen, ansonsten eine beglaubigte Übersetzung", true, "Antwort laut Skript."],
    ["Bücher im Ausland führen, 3 Jahre aufbewahren, mit Bleistift schreiben", false, "Falsch."],
    ["Leere Zwischenräume lassen, Seiten nicht nummerieren, beliebige Sprache", false, "Falsch."],
    ["Nur einmal im Jahr eintragen, Korrekturen mit Tipp-Ex", false, "Falsch."],
  ], "1) Alle Firmen Bücher im Inland zu führen\n2) Alle Unterlagen müssen 7 Jahre aufbewahrt werden\n3) Keine radierbaren Mittel verwenden\n4) Keine leeren Zwischenräume\n5) Die Eintragung chronologisch, zeitgerecht, richtig und vollständig führen\n6) Die Überprüfung muss jederzeit möglich sein\n7) Seiten fortlaufend nummerieren\n8) In deutscher Sprache führen, ansonsten eine beglaubigte Übersetzung"),
  mc("03", B, "EASY", "Was bedeutet Beleggrundsätze?", [
    ["1) Keine Buchung ohne Beleg\n2) Belege sind Dokumente, man darf sie nicht verändern oder unleserlich machen\n3) Die Änderungen muss man eindeutig kennzeichnen.\n4) Wenn die Belegbearbeitung unordentlich ist, dann gibt es keine Glaubwürdigkeit", true, "Antwort laut Skript."],
    ["Belege dürfen nach der Buchung weggeworfen werden", false, "Falsch."],
    ["Buchungen sind auch ohne Beleg erlaubt", false, "Keine Buchung ohne Beleg."],
    ["Belege dürfen jederzeit verändert werden", false, "Belege sind Dokumente."],
  ], "1) Keine Buchung ohne Beleg\n2) Belege sind Dokumente, man darf sie nicht verändern oder unleserlich machen\n3) Die Änderungen muss man eindeutig kennzeichnen.\n4) Wenn die Belegbearbeitung unordentlich ist, dann gibt es keine Glaubwürdigkeit"),
  mc("04", B, "EASY", "Arten von Belegen?", [
    ["1) Eingangsrechnung (ER)\n2) Ausgangsrechnung (AR)\n3) Eingangsgutschrift (EG)\n4) Ausgangsgutschrift (AG)\n5) Kassabeleg\n6) Ersatzbeleg\n7) Bankbeleg", true, "Antwort laut Skript."],
    ["Preisliste, Visitenkarte, Werbeprospekt", false, "Das sind keine Belege."],
    ["Nur Kassabelege", false, "Es gibt sieben Belegarten."],
    ["Führerschein, Zulassungsschein, Taxilenkerausweis", false, "Das sind Dokumente, keine Buchungsbelege."],
  ], "1) Eingangsrechnung (ER)\n2) Ausgangsrechnung (AR)\n3) Eingangsgutschrift (EG)\n4) Ausgangsgutschrift (AG)\n5) Kassabeleg\n6) Ersatzbeleg\n7) Bankbeleg"),
  mc("05", E, "MEDIUM", "Wann entsteht die Steuerschuld?", [
    ["Mit Ablauf des Kalendermonats", true, "Antwort laut Skript."],
    ["Am Jahresende", false, "Falsch."],
    ["Mit Abgabe der Jahreserklärung", false, "Falsch."],
    ["Bei einer Betriebsprüfung", false, "Falsch."],
  ], "Mit Ablauf des Kalendermonats"),
  mc("06", E, "MEDIUM", "Wann ist die Fälligkeit der USt-Zahllast?", [
    ["15. des zweitfolgenden Kalendermonats (1 Monat + 15 Tage)", true, "Antwort laut Skript."],
    ["15. des Folgemonats", false, "Einen Monat zu früh."],
    ["Letzter Tag des Kalendermonats", false, "Falsch."],
    ["31. Dezember", false, "Falsch."],
  ], "15. des zweitfolgenden Kalendermonats (1 Monat + 15 Tage)"),
  mc("07", B, "HARD", "Erklären Sie die Ermittlung der Tageslosung?", [
    ["Bei der rechnerischen Ermittlung der Tageslosung wird das Geld in der Kasse täglich nach Geschäftsschluss ausgezählt. Im Zählprotokoll werden Stück für Stück für jede Münze und für jeden Geldschein die Anzahl und der Betrag eingetragen, was schlussendlich einen Gesamtbetrag für den aktuellen Kassenbestand ergibt.\nEs gibt 2 Methoden der Tageslosungsermittlung:\nIndirekte Methode (Taxi):\nBargeld bei Geschäftsschluss\n+ Barausgänge des Tages\n= Zwischensumme\n- Bargeldbestand am Geschäftsbeginn\n- sonstige Eingänge z. B. Mieteinnahmen\n= Tageslosung\nDirekte Methode: entweder Registrierkasse oder Scanner-Kassa", true, "Antwort laut Skript."],
    ["Bargeld bei Geschäftsbeginn + sonstige Eingänge − Barausgänge = Tageslosung", false, "Falsche Rechnung."],
    ["Umsatz laut Taxameter minus Trinkgeld", false, "Nicht die Methode laut Skript."],
    ["Kontostand am Monatsende geteilt durch 30", false, "Falsch."],
  ], "Bei der rechnerischen Ermittlung der Tageslosung wird das Geld in der Kasse täglich nach Geschäftsschluss ausgezählt. Im Zählprotokoll werden Stück für Stück für jede Münze und für jeden Geldschein die Anzahl und der Betrag eingetragen, was schlussendlich einen Gesamtbetrag für den aktuellen Kassenbestand ergibt.\nEs gibt 2 Methoden der Tageslosungsermittlung:\nIndirekte Methode (Taxi):\nBargeld bei Geschäftsschluss\n+ Barausgänge des Tages\n= Zwischensumme\n- Bargeldbestand am Geschäftsbeginn\n- sonstige Eingänge z. B. Mieteinnahmen\n= Tageslosung\nDirekte Methode: entweder Registrierkasse oder Scanner-Kassa"),
  mc("08", E, "EASY", "Einnahmen - Ausgaben - Rechnung?", [
    ["Erfolgsermittlung der Einnahmen - Ausgaben:\n+ Betriebseinnahmen\n- Betriebsausgaben\n= Überschuss oder Unterschuss\n- Abschreibungen (AFA) wird später berücksichtigt\nGewinn oder Verlust: Besteuerungsbasis", true, "Antwort laut Skript."],
    ["Vermögen − Schulden = Eigenkapital", false, "Das ist die Bilanzgleichung."],
    ["Erlös − variable Kosten = Deckungsbeitrag", false, "Das ist die Deckungsbeitragsrechnung."],
    ["Umsatz × 12 % = Gewinn", false, "Falsch."],
  ], "Erfolgsermittlung der Einnahmen - Ausgaben:\n+ Betriebseinnahmen\n- Betriebsausgaben\n= Überschuss oder Unterschuss\n- Abschreibungen (AFA) wird später berücksichtigt\nGewinn oder Verlust: Besteuerungsbasis"),
  mc("09", E, "MEDIUM", "Aufzeichnungspflicht?", [
    ["1) Aufzeichnung für Einnahmen, Ausgaben und Eigenverbrauch\n2) Anlagenverzeichnis (AFA)\n3) Lohnkonten - ÖGK-SV\n4) Nur die Aufzeichnung der Betriebseinnahmen und Betriebsausgaben", true, "Antwort laut Skript."],
    ["Nur ein Fahrtenbuch mit Fahrgastnamen", false, "Falsch."],
    ["Nur die Bilanz", false, "Falsch."],
    ["Keine Aufzeichnungen nötig", false, "Falsch."],
  ], "1) Aufzeichnung für Einnahmen, Ausgaben und Eigenverbrauch\n2) Anlagenverzeichnis (AFA)\n3) Lohnkonten - ÖGK-SV\n4) Nur die Aufzeichnung der Betriebseinnahmen und Betriebsausgaben"),
  mc("10", E, "MEDIUM", "Was fällt nicht unter die Betriebsausgaben?", [
    ["1) Kreditrückzahlung → NEIN: keine Betriebsausgaben\n2) Privatentnahme → NEIN: keine Betriebsausgaben\n3) Einkommensteuerzahlungen → NEIN: keine Betriebsausgaben\n4) Ausgaben für Investitionen → NEIN: keine Betriebsausgaben\n5) Privateinlage → NEIN: keine Betriebseinnahmen", true, "Antwort laut Skript."],
    ["Treibstoff, Reparaturen, Versicherung", false, "Das sind Betriebsausgaben."],
    ["Löhne und Sozialversicherung", false, "Das sind Betriebsausgaben."],
    ["Miete für den Abstellplatz", false, "Das ist eine Betriebsausgabe."],
  ], "1) Kreditrückzahlung → NEIN: keine Betriebsausgaben\n2) Privatentnahme → NEIN: keine Betriebsausgaben\n3) Einkommensteuerzahlungen → NEIN: keine Betriebsausgaben\n4) Ausgaben für Investitionen → NEIN: keine Betriebsausgaben\n5) Privateinlage → NEIN: keine Betriebseinnahmen"),
  mc("11", E, "EASY", "Kleinunternehmer?", [
    ["1) Jahresnettoumsatz bis 55.000 €\n2) Keine Umsatzsteuer in der Rechnung\n3) Kein Vorsteuerabzug (VST)\n4) Kleinunternehmen ist keine Gesellschaft (Sehr wichtig)", true, "Antwort laut Skript."],
    ["Jahresnettoumsatz bis 220.000 €, mit Vorsteuerabzug", false, "Falsch."],
    ["Jahresnettoumsatz bis 1.000.000 €, Buchführungspflicht", false, "Falsch."],
    ["Jede GmbH mit unter 10 Mitarbeitern", false, "Falsch."],
  ], "1) Jahresnettoumsatz bis 55.000 €\n2) Keine Umsatzsteuer in der Rechnung\n3) Kein Vorsteuerabzug (VST)\n4) Kleinunternehmen ist keine Gesellschaft (Sehr wichtig)"),
  mc("12", T, "EASY", "Was bedeutet Buchführung?", [
    ["Der Begriff Buchhaltung bezeichnet die Abteilung im Unternehmen, die sich mit der Buchführung befasst.", true, "Antwort laut Skript."],
    ["Die Lagerhaltung von Büchern", false, "Falsch."],
    ["Die Steuerprüfung durch das Finanzamt", false, "Falsch."],
    ["Die Werbung für das Unternehmen", false, "Falsch."],
  ], "Der Begriff Buchhaltung bezeichnet die Abteilung im Unternehmen, die sich mit der Buchführung befasst."),
  mc("13", T, "MEDIUM", "Welche Buchführungsgrenze kennen Sie?", [
    ["2 × 700.000 € Nettoumsatz oder über 1.000.000 € Nettoumsatz in einem Jahr", true, "Antwort laut Skript."],
    ["55.000 € Nettoumsatz", false, "Kleinunternehmergrenze."],
    ["150.000 € Nettoumsatz", false, "Grenze der Kammerumlage 1."],
    ["220.000 € Nettoumsatz", false, "Grenze der Pauschalierung laut Skript."],
  ], "2 × 700.000 € Nettoumsatz oder über 1.000.000 € Nettoumsatz in einem Jahr"),
  mc("14", E, "EASY", "Was heißt Abschreibung (AFA)?", [
    ["Absetzung für Abnutzung. Verteilung der Anschaffungswert durch die voraussichtliche Nutzungsdauer und absetzen (Sehr wichtig)", true, "Antwort laut Skript."],
    ["Abgabe für Arbeitnehmer", false, "Falsch."],
    ["Anmeldung für Auslandsfahrten", false, "Falsch."],
    ["Abzug für Altfahrzeuge", false, "Falsch."],
  ], "Absetzung für Abnutzung. Verteilung der Anschaffungswert durch die voraussichtliche Nutzungsdauer und absetzen (Sehr wichtig)"),
  mc("15", E, "MEDIUM", "Was versteht man unter geringwertige Wirtschaftsgüter (GWG) und welche Bedeutung haben sie für die AFA?", [
    ["Wenn der Nettopreis bis 1.000 € beträgt (GWG - Geringwertige Wirtschaftsgüter)", true, "Antwort laut Skript."],
    ["Wenn der Nettopreis über 10.000 € beträgt", false, "Falsch."],
    ["Alle Fahrzeuge", false, "Falsch."],
    ["Wenn das Wirtschaftsgut gebraucht gekauft wurde", false, "Falsch."],
  ], "Wenn der Nettopreis bis 1.000 € beträgt (GWG - Geringwertige Wirtschaftsgüter)"),
  mc("16", E, "MEDIUM", "Was ist ein Anlagegut?", [
    ["1) Über 1.000 € Netto Anlagegut (ab 2023 1.000 € Netto)\n2) Anlagegut soll mindestens 1 Jahr im Betrieb bleiben\n3) Mindestens 80 % für Betriebszweck", true, "Antwort laut Skript."],
    ["Unter 1.000 € netto, sofort verbraucht", false, "Das ist kein Anlagegut."],
    ["Nur Grundstücke", false, "Falsch."],
    ["Alles, was weniger als 1 Monat im Betrieb bleibt", false, "Falsch."],
  ], "1) Über 1.000 € Netto Anlagegut (ab 2023 1.000 € Netto)\n2) Anlagegut soll mindestens 1 Jahr im Betrieb bleiben\n3) Mindestens 80 % für Betriebszweck"),
  mc("17", E, "MEDIUM", "Erklären Sie die AFA?", [
    ["Wenn ein Wirtschaftsgut einen Anschaffungswert über 1.000 € Netto hat, muss dieser langfristig über eine Nutzungsdauer abgeschrieben werden. Die Afa beginnt nach Aktivierung im Anlagenverzeichnis. Inbetriebnahme Datum (Sehr wichtig)", true, "Antwort laut Skript."],
    ["Die AfA beginnt mit der Bestellung des Wirtschaftsguts", false, "Falsch."],
    ["Alle Anschaffungen werden sofort im Kaufjahr abgesetzt", false, "Nur GWG bis 1.000 €."],
    ["Die AfA beginnt erst beim Verkauf", false, "Falsch."],
  ], "Wenn ein Wirtschaftsgut einen Anschaffungswert über 1.000 € Netto hat, muss dieser langfristig über eine Nutzungsdauer abgeschrieben werden. Die Afa beginnt nach Aktivierung im Anlagenverzeichnis. Inbetriebnahme Datum (Sehr wichtig)"),
  mc("18", E, "EASY", "Wie rechnet man die Afa?", [
    ["Anschaffungswert (AW) / Nutzungsdauer (ND)", true, "Antwort laut Skript."],
    ["Anschaffungswert × Nutzungsdauer", false, "Falsch."],
    ["Nutzungsdauer / Anschaffungswert", false, "Falsch."],
    ["Restwert + Umsatz", false, "Falsch."],
  ], "Anschaffungswert (AW) / Nutzungsdauer (ND)"),
  mc("19", E, "MEDIUM", "Wann ist AFA-Stichtag?", [
    ["01. Januar 2025 bis 30. Juni 2025 wird die volle Afa\n01. Juli 2025 bis 31. Dezember 2025 wird die halbe Afa", true, "Antwort laut Skript."],
    ["Immer volle AfA, egal wann", false, "Falsch."],
    ["01. Jänner bis 30. Juni: halbe AfA; 01. Juli bis 31. Dezember: volle AfA", false, "Vertauscht."],
    ["Nur bei Kauf am 1. Jänner gibt es AfA", false, "Falsch."],
  ], "01. Januar 2025 bis 30. Juni 2025 wird die volle Afa\n01. Juli 2025 bis 31. Dezember 2025 wird die halbe Afa"),
  mc("20", E, "MEDIUM", "Dafür braucht man ein Anlagenverzeichnis (Anlagekartei) (AFA)?", [
    ["1) Laufende Nummer (LFN)\n2) Vermögensart\n3) Inbetriebnahme, Datum und Anschaffungswert\n4) Lieferant (Name und Adresse)\n5) Anschaffungswert (AW)\n6) Nutzungsdauer (ND)\n7) Afa\n8) Restwert Buchwert (RW)", true, "Antwort laut Skript."],
    ["Fahrgastnamen, Fahrtziele, Trinkgeld", false, "Falsch."],
    ["Nur der Kaufpreis", false, "Zu wenig."],
    ["Kontostand und Kreditrahmen", false, "Falsch."],
  ], "1) Laufende Nummer (LFN)\n2) Vermögensart\n3) Inbetriebnahme, Datum und Anschaffungswert\n4) Lieferant (Name und Adresse)\n5) Anschaffungswert (AW)\n6) Nutzungsdauer (ND)\n7) Afa\n8) Restwert Buchwert (RW)"),
  mc("21", T, "EASY", "Telebanking: Was bedeutet der Begriff Telebanking?", [
    ["1) Telebanking bietet eine große Erleichterung im Bankverkehr. Man kann heutzutage die Überweisungen per Internet erledigen. Die Vorteile sind:\n2) Man spart sich den Bankweg bei Überweisungen, Ausfüllen von Formularen und die Kosten für Drucksorten\n3) Man hat 24 Std. lang Zugriff\n4) Man kann jederzeit Informationen holen und den Kontostand kontrollieren\n5) Sicherheit durch persönlichen Code", true, "Antwort laut Skript."],
    ["Bankgeschäfte nur telefonisch mit einem Berater", false, "Falsch."],
    ["Überweisungen nur am Bankschalter", false, "Falsch."],
    ["Ein Kredit ohne Sicherheiten", false, "Falsch."],
  ], "1) Telebanking bietet eine große Erleichterung im Bankverkehr. Man kann heutzutage die Überweisungen per Internet erledigen. Die Vorteile sind:\n2) Man spart sich den Bankweg bei Überweisungen, Ausfüllen von Formularen und die Kosten für Drucksorten\n3) Man hat 24 Std. lang Zugriff\n4) Man kann jederzeit Informationen holen und den Kontostand kontrollieren\n5) Sicherheit durch persönlichen Code"),
  mc("22", E, "HARD", "Ermittlung des Gewinns bei Pauschalierung?", [
    ["1) Umsatz Netto\n2) Wareneinkauf Netto\n3) Personalausgaben\n4) Werkshonorar für die Leistungserstellung", true, "Antwort laut Skript."],
    ["Nur Privatentnahmen", false, "Falsch."],
    ["Vermögen minus Schulden", false, "Bilanzgleichung."],
    ["Einkommensteuer plus Umsatzsteuer", false, "Falsch."],
  ], "1) Umsatz Netto\n2) Wareneinkauf Netto\n3) Personalausgaben\n4) Werkshonorar für die Leistungserstellung"),
  mc("23", E, "HARD", "Was bedeutet Pauschalierung?", [
    ["Voraussetzungen für die Inanspruchnahme der Pauschalierung sind:\n1) Es besteht keine Buchführungspflicht.\n2) Umsatz des Vorjahres max. Netto 220.000 €\n3) Ausgabenpauschale 6 % oder 12 %\n4) Man darf einmal in 5 Jahren die Grenze um 15 % überschreiten\n- 12 % Betriebsausgabenpauschale vom Nettoumsatz\n= der zu versteuernde Gewinn", true, "Antwort laut Skript."],
    ["Buchführungspflicht ab dem ersten Euro", false, "Falsch."],
    ["Pauschale Steuer von 50 % auf den Umsatz", false, "Falsch."],
    ["Nur für GmbHs mit über 1.000.000 € Umsatz", false, "Falsch."],
  ], "Voraussetzungen für die Inanspruchnahme der Pauschalierung sind:\n1) Es besteht keine Buchführungspflicht.\n2) Umsatz des Vorjahres max. Netto 220.000 €\n3) Ausgabenpauschale 6 % oder 12 %\n4) Man darf einmal in 5 Jahren die Grenze um 15 % überschreiten\n- 12 % Betriebsausgabenpauschale vom Nettoumsatz\n= der zu versteuernde Gewinn"),
  mc("24", T, "EASY", "Welche Bücher und Aufzeichnungen müssen in der Buchhaltung in einem Unternehmen geführt werden?", [
    ["1) Journal (Grundbuch)\n2) Hauptbuch\n3) Nebenbücher (Kassabuch)\n4) Hilfsbücher (Provision)", true, "Antwort laut Skript."],
    ["Fahrtenbuch, Telefonbuch, Tagebuch", false, "Falsch."],
    ["Nur das Kassabuch", false, "Zu wenig."],
    ["Bilanz, Inventur, Mahnbuch", false, "Falsch."],
  ], "1) Journal (Grundbuch)\n2) Hauptbuch\n3) Nebenbücher (Kassabuch)\n4) Hilfsbücher (Provision)"),
  mc("25", T, "MEDIUM", "Welche Steuern müssen Unternehmer bezahlen?", [
    ["Die Rechtsform eines Unternehmens bestimmt, ob Einkommen- oder Körperschaftsteuer fällig wird. Einkommensteuer zahlen natürliche Personen, juristische Personen (GesmbH, AG) Körperschaftsteuer.\n1) Personengesellschaften KG, OG, Einzelunternehmen zahlen: Einkommensteuer\n2) Kapitalgesellschaften GesmbH, AG zahlen: Körperschaftsteuer", true, "Antwort laut Skript."],
    ["Alle Unternehmen zahlen nur Körperschaftsteuer", false, "Falsch."],
    ["GmbH und AG zahlen Einkommensteuer, Einzelunternehmen Körperschaftsteuer", false, "Vertauscht."],
    ["Unternehmer zahlen keine Ertragsteuern", false, "Falsch."],
  ], "Die Rechtsform eines Unternehmens bestimmt, ob Einkommen- oder Körperschaftsteuer fällig wird. Einkommensteuer zahlen natürliche Personen, juristische Personen (GesmbH, AG) Körperschaftsteuer.\n1) Personengesellschaften KG, OG, Einzelunternehmen zahlen: Einkommensteuer\n2) Kapitalgesellschaften GesmbH, AG zahlen: Körperschaftsteuer"),
  mc("26", B, "MEDIUM", "Was muss auf einer Rechnung enthalten sein?", [
    ["1) Name und Anschrift des Unternehmens\n2) Datum\n3) Warenmenge, Bezeichnung, Preis\n4) Steuersatz\n5) Stempel und Unterschrift\n6) Wenn der Betrag höher als 400 € beträgt, müssen folgende Punkte enthalten sein:\n7) Name und Anschrift des Kunden\n8) UID-Nummer\n9) Rechnungsnummer\n10) Mehrwertsteuer (Netto, Steuersatz, Brutto)\n11) Auf der Rechnung ist ein QR-Code anzubringen.\n12) Wenn der Betrag 10.000 € übersteigt, muss auch die UID-Nummer des Kunden enthalten sein.", true, "Antwort laut Skript."],
    ["Nur der Betrag", false, "Zu wenig."],
    ["Nur Name des Kunden und Unterschrift", false, "Zu wenig."],
    ["Fahrtziel und Kilometerstand", false, "Falsch."],
  ], "1) Name und Anschrift des Unternehmens\n2) Datum\n3) Warenmenge, Bezeichnung, Preis\n4) Steuersatz\n5) Stempel und Unterschrift\n6) Wenn der Betrag höher als 400 € beträgt, müssen folgende Punkte enthalten sein:\n7) Name und Anschrift des Kunden\n8) UID-Nummer\n9) Rechnungsnummer\n10) Mehrwertsteuer (Netto, Steuersatz, Brutto)\n11) Auf der Rechnung ist ein QR-Code anzubringen.\n12) Wenn der Betrag 10.000 € übersteigt, muss auch die UID-Nummer des Kunden enthalten sein."),
  mc("27", E, "MEDIUM", "Fragen zur Einkommensteuer (Wann ist es fällig)?", [
    ["1) Das Finanzamt kann zusätzliche Infos von den Steuerpflichtigen holen.\n2) Die Einkommensteuer des Jahres ist mit Einkommensteuerbescheid festgesetzt.\n3) Termine für Einkommensteuer-Vorauszahlung sind:\n4) 15. Februar\n5) 15. Mai\n6) 15. August\n7) 15. November\n8) Die Bilanz-Erklärung bis Abgabefrist 30. April abgeben, FinanzOnline bis 30. Juni. Man kann die Abgabefrist durch ein begründetes Ansuchen verlängern.\n9) Einkommensteuer-Abschlusszahlung ist innerhalb 1 Monat zu zahlen", true, "Antwort laut Skript."],
    ["Monatlich am 1., Erklärung bis 31. Jänner", false, "Falsch."],
    ["Einmal am 31. Dezember", false, "Falsch."],
    ["15. Jänner, 15. April, 15. Juli, 15. Oktober", false, "Falsche Termine."],
  ], "1) Das Finanzamt kann zusätzliche Infos von den Steuerpflichtigen holen.\n2) Die Einkommensteuer des Jahres ist mit Einkommensteuerbescheid festgesetzt.\n3) Termine für Einkommensteuer-Vorauszahlung sind:\n4) 15. Februar\n5) 15. Mai\n6) 15. August\n7) 15. November\n8) Die Bilanz-Erklärung bis Abgabefrist 30. April abgeben, FinanzOnline bis 30. Juni. Man kann die Abgabefrist durch ein begründetes Ansuchen verlängern.\n9) Einkommensteuer-Abschlusszahlung ist innerhalb 1 Monat zu zahlen"),
  mc("28", E, "EASY", "Kilometerabhängige Kosten?", [
    ["1) Reparaturkosten pro Jahr\n2) Reifengarniturkosten\n3) Treibstoffkosten\n4) Mautgebühren", true, "Antwort laut Skript."],
    ["Kasko- und Haftpflichtversicherung", false, "Zeitabhängig."],
    ["Fremdkapitalzinsen", false, "Zeitabhängig."],
    ["Abstellplatz und Mobiltelefon", false, "Zeitabhängig."],
  ], "1) Reparaturkosten pro Jahr\n2) Reifengarniturkosten\n3) Treibstoffkosten\n4) Mautgebühren"),
  mc("29", E, "EASY", "Zeitabhängige Fahrzeugkosten?", [
    ["1) Fahrzeuganschaffungswert\n2) Kasko / Haftpflichtversicherung oder Teilkasko\n3) Fremdkapitalzinsen\n4) Abschreibung pro Jahr\n5) Sonstige Kosten: z. B. Kosten für Kommunikationseinrichtungen, Mobiltelefon, Abstellplatz", true, "Antwort laut Skript."],
    ["Treibstoff, Reifen, Maut", false, "Kilometerabhängig."],
    ["Nur Treibstoff", false, "Kilometerabhängig."],
    ["Reparaturen pro Kilometer", false, "Kilometerabhängig."],
  ], "1) Fahrzeuganschaffungswert\n2) Kasko / Haftpflichtversicherung oder Teilkasko\n3) Fremdkapitalzinsen\n4) Abschreibung pro Jahr\n5) Sonstige Kosten: z. B. Kosten für Kommunikationseinrichtungen, Mobiltelefon, Abstellplatz"),
  mc("30", T, "MEDIUM", "Zuschlag zum Dienstgeberbeitrag = DB?", [
    ["Mitglieder der Wirtschaftskammer haben in der Regel die Kammerumlage 1 an das Finanzamt abzuführen, wenn die im Inland erzielten steuerbaren Nettoumsätze in einem Kalenderjahr.\nFür Unternehmen mit einem Nettojahresumsatz über € 150.000,-", true, "Antwort laut Skript."],
    ["Nur Arbeitnehmer zahlen ihn an die ÖGK", false, "Falsch."],
    ["Er gilt ab dem ersten Euro Umsatz", false, "Falsch."],
    ["Er wird an die Gemeinde gezahlt", false, "Falsch."],
  ], "Mitglieder der Wirtschaftskammer haben in der Regel die Kammerumlage 1 an das Finanzamt abzuführen, wenn die im Inland erzielten steuerbaren Nettoumsätze in einem Kalenderjahr.\nFür Unternehmen mit einem Nettojahresumsatz über € 150.000,-"),
  mc("31", T, "MEDIUM", "Was bedeutet Grundumlage?", [
    ["Die Grundumlage wird jährlich von der zuständigen Fachgruppe im Falle einer Fachvertretung vom jeweiligen Fachverband der Wirtschaftskammer beschlossen. Sie wird auf Grundlage einer allgemein feststellbaren Bemessungsgrundlage festgesetzt und ist von jedem Unternehmen zu entrichten.", true, "Antwort laut Skript."],
    ["Eine Steuer an das Finanzamt für Grundstücke", false, "Falsch."],
    ["Ein Beitrag der Arbeitnehmer an die Gewerkschaft", false, "Falsch."],
    ["Die Miete für den Taxistandplatz", false, "Falsch."],
  ], "Die Grundumlage wird jährlich von der zuständigen Fachgruppe im Falle einer Fachvertretung vom jeweiligen Fachverband der Wirtschaftskammer beschlossen. Sie wird auf Grundlage einer allgemein feststellbaren Bemessungsgrundlage festgesetzt und ist von jedem Unternehmen zu entrichten."),
  mc("32", T, "MEDIUM", "Was bedeutet Hauptbuch?", [
    ["Im Hauptbuch werden alle Sachkonten aus den im Grundbuch angesprochenen Buchungen übertragen. Deshalb sind die Grundbücher die Vorlage dafür. Hauptbuch heißt eines der im Rahmen der Buchführung geführten Bücher. Es enthält entsprechend dem Kontenplan des Unternehmens sämtliche Konten der Geschäftsbuchführung, in die die Geschäftsvorfälle sachlich und systematisch gebucht werden. Der Abschluss der Hauptbuchkonten führt zur Schlussbilanz sowie zur Gewinn- und Verlustrechnung eines Geschäftsjahres.", true, "Antwort laut Skript."],
    ["Das Buch mit allen Fahrgastnamen", false, "Falsch."],
    ["Das Kassabuch", false, "Das ist ein Nebenbuch."],
    ["Das Gesetzbuch für Unternehmer", false, "Falsch."],
  ], "Im Hauptbuch werden alle Sachkonten aus den im Grundbuch angesprochenen Buchungen übertragen. Deshalb sind die Grundbücher die Vorlage dafür. Hauptbuch heißt eines der im Rahmen der Buchführung geführten Bücher. Es enthält entsprechend dem Kontenplan des Unternehmens sämtliche Konten der Geschäftsbuchführung, in die die Geschäftsvorfälle sachlich und systematisch gebucht werden. Der Abschluss der Hauptbuchkonten führt zur Schlussbilanz sowie zur Gewinn- und Verlustrechnung eines Geschäftsjahres."),
  mc("33", T, "EASY", "Was heißt eigentlich Doppik?", [
    ["Doppik ist die Abkürzung von doppelter Buchführung. Bilanz", true, "Antwort laut Skript."],
    ["Doppelte Kontrolle durch das Finanzamt", false, "Falsch."],
    ["Doppelter Umsatz", false, "Falsch."],
    ["Doppeltes Kassabuch", false, "Falsch."],
  ], "Doppik ist die Abkürzung von doppelter Buchführung. Bilanz"),
  mc("34", E, "EASY", "Was bedeutet Eigenverbrauch?", [
    ["Wenn ein Unternehmer Gegenstände oder Leistungen aus seinem Betrieb für private Zwecke entnimmt, „Eigenverbrauch“. Eine solche Entnahme für den Eigenbedarf kommt als Privatanteil in vielen Fällen vor. Privatnutzung des Firmenwagens, Privatanteil bei Telefonkosten", true, "Antwort laut Skript."],
    ["Treibstoffverbrauch bei Fahrten mit Fahrgästen", false, "Betrieblich."],
    ["Der Stromverbrauch im Büro", false, "Betrieblich."],
    ["Der Verbrauch von Material in der Werkstatt", false, "Betrieblich."],
  ], "Wenn ein Unternehmer Gegenstände oder Leistungen aus seinem Betrieb für private Zwecke entnimmt, „Eigenverbrauch“. Eine solche Entnahme für den Eigenbedarf kommt als Privatanteil in vielen Fällen vor. Privatnutzung des Firmenwagens, Privatanteil bei Telefonkosten"),
  mc("35", T, "MEDIUM", "Was ist ein Journal Buchführung?", [
    ["Ein wichtiger Bestandteil der Buchhaltung ist das Journal. Es wird auch als Grundbuch oder Tagebuch bezeichnet. Im Journal muss der Unternehmer all seine Geschäftsvorfälle in chronologischer, zeitlicher Reihenfolge mit einer fortlaufenden Nummer, dem Datum, dem Betrag und einem Verweis auf einen Beleg dokumentieren.", true, "Antwort laut Skript."],
    ["Eine Zeitschrift für Unternehmer", false, "Falsch."],
    ["Das Buch mit den Sachkonten", false, "Das ist das Hauptbuch."],
    ["Eine Liste der Mitarbeiter", false, "Falsch."],
  ], "Ein wichtiger Bestandteil der Buchhaltung ist das Journal. Es wird auch als Grundbuch oder Tagebuch bezeichnet. Im Journal muss der Unternehmer all seine Geschäftsvorfälle in chronologischer, zeitlicher Reihenfolge mit einer fortlaufenden Nummer, dem Datum, dem Betrag und einem Verweis auf einen Beleg dokumentieren."),
  mc("36", B, "EASY", "Was bedeutet Kassenbuch?", [
    ["Ein Kassenbuch ist die laufende Aufzeichnung aller Bareinnahmen und Barausgaben eines Unternehmens. In der Regel werden jährlich 12 Kassenbücher (monatlich eines) geführt. Es dient als Grundlage für den Jahresabschluss und die Versteuerung des Einkommens.", true, "Antwort laut Skript."],
    ["Ein Buch nur für Bankeinzahlungen", false, "Falsch."],
    ["Ein Buch, das einmal in 5 Jahren geführt wird", false, "Falsch."],
    ["Die Liste aller Kreditkarten", false, "Falsch."],
  ], "Ein Kassenbuch ist die laufende Aufzeichnung aller Bareinnahmen und Barausgaben eines Unternehmens. In der Regel werden jährlich 12 Kassenbücher (monatlich eines) geführt. Es dient als Grundlage für den Jahresabschluss und die Versteuerung des Einkommens."),
  mc("37", T, "MEDIUM", "Was ist der Unterschied zwischen Hauptbuch und Nebenbuch?", [
    ["1) Doppik ist eine Abkürzung und steht für doppelte Buchführung in den Konten „Soll und Haben“\n2) Die Buchung auf Konten erfordert die Führung von entsprechenden Büchern. Darunter fällt das Hauptbuch, das Grundbuch - Journal und die Nebenbücher z. B. Kassabuch", true, "Antwort laut Skript."],
    ["Es gibt keinen Unterschied", false, "Falsch."],
    ["Das Nebenbuch ersetzt die Bilanz", false, "Falsch."],
    ["Das Hauptbuch ist nur für Kleinunternehmer", false, "Falsch."],
  ], "1) Doppik ist eine Abkürzung und steht für doppelte Buchführung in den Konten „Soll und Haben“\n2) Die Buchung auf Konten erfordert die Führung von entsprechenden Büchern. Darunter fällt das Hauptbuch, das Grundbuch - Journal und die Nebenbücher z. B. Kassabuch"),
  mc("38", B, "EASY", "Was bedeutet Rechnungspflicht?", [
    ["Eine Rechnung oder Faktura ist ein Dokument, in dem ein Unternehmer seinen Kunden über das aufgrund des Kaufvertrags fällige Entgelt informiert. Fakturierung nennt man den Vorgang der Ausstellung der Rechnung und der Zusendung an den Kunden. In einer Rechnung werden Lieferungen oder sonstige Leistungen an einen Kunden abgerechnet.", true, "Antwort laut Skript."],
    ["Die Pflicht, jeden Tag die Kasse zu zählen", false, "Falsch."],
    ["Die Pflicht, Rechnungen nur bar zu bezahlen", false, "Falsch."],
    ["Die Pflicht, Rechnungen nicht aufzubewahren", false, "Falsch."],
  ], "Eine Rechnung oder Faktura ist ein Dokument, in dem ein Unternehmer seinen Kunden über das aufgrund des Kaufvertrags fällige Entgelt informiert. Fakturierung nennt man den Vorgang der Ausstellung der Rechnung und der Zusendung an den Kunden. In einer Rechnung werden Lieferungen oder sonstige Leistungen an einen Kunden abgerechnet."),
  mc("39", B, "MEDIUM", "Was ist Barcode?", [
    ["Barcode bedeutet eine elektronische Signatur. Barcode QCR bietet mit der digitalen Signatur von PDF-Dokumenten die Möglichkeit, die Dokumente mit einem Siegel zu versehen.", true, "Antwort laut Skript."],
    ["Ein Rabattcode für Fahrgäste", false, "Falsch."],
    ["Die Steuernummer in Klartext", false, "Falsch."],
    ["Eine Werbefläche auf der Rechnung", false, "Falsch."],
  ], "Barcode bedeutet eine elektronische Signatur. Barcode QCR bietet mit der digitalen Signatur von PDF-Dokumenten die Möglichkeit, die Dokumente mit einem Siegel zu versehen."),
  mc("40", E, "MEDIUM", "Welche Vorteile hat man als Kleinunternehmer?", [
    ["1) Die Kleinunternehmerregelung ermöglicht es Unternehmen mit nur geringen Umsätzen, dass sie für ihre erbrachten Leistungen keine Umsatzsteuer in Rechnung stellen müssen.\n2) Das bringt zahlreiche Vorteile, jedoch auch den Nachteil, dass es für Eingangsrechnungen mit Umsatzsteuerausweis keine Vorsteuererstattung gibt.", true, "Antwort laut Skript."],
    ["Man muss doppelte Umsatzsteuer verrechnen", false, "Falsch."],
    ["Man bekommt immer die Vorsteuer zurück", false, "Gerade nicht."],
    ["Man braucht keine Gewerbeberechtigung", false, "Falsch."],
  ], "1) Die Kleinunternehmerregelung ermöglicht es Unternehmen mit nur geringen Umsätzen, dass sie für ihre erbrachten Leistungen keine Umsatzsteuer in Rechnung stellen müssen.\n2) Das bringt zahlreiche Vorteile, jedoch auch den Nachteil, dass es für Eingangsrechnungen mit Umsatzsteuerausweis keine Vorsteuererstattung gibt."),
  mc("41", E, "EASY", "Was ist eine UID-Nummer? Was wissen Sie über die UID-Nummer?", [
    ["Die Umsatzsteuer-Identifikationsnummer UID-Nummer ist eine spezielle Steuernummer, die der Identifikation des Unternehmens dient. Bei betrieblichen Einkäufen im EU-Ausland wird bei Angabe der UID-Nummer die ausländische Umsatzsteuer in Abzug gebracht.", true, "Antwort laut Skript."],
    ["Die Sozialversicherungsnummer", false, "Falsch."],
    ["Die Firmenbuchnummer", false, "Falsch."],
    ["Die Taxi-Konzessionsnummer", false, "Falsch."],
  ], "Die Umsatzsteuer-Identifikationsnummer UID-Nummer ist eine spezielle Steuernummer, die der Identifikation des Unternehmens dient. Bei betrieblichen Einkäufen im EU-Ausland wird bei Angabe der UID-Nummer die ausländische Umsatzsteuer in Abzug gebracht."),
  mc("42", T, "EASY", "Bilanz ist des Vermögens und der Schulden zum Bilanzstichtag (01.01.2025 bis 31.12.2025)?", [
    ["Vermögen (Aktiv) (Investition):\n- Anlagevermögen\n- Umlaufvermögen\n= SUMME GESAMTVERMÖGEN\nKapital (Passiv):\n- Eigenkapital (EK)\n- Fremdkapital (LFK + KFK)\n= SUMME GESAMTKAPITAL", true, "Antwort laut Skript."],
    ["Aktiv: Eigenkapital – Passiv: Anlagevermögen", false, "Vertauscht."],
    ["Aktiv: Erlöse – Passiv: Aufwände", false, "Das ist die GuV."],
    ["Nur eine Liste der Schulden", false, "Falsch."],
  ], "Vermögen (Aktiv) (Investition):\n- Anlagevermögen\n- Umlaufvermögen\n= SUMME GESAMTVERMÖGEN\nKapital (Passiv):\n- Eigenkapital (EK)\n- Fremdkapital (LFK + KFK)\n= SUMME GESAMTKAPITAL"),
  mc("43", T, "MEDIUM", "Saldenliste per 31.12.2025 Bilanz?", [
    ["Soll – Vermögen, Aktiva-Seite:\nAnlagevermögen: Fuhrpark (Parkplatz), Grundstücke, Geschäftseinrichtung, Maschinen, Langfristige Wertpapiere = Summe Anlagevermögen\nUmlaufvermögen: Materialvorrat, Bargeld/Kassa, Kundenforderungen, Bankguthaben = Summe Umlaufvermögen\nHaben – Kapital (Schulden), Passiva-Seite:\nEigenkapital\nLangfristiges Fremdkapital: Darlehen, Hypothekarkredit\nKurzfristiges Fremdkapital: Rückstellung, Verbindlichkeit ÖGK, Verbindlichkeit Finanzamt, Lieferantenverbindlichkeit, Banküberziehungskredit, Kontokorrentkredit (KKK-Kredit), Steuerberaterschulden = Summe Kapital/Schulden\nGewinn- und Verlustrechnung:\nSoll – Aufwand/Aufwendungen: Zinsaufwand, Sozialversicherung, Gas, Miete, Reparatur/Instandhaltung, Löhne, Materialeinsatz, Beratungskosten\nHaben – Ertrag/Erträge/Umsatz: Erlöse, Einnahmen", true, "Antwort laut Skript."],
    ["Soll: Eigenkapital und Darlehen – Haben: Kassa und Bankguthaben", false, "Vertauscht."],
    ["Soll: Erlöse und Einnahmen – Haben: Zinsaufwand und Löhne", false, "Das ist die GuV – und vertauscht."],
    ["Alle Konten stehen auf der Haben-Seite", false, "Falsch."],
  ], "Soll – Vermögen, Aktiva-Seite:\nAnlagevermögen: Fuhrpark (Parkplatz), Grundstücke, Geschäftseinrichtung, Maschinen, Langfristige Wertpapiere = Summe Anlagevermögen\nUmlaufvermögen: Materialvorrat, Bargeld/Kassa, Kundenforderungen, Bankguthaben = Summe Umlaufvermögen\nHaben – Kapital (Schulden), Passiva-Seite:\nEigenkapital\nLangfristiges Fremdkapital: Darlehen, Hypothekarkredit\nKurzfristiges Fremdkapital: Rückstellung, Verbindlichkeit ÖGK, Verbindlichkeit Finanzamt, Lieferantenverbindlichkeit, Banküberziehungskredit, Kontokorrentkredit (KKK-Kredit), Steuerberaterschulden = Summe Kapital/Schulden\nGewinn- und Verlustrechnung:\nSoll – Aufwand/Aufwendungen: Zinsaufwand, Sozialversicherung, Gas, Miete, Reparatur/Instandhaltung, Löhne, Materialeinsatz, Beratungskosten\nHaben – Ertrag/Erträge/Umsatz: Erlöse, Einnahmen"),
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
  oral(1, "Welche 4 Teilgebiete des Rechnungswesens sind?", "Chronologisch und systematisch durchgeführt werden:\n1) Buchführung, Geschäftsaufzeichnung\n2) Einnahmen - Ausgaben - Rechnung\n3) Doppelte Buchhaltung (Bilanz)\n4) Pauschalierung\na) Kostenrechnung\nb) Statistik\nc) Planungsrechnung und Finanzierung", ["Buchführung / Geschäftsaufzeichnung", "Kostenrechnung", "Statistik", "Planungsrechnung und Finanzierung"]),
  oral(2, "Welche Formvorschriften gelten in Österreich für die Buchführung? Mindestens 7 Punkte aufzählen:", "1) Alle Firmen Bücher im Inland zu führen\n2) Alle Unterlagen müssen 7 Jahre aufbewahrt werden\n3) Keine radierbaren Mittel verwenden\n4) Keine leeren Zwischenräume\n5) Die Eintragung chronologisch, zeitgerecht, richtig und vollständig führen\n6) Die Überprüfung muss jederzeit möglich sein\n7) Seiten fortlaufend nummerieren\n8) In deutscher Sprache führen, ansonsten eine beglaubigte Übersetzung", ["Im Inland führen", "7 Jahre aufbewahren", "Keine radierbaren Mittel / keine leeren Zwischenräume", "Chronologisch, zeitgerecht, richtig, vollständig", ["Seiten fortlaufend nummerieren, deutsche Sprache", false]], "HARD"),
  oral(3, "Was bedeutet Beleggrundsätze?", "1) Keine Buchung ohne Beleg\n2) Belege sind Dokumente, man darf sie nicht verändern oder unleserlich machen\n3) Die Änderungen muss man eindeutig kennzeichnen.\n4) Wenn die Belegbearbeitung unordentlich ist, dann gibt es keine Glaubwürdigkeit", ["Keine Buchung ohne Beleg", "Belege nicht verändern oder unleserlich machen", ["Änderungen eindeutig kennzeichnen", false]], "EASY"),
  oral(4, "Arten von Belegen?", "1) Eingangsrechnung (ER)\n2) Ausgangsrechnung (AR)\n3) Eingangsgutschrift (EG)\n4) Ausgangsgutschrift (AG)\n5) Kassabeleg\n6) Ersatzbeleg\n7) Bankbeleg", ["Eingangs- und Ausgangsrechnung", "Eingangs- und Ausgangsgutschrift", "Kassabeleg", ["Ersatzbeleg, Bankbeleg", false]]),
  oral(5, "Wann entsteht die Steuerschuld?", "Mit Ablauf des Kalendermonats", ["Mit Ablauf des Kalendermonats"], "EASY"),
  oral(6, "Wann ist die Fälligkeit der USt-Zahllast?", "15. des zweitfolgenden Kalendermonats (1 Monat + 15 Tage)", ["15. des zweitfolgenden Kalendermonats"], "EASY"),
  oral(7, "Erklären Sie die Ermittlung der Tageslosung?", "Bei der rechnerischen Ermittlung der Tageslosung wird das Geld in der Kasse täglich nach Geschäftsschluss ausgezählt. Im Zählprotokoll werden Stück für Stück für jede Münze und für jeden Geldschein die Anzahl und der Betrag eingetragen, was schlussendlich einen Gesamtbetrag für den aktuellen Kassenbestand ergibt.\nEs gibt 2 Methoden der Tageslosungsermittlung:\nIndirekte Methode (Taxi):\nBargeld bei Geschäftsschluss\n+ Barausgänge des Tages\n= Zwischensumme\n- Bargeldbestand am Geschäftsbeginn\n- sonstige Eingänge z. B. Mieteinnahmen\n= Tageslosung\nDirekte Methode: entweder Registrierkasse oder Scanner-Kassa", ["Täglich nach Geschäftsschluss zählen (Zählprotokoll)", "Indirekte Methode: Endbestand + Barausgänge − Anfangsbestand − sonstige Eingänge", "Direkte Methode: Registrierkasse/Scannerkassa"], "HARD"),
  oral(8, "Einnahmen - Ausgaben - Rechnung?", "Erfolgsermittlung der Einnahmen - Ausgaben:\n+ Betriebseinnahmen\n- Betriebsausgaben\n= Überschuss oder Unterschuss\n- Abschreibungen (AFA) wird später berücksichtigt\nGewinn oder Verlust: Besteuerungsbasis", ["Betriebseinnahmen minus Betriebsausgaben", "Überschuss oder Unterschuss", ["AfA wird abgezogen → Gewinn/Verlust", false]]),
  oral(9, "Aufzeichnungspflicht?", "1) Aufzeichnung für Einnahmen, Ausgaben und Eigenverbrauch\n2) Anlagenverzeichnis (AFA)\n3) Lohnkonten - ÖGK-SV\n4) Nur die Aufzeichnung der Betriebseinnahmen und Betriebsausgaben", ["Einnahmen, Ausgaben und Eigenverbrauch", "Anlagenverzeichnis", "Lohnkonten"]),
  oral(10, "Was fällt nicht unter die Betriebsausgaben?", "1) Kreditrückzahlung → NEIN: keine Betriebsausgaben\n2) Privatentnahme → NEIN: keine Betriebsausgaben\n3) Einkommensteuerzahlungen → NEIN: keine Betriebsausgaben\n4) Ausgaben für Investitionen → NEIN: keine Betriebsausgaben\n5) Privateinlage → NEIN: keine Betriebseinnahmen", ["Kreditrückzahlung", "Privatentnahme", "Einkommensteuerzahlungen", ["Investitionen (nur über AfA)", false]]),
  oral(11, "Kleinunternehmer?", "1) Jahresnettoumsatz bis 55.000 €\n2) Keine Umsatzsteuer in der Rechnung\n3) Kein Vorsteuerabzug (VST)\n4) Kleinunternehmen ist keine Gesellschaft (Sehr wichtig)", ["Jahresnettoumsatz bis 55.000 €", "Keine Umsatzsteuer in der Rechnung", "Kein Vorsteuerabzug"]),
  oral(12, "Was bedeutet Buchführung?", "Der Begriff Buchhaltung bezeichnet die Abteilung im Unternehmen, die sich mit der Buchführung befasst.", ["Abteilung, die sich mit der Buchführung befasst"], "EASY"),
  oral(13, "Welche Buchführungsgrenze kennen Sie?", "2 × 700.000 € Nettoumsatz oder über 1.000.000 € Nettoumsatz in einem Jahr", ["2 × 700.000 € Nettoumsatz", "Über 1.000.000 € in einem Jahr"]),
  oral(14, "Was heißt Abschreibung (AFA)?", "Absetzung für Abnutzung. Verteilung der Anschaffungswert durch die voraussichtliche Nutzungsdauer und absetzen (Sehr wichtig)", ["Absetzung für Abnutzung", "Anschaffungswert auf Nutzungsdauer verteilen"], "EASY"),
  oral(15, "Was versteht man unter geringwertige Wirtschaftsgüter (GWG) und welche Bedeutung haben sie für die AFA?", "Wenn der Nettopreis bis 1.000 € beträgt (GWG - Geringwertige Wirtschaftsgüter)", ["Nettopreis bis 1.000 €", ["Sofort absetzbar", false]]),
  oral(16, "Was ist ein Anlagegut?", "1) Über 1.000 € Netto Anlagegut (ab 2023 1.000 € Netto)\n2) Anlagegut soll mindestens 1 Jahr im Betrieb bleiben\n3) Mindestens 80 % für Betriebszweck", ["Über 1.000 € netto", "Mindestens 1 Jahr im Betrieb", ["Mindestens 80 % betrieblich", false]]),
  oral(17, "Erklären Sie die AFA?", "Wenn ein Wirtschaftsgut einen Anschaffungswert über 1.000 € Netto hat, muss dieser langfristig über eine Nutzungsdauer abgeschrieben werden. Die Afa beginnt nach Aktivierung im Anlagenverzeichnis. Inbetriebnahme Datum (Sehr wichtig)", ["Über 1.000 € netto über die Nutzungsdauer abschreiben", "Beginn nach Aktivierung im Anlagenverzeichnis / Inbetriebnahme"]),
  oral(18, "Wie rechnet man die Afa?", "Anschaffungswert (AW) / Nutzungsdauer (ND)", ["Anschaffungswert ÷ Nutzungsdauer"], "EASY"),
  oral(19, "Wann ist AFA-Stichtag?", "01. Januar 2025 bis 30. Juni 2025 wird die volle Afa\n01. Juli 2025 bis 31. Dezember 2025 wird die halbe Afa", ["Erstes Halbjahr: volle AfA", "Zweites Halbjahr: halbe AfA"]),
  oral(20, "Dafür braucht man ein Anlagenverzeichnis (Anlagekartei) (AFA)?", "1) Laufende Nummer (LFN)\n2) Vermögensart\n3) Inbetriebnahme, Datum und Anschaffungswert\n4) Lieferant (Name und Adresse)\n5) Anschaffungswert (AW)\n6) Nutzungsdauer (ND)\n7) Afa\n8) Restwert Buchwert (RW)", ["Anschaffungswert und Inbetriebnahmedatum", "Nutzungsdauer und AfA", "Restwert/Buchwert", ["Laufende Nummer, Vermögensart, Lieferant", false]], "HARD"),
  oral(21, "Telebanking: Was bedeutet der Begriff Telebanking?", "1) Telebanking bietet eine große Erleichterung im Bankverkehr. Man kann heutzutage die Überweisungen per Internet erledigen. Die Vorteile sind:\n2) Man spart sich den Bankweg bei Überweisungen, Ausfüllen von Formularen und die Kosten für Drucksorten\n3) Man hat 24 Std. lang Zugriff\n4) Man kann jederzeit Informationen holen und den Kontostand kontrollieren\n5) Sicherheit durch persönlichen Code", ["Überweisungen per Internet", "24 Stunden Zugriff / Kontostand jederzeit", ["Sicherheit durch persönlichen Code", false]], "EASY"),
  oral(22, "Ermittlung des Gewinns bei Pauschalierung?", "1) Umsatz Netto\n2) Wareneinkauf Netto\n3) Personalausgaben\n4) Werkshonorar für die Leistungserstellung", ["Umsatz netto", "Wareneinkauf netto", "Personalausgaben", ["Werkshonorar", false]]),
  oral(23, "Was bedeutet Pauschalierung?", "Voraussetzungen für die Inanspruchnahme der Pauschalierung sind:\n1) Es besteht keine Buchführungspflicht.\n2) Umsatz des Vorjahres max. Netto 220.000 €\n3) Ausgabenpauschale 6 % oder 12 %\n4) Man darf einmal in 5 Jahren die Grenze um 15 % überschreiten\n- 12 % Betriebsausgabenpauschale vom Nettoumsatz\n= der zu versteuernde Gewinn", ["Keine Buchführungspflicht", "Umsatzgrenze Vorjahr (220.000 € netto laut Skript)", "Ausgabenpauschale 6 % oder 12 %"], "HARD"),
  oral(24, "Welche Bücher und Aufzeichnungen müssen in der Buchhaltung in einem Unternehmen geführt werden?", "1) Journal (Grundbuch)\n2) Hauptbuch\n3) Nebenbücher (Kassabuch)\n4) Hilfsbücher (Provision)", ["Journal (Grundbuch)", "Hauptbuch", "Nebenbücher (Kassabuch)", ["Hilfsbücher", false]]),
  oral(25, "Welche Steuern müssen Unternehmer bezahlen?", "Die Rechtsform eines Unternehmens bestimmt, ob Einkommen- oder Körperschaftsteuer fällig wird. Einkommensteuer zahlen natürliche Personen, juristische Personen (GesmbH, AG) Körperschaftsteuer.\n1) Personengesellschaften KG, OG, Einzelunternehmen zahlen: Einkommensteuer\n2) Kapitalgesellschaften GesmbH, AG zahlen: Körperschaftsteuer", ["Einzelunternehmen/OG/KG: Einkommensteuer", "GmbH/AG: Körperschaftsteuer"]),
  oral(26, "Was muss auf einer Rechnung enthalten sein?", "1) Name und Anschrift des Unternehmens\n2) Datum\n3) Warenmenge, Bezeichnung, Preis\n4) Steuersatz\n5) Stempel und Unterschrift\n6) Wenn der Betrag höher als 400 € beträgt, müssen folgende Punkte enthalten sein:\n7) Name und Anschrift des Kunden\n8) UID-Nummer\n9) Rechnungsnummer\n10) Mehrwertsteuer (Netto, Steuersatz, Brutto)\n11) Auf der Rechnung ist ein QR-Code anzubringen.\n12) Wenn der Betrag 10.000 € übersteigt, muss auch die UID-Nummer des Kunden enthalten sein.", ["Name/Anschrift des Unternehmens, Datum", "Menge, Bezeichnung, Preis, Steuersatz", "Über 400 €: Kundendaten, UID, Rechnungsnummer", ["Über 10.000 €: UID des Kunden", false]], "HARD"),
  oral(27, "Fragen zur Einkommensteuer (Wann ist es fällig)?", "1) Das Finanzamt kann zusätzliche Infos von den Steuerpflichtigen holen.\n2) Die Einkommensteuer des Jahres ist mit Einkommensteuerbescheid festgesetzt.\n3) Termine für Einkommensteuer-Vorauszahlung sind:\n4) 15. Februar\n5) 15. Mai\n6) 15. August\n7) 15. November\n8) Die Bilanz-Erklärung bis Abgabefrist 30. April abgeben, FinanzOnline bis 30. Juni. Man kann die Abgabefrist durch ein begründetes Ansuchen verlängern.\n9) Einkommensteuer-Abschlusszahlung ist innerhalb 1 Monat zu zahlen", ["Vorauszahlungen 15.2., 15.5., 15.8., 15.11.", "Abgabe 30. April / FinanzOnline 30. Juni", ["Abschlusszahlung innerhalb 1 Monat", false]], "HARD"),
  oral(28, "Kilometerabhängige Kosten?", "1) Reparaturkosten pro Jahr\n2) Reifengarniturkosten\n3) Treibstoffkosten\n4) Mautgebühren", ["Treibstoff", "Reifen", "Reparaturen", ["Maut", false]], "EASY"),
  oral(29, "Zeitabhängige Fahrzeugkosten?", "1) Fahrzeuganschaffungswert\n2) Kasko / Haftpflichtversicherung oder Teilkasko\n3) Fremdkapitalzinsen\n4) Abschreibung pro Jahr\n5) Sonstige Kosten: z. B. Kosten für Kommunikationseinrichtungen, Mobiltelefon, Abstellplatz", ["Versicherung (Kasko/Haftpflicht)", "Abschreibung pro Jahr", ["Fremdkapitalzinsen, Abstellplatz, Telefon", false]]),
  oral(30, "Zuschlag zum Dienstgeberbeitrag = DB?", "Mitglieder der Wirtschaftskammer haben in der Regel die Kammerumlage 1 an das Finanzamt abzuführen, wenn die im Inland erzielten steuerbaren Nettoumsätze in einem Kalenderjahr.\nFür Unternehmen mit einem Nettojahresumsatz über € 150.000,-", ["An das Finanzamt abzuführen", "Ab Nettojahresumsatz über 150.000 €"]),
  oral(31, "Was bedeutet Grundumlage?", "Die Grundumlage wird jährlich von der zuständigen Fachgruppe im Falle einer Fachvertretung vom jeweiligen Fachverband der Wirtschaftskammer beschlossen. Sie wird auf Grundlage einer allgemein feststellbaren Bemessungsgrundlage festgesetzt und ist von jedem Unternehmen zu entrichten.", ["Von Fachgruppe/Fachverband der WKO beschlossen", "Jedes Unternehmen zahlt"]),
  oral(32, "Was bedeutet Hauptbuch?", "Im Hauptbuch werden alle Sachkonten aus den im Grundbuch angesprochenen Buchungen übertragen. Deshalb sind die Grundbücher die Vorlage dafür. Hauptbuch heißt eines der im Rahmen der Buchführung geführten Bücher. Es enthält entsprechend dem Kontenplan des Unternehmens sämtliche Konten der Geschäftsbuchführung, in die die Geschäftsvorfälle sachlich und systematisch gebucht werden. Der Abschluss der Hauptbuchkonten führt zur Schlussbilanz sowie zur Gewinn- und Verlustrechnung eines Geschäftsjahres.", ["Sachkonten aus dem Grundbuch", "Abschluss führt zu Schlussbilanz und GuV"]),
  oral(33, "Was heißt eigentlich Doppik?", "Doppik ist die Abkürzung von doppelter Buchführung. Bilanz", ["Doppelte Buchführung"], "EASY"),
  oral(34, "Was bedeutet Eigenverbrauch?", "Wenn ein Unternehmer Gegenstände oder Leistungen aus seinem Betrieb für private Zwecke entnimmt, „Eigenverbrauch“. Eine solche Entnahme für den Eigenbedarf kommt als Privatanteil in vielen Fällen vor. Privatnutzung des Firmenwagens, Privatanteil bei Telefonkosten", ["Entnahme aus dem Betrieb für private Zwecke", ["Beispiel: Firmenwagen, Telefon", false]], "EASY"),
  oral(35, "Was ist ein Journal Buchführung?", "Ein wichtiger Bestandteil der Buchhaltung ist das Journal. Es wird auch als Grundbuch oder Tagebuch bezeichnet. Im Journal muss der Unternehmer all seine Geschäftsvorfälle in chronologischer, zeitlicher Reihenfolge mit einer fortlaufenden Nummer, dem Datum, dem Betrag und einem Verweis auf einen Beleg dokumentieren.", ["Grundbuch/Tagebuch", "Chronologisch", ["Nummer, Datum, Betrag, Belegverweis", false]]),
  oral(36, "Was bedeutet Kassenbuch?", "Ein Kassenbuch ist die laufende Aufzeichnung aller Bareinnahmen und Barausgaben eines Unternehmens. In der Regel werden jährlich 12 Kassenbücher (monatlich eines) geführt. Es dient als Grundlage für den Jahresabschluss und die Versteuerung des Einkommens.", ["Alle Bareinnahmen und Barausgaben", ["12 pro Jahr (monatlich)", false]], "EASY"),
  oral(37, "Was ist der Unterschied zwischen Hauptbuch und Nebenbuch?", "1) Doppik ist eine Abkürzung und steht für doppelte Buchführung in den Konten „Soll und Haben“\n2) Die Buchung auf Konten erfordert die Führung von entsprechenden Büchern. Darunter fällt das Hauptbuch, das Grundbuch - Journal und die Nebenbücher z. B. Kassabuch", ["Hauptbuch: Sachkonten", "Nebenbuch: z. B. Kassabuch"]),
  oral(38, "Was bedeutet Rechnungspflicht?", "Eine Rechnung oder Faktura ist ein Dokument, in dem ein Unternehmer seinen Kunden über das aufgrund des Kaufvertrags fällige Entgelt informiert. Fakturierung nennt man den Vorgang der Ausstellung der Rechnung und der Zusendung an den Kunden. In einer Rechnung werden Lieferungen oder sonstige Leistungen an einen Kunden abgerechnet.", ["Rechnung informiert über fälliges Entgelt", ["Fakturierung = Ausstellen und Zusenden", false]]),
  oral(39, "Was ist Barcode?", "Barcode bedeutet eine elektronische Signatur. Barcode QCR bietet mit der digitalen Signatur von PDF-Dokumenten die Möglichkeit, die Dokumente mit einem Siegel zu versehen.", ["Elektronische Signatur / Siegel"], "EASY"),
  oral(40, "Welche Vorteile hat man als Kleinunternehmer?", "1) Die Kleinunternehmerregelung ermöglicht es Unternehmen mit nur geringen Umsätzen, dass sie für ihre erbrachten Leistungen keine Umsatzsteuer in Rechnung stellen müssen.\n2) Das bringt zahlreiche Vorteile, jedoch auch den Nachteil, dass es für Eingangsrechnungen mit Umsatzsteuerausweis keine Vorsteuererstattung gibt.", ["Keine Umsatzsteuer in Rechnung", "Keine Vorsteuererstattung"]),
  oral(41, "Was ist eine UID-Nummer? Was wissen Sie über die UID-Nummer?", "Die Umsatzsteuer-Identifikationsnummer UID-Nummer ist eine spezielle Steuernummer, die der Identifikation des Unternehmens dient. Bei betrieblichen Einkäufen im EU-Ausland wird bei Angabe der UID-Nummer die ausländische Umsatzsteuer in Abzug gebracht.", ["Umsatzsteuer-Identifikationsnummer", ["EU-Einkäufe ohne ausländische USt", false]], "EASY"),
  oral(42, "Bilanz ist des Vermögens und der Schulden zum Bilanzstichtag (01.01.2025 bis 31.12.2025)?", "Vermögen (Aktiv) (Investition):\n- Anlagevermögen\n- Umlaufvermögen\n= SUMME GESAMTVERMÖGEN\nKapital (Passiv):\n- Eigenkapital (EK)\n- Fremdkapital (LFK + KFK)\n= SUMME GESAMTKAPITAL", ["Aktiva: Anlage- und Umlaufvermögen", "Passiva: Eigenkapital und Fremdkapital", ["Summen sind gleich", false]]),
  oral(43, "Saldenliste per 31.12.2025 Bilanz?", "Soll – Vermögen, Aktiva-Seite:\nAnlagevermögen: Fuhrpark (Parkplatz), Grundstücke, Geschäftseinrichtung, Maschinen, Langfristige Wertpapiere = Summe Anlagevermögen\nUmlaufvermögen: Materialvorrat, Bargeld/Kassa, Kundenforderungen, Bankguthaben = Summe Umlaufvermögen\nHaben – Kapital (Schulden), Passiva-Seite:\nEigenkapital\nLangfristiges Fremdkapital: Darlehen, Hypothekarkredit\nKurzfristiges Fremdkapital: Rückstellung, Verbindlichkeit ÖGK, Verbindlichkeit Finanzamt, Lieferantenverbindlichkeit, Banküberziehungskredit, Kontokorrentkredit (KKK-Kredit), Steuerberaterschulden = Summe Kapital/Schulden\nGewinn- und Verlustrechnung:\nSoll – Aufwand/Aufwendungen: Zinsaufwand, Sozialversicherung, Gas, Miete, Reparatur/Instandhaltung, Löhne, Materialeinsatz, Beratungskosten\nHaben – Ertrag/Erträge/Umsatz: Erlöse, Einnahmen", ["Anlagevermögen: z. B. Fuhrpark, Grundstücke", "Umlaufvermögen: z. B. Kassa, Forderungen, Bank", "Kurzfristiges FK: z. B. Verbindlichkeiten ÖGK/Finanzamt"], "HARD"),
];
