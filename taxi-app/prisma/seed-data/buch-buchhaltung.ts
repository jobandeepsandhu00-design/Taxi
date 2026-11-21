/**
 * Kapitel 2 „Doppelte Buchhaltung / Buchführung (Bilanz)“ – Fragen 1–20 aus dem Skript, Antworten im Originalwortlaut.
 * Ungeprüft – vor Freigabe gegen die aktuelle Rechtslage prüfen.
 */
import { buildBookChapter, type BookItem } from "./book-helpers";

const items: BookItem[] = [
  {
    nr: 1, topic: "bilanz", difficulty: "MEDIUM",
    q: "Was ist eine Bilanz (einfach erklärt)?",
    a: "Ist ein System, das Vermögen und Kapital sowie Aufwand und Erträge aufzeichnet.\n1) Die Bilanz ist die Gegenüberstellung der Vermögensgegenstände und der Kapitalgegenstände eines Unternehmens zu einem bestimmten Stichtag. Neben der Gewinn- und Verlustrechnung ist die Bilanz Hauptbestandteil eines Jahresabschlusses.\n2) Es gibt eine Saldenliste Bilanz, Gewinn und Verlust Rechnung\n3) Die Geschäftsfälle, die im Unternehmen passieren, sind zu verbuchen (Journal, Hauptbuch)\n4) Betrag, Konto, Gegenkonto",
    wrong: ["Eine Liste aller Kunden und Fahrgäste mit ihren Adressen", "Die monatliche Umsatzsteuervoranmeldung an das Finanzamt", "Die tägliche Abrechnung der Tageslosung im Kassabuch"],
    points: ["Gegenüberstellung der Vermögensgegenstände und Kapitalgegenstände", "Zu einem bestimmten Stichtag", ["Hauptbestandteil des Jahresabschlusses", false]],
  },
  {
    nr: 2, topic: "doppik", difficulty: "MEDIUM",
    q: "Wann wird eine doppelte Buchhaltung geführt?",
    a: "Eine doppelte Buchhaltung ist in Österreich verpflichtet, wenn der Umsatz eines Gewerbebetriebes oder einer selbstständigen Tätigkeit in 2 aufeinanderfolgenden Kalenderjahren jeweils 700.000 € übersteigt. Oder über 1.000.000 €. Kapitalgesellschaften sind unabhängig vom netto Umsatz zur doppelten Buchhaltung verpflichtet.",
    wrong: ["Ab einem Jahresumsatz von 55.000 €", "Nur wenn das Unternehmen mehr als 10 Mitarbeiter hat", "Nur freiwillig – es gibt keine Pflicht"],
    points: ["2 aufeinanderfolgende Kalenderjahre jeweils über 700.000 €", "Oder über 1.000.000 €", "Kapitalgesellschaften unabhängig vom Umsatz"],
  },
  {
    nr: 3, topic: "doppik", difficulty: "MEDIUM",
    q: "Kennzeichen der doppelten Buchhaltung?",
    a: "1) Journal in zeitlicher Reihenfolge chronologisch Grundbuch\n2) Konten im Hauptbuch systematisch\n3) Gewinnermittlung periodisch\n4) Zweifache Erfolgsermittlung",
    wrong: ["Nur ein Kassabuch, keine Konten, Gewinn nach Schätzung", "Einfache Erfolgsermittlung nur über das Bankkonto", "Pauschale Gewinnermittlung mit 12 % vom Umsatz"],
    points: ["Journal chronologisch (Grundbuch)", "Konten im Hauptbuch systematisch", "Zweifache Erfolgsermittlung", ["Gewinnermittlung periodisch", false]],
  },
  {
    nr: 4, topic: "bilanz", difficulty: "EASY",
    q: "Wie rechnet man das Eigenkapital?",
    a: "Gesamt Vermögen - Gesamt Fremdkapital = Eigenkapital",
    wrong: ["Gesamt Vermögen + Gesamt Fremdkapital = Eigenkapital", "Umsatz - Ausgaben = Eigenkapital", "Fremdkapital - Umlaufvermögen = Eigenkapital"],
    points: ["Gesamtvermögen minus Gesamtfremdkapital"],
  },
  {
    nr: 5, topic: "bilanz", difficulty: "MEDIUM",
    q: "Was bedeutet der Begriff Fremdkapital?",
    a: "1) Langfristig (ab 5 Jahre) z. B. Hypothek Grundstück, Darlehen\n2) Kurzfristig (bis 1 Jahr) z. B. Verbindlichkeit ans Finanzamt oder ÖGK, Kontokorrentkredit, Lieferantenverbindlichkeit.\n3) 2-3-4 Jahren sind mittelfristig",
    wrong: ["Geld, das der Unternehmer selbst in den Betrieb einlegt", "Alle Bareinnahmen eines Tages", "Langfristig bis 1 Jahr, kurzfristig ab 5 Jahre"],
    points: ["Langfristig ab 5 Jahre (Hypothek, Darlehen)", "Kurzfristig bis 1 Jahr (Finanzamt, ÖGK, Lieferanten)", ["2-3-4 Jahre mittelfristig", false]],
  },
  {
    nr: 6, topic: "bilanz", difficulty: "MEDIUM",
    q: "Was bedeutet Rückstellung (Rüst)?",
    a: "Ist eine Verpflichtung, es ist unbekannt wann es zu bezahlen ist und wie hoch es ist, z. B.\n1) Steuerberater\n2) Prozesskosten\n3) Anwaltskosten\n4) Beratungskosten",
    wrong: ["Geld, das für den eigenen Urlaub zurückgelegt wird", "Eine Rückzahlung vom Finanzamt", "Eine bekannte Schuld mit fixem Betrag und fixem Datum"],
    points: ["Verpflichtung – unbekannt wann zu bezahlen und wie hoch", ["Beispiele: Steuerberater, Prozesskosten, Anwaltskosten", false]],
  },
  {
    nr: 7, topic: "bilanz", difficulty: "MEDIUM",
    q: "Was bedeutet der Begriff Vermögen?",
    a: "Anlagevermögen wird finanziert durch langfristiges Kapital:\n1) Fuhrpark\n2) Grundstücke\n3) Geschäftseinrichtung\n4) Maschinen\n5) Langfristige Wertpapiere\nUmlaufvermögen wird finanziert durch kurzfristiges Kapital:\n1) Materialvorrat\n2) Bargeld/Kassa\n3) Kundenforderungen\n4) Bankguthaben\n5) Kurzfristige Wertpapiere",
    wrong: ["Anlagevermögen: Bargeld und Bankguthaben; Umlaufvermögen: Grundstücke und Maschinen", "Vermögen sind nur die Schulden des Unternehmens", "Vermögen ist nur der Gewinn eines Jahres"],
    points: ["Anlagevermögen wird durch langfristiges Kapital finanziert", "Umlaufvermögen wird durch kurzfristiges Kapital finanziert", ["Beispiele: Fuhrpark, Grundstücke / Kassa, Bankguthaben", false]],
  },
  {
    nr: 8, topic: "guv", difficulty: "EASY",
    q: "Was bedeutet der Begriff Gewinn?",
    a: "Gewinn erhöht mein Eigenkapital",
    wrong: ["Gewinn vermindert mein Eigenkapital", "Gewinn erhöht mein Fremdkapital", "Gewinn hat keinen Einfluss auf das Eigenkapital"],
    points: ["Gewinn erhöht das Eigenkapital"],
  },
  {
    nr: 9, topic: "guv", difficulty: "EASY",
    q: "Was bedeutet der Begriff Verlust?",
    a: "Verlust vermindert mein Eigenkapital",
    wrong: ["Verlust erhöht mein Eigenkapital", "Verlust vermindert mein Fremdkapital", "Verlust hat keinen Einfluss auf das Eigenkapital"],
    points: ["Verlust vermindert das Eigenkapital"],
  },
  {
    nr: 10, topic: "guv", difficulty: "EASY",
    q: "Warum möchte man selbständig sein?",
    a: "1) Besseres Privatleben\n2) Betrieb selbst erhalten\n3) Gewinn Erzielung Absicht",
    wrong: ["Weniger Verantwortung und kein Risiko", "Um keine Steuern zahlen zu müssen", "Wegen geregelter Arbeitszeit mit fixem Gehalt"],
    points: ["Besseres Privatleben", "Betrieb selbst erhalten", "Gewinnerzielungsabsicht"],
  },
  {
    nr: 11, topic: "guv", difficulty: "MEDIUM",
    q: "Wofür ist die Abgeltung Gewinn?",
    a: "1) Unternehmerrisiko\n2) Bereitstellung vom Eigenkapital\n3) Unternehmer arbeitet sehr viel",
    wrong: ["Für die Zahlung der Umsatzsteuer", "Für die Löhne der Mitarbeiter", "Für die Kfz-Versicherung"],
    points: ["Unternehmerrisiko", "Bereitstellung vom Eigenkapital", ["Unternehmer arbeitet sehr viel", false]],
  },
  {
    nr: 12, topic: "guv", difficulty: "MEDIUM",
    q: "Was finanziert der Gewinn?",
    a: "1) Kreditrückzahlung\n2) Neue Produkte\n3) Einkommensteuer\n4) Private Lebensführung",
    wrong: ["Nur die Umsatzsteuer", "Die Betriebsausgaben des Vorjahres", "Ausschließlich die Löhne der Mitarbeiter"],
    points: ["Kreditrückzahlung", "Einkommensteuer", "Private Lebensführung", ["Neue Produkte", false]],
  },
  {
    nr: 13, topic: "bilanz", difficulty: "MEDIUM",
    q: "Was bedeutet Kennzahlen?",
    a: "Das heißt Zahlenverhältnis, die Kennzahlen helfen uns ein Überblick über die wirtschaftliche Lage zu bekommen und Schwachstellen oder Gefahr zu erkennen. (Sehr wichtig)",
    wrong: ["Die Telefonnummern der Stammkunden", "Die Nummern der Konten im Kontenplan", "Die Kennzeichen der Taxifahrzeuge"],
    points: ["Zahlenverhältnis", "Überblick über die wirtschaftliche Lage", "Schwachstellen oder Gefahr erkennen"],
  },
  {
    nr: 14, topic: "bilanz", difficulty: "MEDIUM",
    q: "Welche Arten von Kennzahlen kennen Sie?",
    a: "1) Vermögen und Finanzierung\n2) Liquiditätskennzahl\n3) Rentabilitätskennzahlen (Ertragskennzahlen)\n4) Erfolgskennzahlen",
    wrong: ["Umsatzsteuer, Lohnsteuer, Körperschaftsteuer", "Fahrgastzahl, Kilometerstand, Tankfüllung", "Journal, Hauptbuch, Kassabuch"],
    points: ["Vermögen und Finanzierung", "Liquiditätskennzahl", "Rentabilitätskennzahlen (Ertragskennzahlen)", ["Erfolgskennzahlen", false]],
  },
  {
    nr: 15, topic: "bilanz", difficulty: "MEDIUM",
    q: "Wissen Sie, was der Cashflow finanziert?",
    a: "1) Investition\n2) Schuldentilgung\n3) Privatentnahme\n4) Verbesserung der Liquidität",
    wrong: ["Nur die Umsatzsteuerzahlung", "Die Gewerbeanmeldung", "Ausschließlich Strafzahlungen"],
    points: ["Investition", "Schuldentilgung", "Privatentnahme", ["Verbesserung der Liquidität", false]],
  },
  {
    nr: 16, topic: "bilanz", difficulty: "MEDIUM",
    q: "Was können Sie mit den Kennzahlen auswerten?",
    a: "1) Betriebsvergleich\n2) Perioden\n3) Ist und Soll - Vergleich\n4) Ist = Wirklichkeit, Soll = ungefähr",
    wrong: ["Nur die Zufriedenheit der Fahrgäste", "Die Fahrtstrecken der Taxis", "Die Steuernummer des Unternehmens"],
    points: ["Betriebsvergleich", "Perioden(vergleich)", "Ist und Soll - Vergleich"],
  },
  {
    nr: 17, topic: "guv", difficulty: "EASY",
    q: "Einnahmen-Ausgaben-Rechnung?",
    a: "1) Einnahme bedeutet Geldeinfluss\n2) Ausgabe bedeutet Geldausfluss\n3) Ertrag erhöht steuerlich meinen Gewinn\n4) Aufwand vermindert steuerlich meinen Gewinn",
    wrong: ["Einnahme bedeutet Geldausfluss, Ausgabe bedeutet Geldeinfluss", "Ertrag vermindert den Gewinn, Aufwand erhöht ihn", "Einnahmen und Ausgaben werden nicht aufgezeichnet"],
    points: ["Einnahme bedeutet Geldeinfluss", "Ausgabe bedeutet Geldausfluss", ["Ertrag erhöht, Aufwand vermindert den Gewinn", false]],
  },
  {
    nr: 18, topic: "bilanz", difficulty: "EASY",
    q: "Was bedeutet der Begriff „Rücklage“?",
    a: "Spareinlage vom Gewinn für Investitionen bis 10 %",
    wrong: ["Eine Schuld beim Finanzamt", "Eine Verpflichtung mit unbekannter Höhe", "Die Rückzahlung eines Kredits"],
    points: ["Spareinlage vom Gewinn", "Für Investitionen", ["Bis 10 %", false]],
  },
  {
    nr: 19, topic: "guv", difficulty: "MEDIUM",
    q: "Was ist G+V-Rechnung?",
    a: "Erträge Plus + Aufwendungen Minus -\nDie Gewinn- und Verlustrechnung (kurz GuV) ist ein finanzieller Bericht, der die Ergebnisse eines Unternehmens über einen bestimmten Zeitraum (z. B. ein Geschäftsjahr) darstellt. Sie zeigt, ob ein Unternehmen einen Gewinn oder einen Verlust gemacht hat, indem sie die Erträge Einnahmen und Aufwendungen Ausgaben gegenüberstellt. Die GuV ist ein wichtiger Bestandteil des Jahresabschlusses.\nDie G+V-Rechnung ist eine Übersicht über alle Einnahmen und Ausgaben eines Geschäftsjahres. Sie zeigt, ob das Unternehmen Gewinn oder Verlust gemacht hat und ist Grundlage für die Steuerberechnung.\nDie Gewinn- und Verlustrechnung ist eine Rechnung, die alle Erträge und Aufwendungen eines Geschäftsjahres gegenüberstellt und das Ergebnis - Gewinn oder Verlust - ermittelt.",
    wrong: ["Eine Liste des Vermögens und der Schulden zu einem Stichtag", "Die Bestandsaufnahme aller Waren im Lager", "Ein Verzeichnis aller Anlagegüter mit ihrer AfA"],
    points: ["Erträge und Aufwendungen gegenüberstellen", "Zeigt Gewinn oder Verlust", ["Geschäftsjahr, Bestandteil des Jahresabschlusses", false]],
  },
  {
    nr: 20, topic: "bilanz", difficulty: "MEDIUM",
    q: "Was ist die Inventur?",
    a: "Im Gegensatz zum Einnahmen Ausgaben Rechner muss jeder Unternehmer, der eine Bilanz erstellt, eine Inventur durchführen. Die Inventur ist die mengenmäßige und wertmäßige Bestandaufnahme aller Vermögens- und Fremdkapitale zu einem Stichtag.",
    wrong: ["Die tägliche Zählung der Tageslosung", "Die jährliche Überprüfung des Fahrzeugs (Pickerl)", "Die Gegenüberstellung von Erträgen und Aufwendungen"],
    points: ["Mengenmäßige und wertmäßige Bestandaufnahme", "Zu einem Stichtag", ["Pflicht für Unternehmer, die eine Bilanz erstellen", false]],
  },
];

export const buchBbChapter = buildBookChapter({ category: "k-buchhaltung-bilanz", prefix: "bbb", chapterName: "Doppelte Buchhaltung / Buchführung (Bilanz)", items });
