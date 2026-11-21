/**
 * Kapitel 3 „Personalverrechnung“ – Fragen 1–22 aus dem Skript, Antworten im Originalwortlaut.
 * Ungeprüft – vor Freigabe gegen die aktuelle Rechtslage prüfen.
 */
import { buildBookChapter, type BookItem } from "./book-helpers";

const items: BookItem[] = [
  {
    nr: 1, topic: "brutto-netto", difficulty: "MEDIUM",
    q: "Wie lautet das Grundschema der Personalverrechnung?",
    a: "Normalbezug Lohn oder Gehalt\n+ Überstundenentgelt\n+ Überstundenzuschläge\n+ Zuschläge\n+ Zulagen\nBruttobezug\n- Sozialversicherungsbeitrag\n- Lohnsteuer\nNettobezug\n- Sonstige Abzüge\n= Auszahlungsbetrag",
    wrong: ["Nettobezug + Lohnsteuer + Sozialversicherung = Normalbezug", "Bruttobezug - Umsatzsteuer - Kommunalsteuer = Auszahlungsbetrag", "Normalbezug - Überstunden - Zulagen = Bruttobezug"],
    points: ["Normalbezug plus Überstunden, Zuschläge, Zulagen = Bruttobezug", "Minus Sozialversicherung und Lohnsteuer = Nettobezug", ["Minus sonstige Abzüge = Auszahlungsbetrag", false]],
  },
  {
    nr: 2, topic: "brutto-netto", difficulty: "EASY",
    q: "Welche Überstundenzuschläge gibt es?",
    a: "Die Höhe der Überstundenzuschläge wird in den Kollektivverträgen geregelt.\n1) In den meisten Fällen beträgt der Überstundenzuschlag 50 %.\n2) Für Überstunden während der Nacht, an Sonntag oder Feiertagen beträgt der Überstundenzuschlag meistens 100 %",
    wrong: ["Immer 10 %, gesetzlich festgelegt", "25 % tagsüber, 30 % in der Nacht", "Es gibt keine Überstundenzuschläge"],
    points: ["Geregelt im Kollektivvertrag", "Meistens 50 %", "Nacht, Sonntag, Feiertag meistens 100 %"],
  },
  {
    nr: 3, topic: "brutto-netto", difficulty: "MEDIUM",
    q: "Was finden Sie in den Lohnsteuertabellen?",
    a: "1) Lohnsteuerbemessungsgrundlage und Lohnsteuer, und zwar jeweils getrennt\n2) mit Alleinverdienerabsetzbetrag oder ohne Alleinverdienerabsetzbetrag",
    wrong: ["Die Telefonnummern des Finanzamts", "Die Umsatzsteuersätze für Taxifahrten", "Die Kollektivvertragslöhne aller Branchen"],
    points: ["Lohnsteuerbemessungsgrundlage und Lohnsteuer", "Mit oder ohne Alleinverdienerabsetzbetrag"],
  },
  {
    nr: 4, topic: "lohnnebenkosten", difficulty: "EASY",
    q: "Bis zu welchem Termin müssen Sie die Kommunalsteuer entrichten?",
    a: "Bis spätestens 15. des Folgemonats an die Gemeinde entrichten (3%)",
    wrong: ["Bis 31. Dezember an das Finanzamt (10 %)", "Bis 15. des zweitfolgenden Monats an die ÖGK (5 %)", "Einmal jährlich bis 30. Juni an die Wirtschaftskammer"],
    points: ["15. des Folgemonats", "An die Gemeinde", ["3 %", false]],
  },
  {
    nr: 5, topic: "brutto-netto", difficulty: "EASY",
    q: "Was müssen Sie dem Dienstnehmer monatlich neben dem Lohn-Gehalt übergeben?",
    a: "Spätestens am Monatsende mit der Lohnzahlung muss der Arbeitgeber dem Arbeitnehmer eine Abrechnung für den im Kalendermonat ausbezahlten Lohn oder Gehalt übergeben.",
    wrong: ["Eine Kopie der Umsatzsteuervoranmeldung", "Den Jahresabschluss des Unternehmens", "Nichts – eine Abrechnung gibt es nur einmal im Jahr"],
    points: ["Abrechnung für den ausbezahlten Lohn oder Gehalt", "Spätestens am Monatsende mit der Lohnzahlung"],
  },
  {
    nr: 6, topic: "brutto-netto", difficulty: "EASY",
    q: "Welche Angaben / Daten eines Dienstnehmers finden Sie auf einem Lohnkonto?",
    a: "Der Arbeitgeber muss für jeden Arbeitnehmer ein Lohnkonto führen.\nHier sind alle Grundlagen für die Abrechnung der Löhne und Gehälter enthalten.",
    wrong: ["Nur der Kontostand des Arbeitnehmers bei der Bank", "Die privaten Ausgaben des Arbeitnehmers", "Ein Lohnkonto gibt es nur für Lehrlinge"],
    points: ["Für jeden Arbeitnehmer ein Lohnkonto", "Alle Grundlagen für die Abrechnung der Löhne und Gehälter"],
  },
  {
    nr: 7, topic: "brutto-netto", difficulty: "MEDIUM",
    q: "Folgende Angaben müssen vorliegen (Lohnkonto):",
    a: "1) Vorname und Familienname\n2) Geburtsdatum\n3) Wohnsitz Adresse\n4) Alleinverdienerabsetzbetrag\n5) SV-Nummer\n6) Pendlerpauschale\n7) Freibetrag\n8) Brutto\n9) Netto\n10) Sachbezüge (Firmenautobenützung oder Firmenwohnung)\n11) Bemessungsgrundlage",
    wrong: ["Religion, Lieblingsfarbe, Hobbys", "Nur Name und Telefonnummer", "Kfz-Kennzeichen und Führerscheinnummer"],
    points: ["Name, Geburtsdatum, Wohnsitz", "SV-Nummer", "Brutto und Netto", ["Pendlerpauschale, Freibetrag, Sachbezüge, Bemessungsgrundlage", false]],
  },
  {
    nr: 8, topic: "brutto-netto", difficulty: "EASY",
    q: "Aus welchen Teilen besteht die Entlohnung einer Überstunde?",
    a: "Die Entlohnung einer Überstunde setzt sich aus 2 Teilen zusammen dem\n1. Überstundengrundlohn\n2. Überstundenzuschlag",
    wrong: ["Nur aus dem Überstundenzuschlag", "Aus Urlaubsgeld und Weihnachtsgeld", "Aus Kilometergeld und Taggeld"],
    points: ["Überstundengrundlohn", "Überstundenzuschlag"],
  },
  {
    nr: 9, topic: "lohnnebenkosten", difficulty: "MEDIUM",
    q: "Wie hoch ist das amtliche Kilometergeld?",
    a: "Das amtliche Kilometergeld ist eine steuerfreie Pauschalabgeltung in Österreich für Fahrzeugkosten, die bei Fahrten mit einem privaten Fahrzeug im Rahmen der Berufsausübung (Dienstreisen) anfallen. Das Kilometergeld ist nicht zu verwechseln mit dem Pendlerpauschale, das die Aufwendungen für Fahrten zwischen Arbeitsstätte und Wohnort pauschaliert und nicht an die Nutzung eines Fahrzeugs gebunden ist.\n1) Die amtlichen Sätze lauten\n2) Kilometergeld PKW und Kombi € 0,50 pro Kilometer\n3) Voraussetzung ist die Führung eines Fahrtenbuches",
    wrong: ["€ 1,20 pro Kilometer, ohne Fahrtenbuch", "€ 0,10 pro Kilometer, steuerpflichtig", "Es gibt kein amtliches Kilometergeld"],
    points: ["Steuerfreie Pauschalabgeltung für Dienstreisen mit privatem Fahrzeug", "€ 0,50 pro Kilometer", "Fahrtenbuch"],
  },
  {
    nr: 10, topic: "sonderzahlungen", difficulty: "EASY",
    q: "Was sind Sonderzahlungen?",
    a: "Eine Sonderzahlung erfolgt regelmäßig und auf lange Zeitabständen z. B.\n1) Urlaubsgeld\n2) Weihnachtsgeld\n3) Prämien",
    wrong: ["Überstundenzuschläge jeden Monat", "Kilometergeld und Taggeld", "Die Rückzahlung eines Kredits"],
    points: ["Regelmäßig in langen Zeitabständen", "Urlaubsgeld", "Weihnachtsgeld", ["Prämien", false]],
  },
  {
    nr: 11, topic: "sonderzahlungen", difficulty: "MEDIUM",
    q: "Was ist das Urlaubsentgelt?",
    a: "Das Urlaubsentgelt ist nichts Anderes als laufender Lohn bzw. laufendes Gehalt für die Nichtanwesenheitszeit (weil der Urlaub konsumiert wird).\nEs gilt das letzte 13 Woche Lohnausfallsprinzip!\nDa das Urlaubsentgelt somit laufender Lohn bzw. laufendes Gehalt ist, müssen die Sozialversicherungsbeiträge und die Lohnsteuer bezahlt werden. (Sehr wichtig)",
    wrong: ["Ein steuerfreies Geschenk des Arbeitgebers", "Das Urlaubsgeld (14. Gehalt)", "Eine Zahlung nur bei Kündigung"],
    points: ["Laufender Lohn bzw. Gehalt für die Nichtanwesenheitszeit (Urlaub)", "Lohnausfallsprinzip (letzte 13 Wochen)", "Sozialversicherung und Lohnsteuer werden bezahlt"],
  },
  {
    nr: 12, topic: "lohnnebenkosten", difficulty: "MEDIUM",
    q: "Wie hoch ist die Sozialversicherungs-Höchstbeitragsgrundlage?",
    a: "SV Obergrenzen (Jahr 2026 6930€)",
    wrong: ["1.095 € (Jahr 2026)", "55.000 € (Jahr 2026)", "Es gibt keine Obergrenze"],
    points: ["SV Obergrenze 6930 € (2026)"],
  },
  {
    nr: 13, topic: "brutto-netto", difficulty: "HARD",
    q: "Welche bzw. wie viele Überstundenzuschläge sind lohnsteuerfrei?",
    a: "Der höchstmögliche steuerfreie Zuschlag beträgt für das Kalenderjahr 2026 für die ersten 15 Überstunden im Monat 170 €.\nb) Angaben Jahr 2024 Lohnsteuer - Bemessungsgrundlage\nc) Gibt es Begünstigungen für alle Sonntag, Feiertag, und Nachtarbeit SFN-Zuschläge?\nFür Arbeitnehmer, deren Normalarbeitszeit im Lohnzahlungszeitraum aufgrund der Beschaffenheit ihrer Arbeit überwiegend in der Zeit von 19 Uhr bis 7 Uhr liegt, erhöht sich der Freibetrag um. 2026: 600 EUR monatlich.\nZusätzlich dazu sind Zuschläge für die ersten 15 Überstunden ab 2026, bis 15 max. 170 €\nJa! Zuschläge für Sonntags-, Feiertags- und Nachtarbeit und mit diesen Arbeiten zusammenhängende Überstundenzuschläge sind gemeinsam mit ausbezahltem Schmutz-, Erschwernis- und Gefahrenzulagen insgesamt (ab 2024: 400 €) monatlich steuerfrei. Arbeitnehmer, deren Normalarbeitszeit im Lohnzahlungszeitraum aufgrund der Beschaffenheit ihrer Arbeit überwiegend in der Zeit von 19 Uhr bis 7 Uhr liegt, erhöht sich der Freibetrag um (ab 2024: 600 €) monatlich.",
    wrong: ["Alle Überstunden sind unbegrenzt lohnsteuerfrei", "Keine – Überstundenzuschläge sind immer voll steuerpflichtig", "Nur die ersten 2 Überstunden bis 20 € im Jahr"],
    points: ["Erste 15 Überstunden im Monat bis 170 € (2026)", "SFN-Zuschläge mit Zulagen bis 400 € monatlich steuerfrei", ["Nachtarbeit 19 bis 7 Uhr: Freibetrag 600 €", false]],
  },
  {
    nr: 14, topic: "lohnnebenkosten", difficulty: "HARD",
    q: "Nennen Sie die Freigrenzen bei der Kleinunternehmerregelung in der Personalverrechnung für DB- DZ- und Kommunalsteuer?",
    a: "1) Bruttolohnsumme bis 1.095 € keine DB, keine DBZ, keine Kommunalsteuer\n2) Bruttolohnsumme 1.095 € bis 1.460 € frei, der Rest\n3) DB, DBZ, Kommunalsteuer 365 € Differenz zahlen\n4) Bruttolohnsumme ab 1.460 € voll bezahlen",
    wrong: ["Bruttolohnsumme bis 55.000 € keine Abgaben", "Bruttolohnsumme bis 6.930 € keine DB, ab 10.000 € voll", "Es gibt keine Freigrenzen"],
    points: ["Bis 1.095 € keine DB, DZ, Kommunalsteuer", "1.095 € bis 1.460 € frei, Rest Differenz zahlen", "Ab 1.460 € voll bezahlen"],
  },
  {
    nr: 15, topic: "lohnnebenkosten", difficulty: "EASY",
    q: "Zählen Sie ein paar Beispiele für Personalkosten auf!",
    a: "1) Angestellter/in → Gehalt\n2) Arbeiter/in → Lohn\n3) Unternehmer → Unternehmerlohn\n4) Lehrling → Lehrlingsentschädigung\n5) Mitarbeiter ohne Dienstvertrag → Honorarnoten - Rechnung",
    wrong: ["Treibstoff, Reifen, Reparaturen", "Miete, Strom, Telefon", "Umsatzsteuer und Vorsteuer"],
    points: ["Angestellter: Gehalt", "Arbeiter: Lohn", "Lehrling: Lehrlingsentschädigung", ["Unternehmerlohn, Honorarnote", false]],
  },
  {
    nr: 16, topic: "lohnnebenkosten", difficulty: "MEDIUM",
    q: "Welche Freibeträge kennen Sie?",
    a: "1) Sonderausgaben\n2) Außergewöhnliche Belastung\n3) Werbungskosten\na) Kinderbetreuung Kosten\nb) Ausbildungskosten\nc) Fahrtkosten",
    wrong: ["Umsatzsteuer, Vorsteuer, Erwerbsteuer", "Grundumlage und Kammerumlage", "Urlaubsgeld und Weihnachtsgeld"],
    points: ["Sonderausgaben", "Außergewöhnliche Belastung", "Werbungskosten"],
  },
  {
    nr: 17, topic: "lohnnebenkosten", difficulty: "MEDIUM",
    q: "Wie setzen sich die Lohnnebenkosten zusammen?",
    a: "Mitarbeiter Nichtanwesenheit z. B.:\n1) Urlaub\n2) Krankheit\n3) Feiertage\n4) Kommunalsteuer\n5) Sonderzahlung Weihnacht - und Urlaubgeld\n6) Sozialversicherung (ÖGK) Dienstgeberanteil, Dienstnehmeranteil\n7) DB\n8) DZ",
    wrong: ["Nur Treibstoff und Reparaturen", "Nur die Lohnsteuer des Arbeitnehmers", "Miete und Stromkosten des Büros"],
    points: ["Nichtanwesenheit: Urlaub, Krankheit, Feiertage", "Kommunalsteuer", "Sozialversicherung (ÖGK)", ["Sonderzahlungen, DB, DZ", false]],
  },
  {
    nr: 18, topic: "lohnnebenkosten", difficulty: "MEDIUM",
    q: "Nennen Sie 3 Lohnsteuerfreie Bezüge?",
    a: "1) Kilometergeld\n2) Tages und Nächtigungsgelder\n3) Sonstige Bezüge wie zum Beispiel 13. Gehalt, Urlaubsgeld bis 620 € frei\n4) Die ersten 18 Überstunden mit 50 % bis 120 € Zuschlag.\n5) Schmutz und Gefahrzulagen bis 400 €\n6) Überstunden Sonntag, Feiertag, Nacht",
    wrong: ["Normaler Monatslohn, Provisionen, Prämien", "Urlaubsentgelt und Krankenentgelt", "Gewinnbeteiligung und Bonus ohne Grenze"],
    points: ["Kilometergeld", "Tages- und Nächtigungsgelder", "Schmutz- und Gefahrenzulagen", ["13. Gehalt/Urlaubsgeld bis 620 €, Überstunden", false]],
  },
  {
    nr: 19, topic: "lohnnebenkosten", difficulty: "MEDIUM",
    q: "Welche Sozialversicherung freie Bezüge/Beträge kennen Sie?",
    a: "1) Kilometergeld\n2) Tages und Nächtigungsgelder\n3) Schmutzzulage\n4) Abfertigung\n5) Urlaubsersatzleistung (offene Urlaubstage)",
    wrong: ["Normaler Monatslohn und Überstunden", "Weihnachtsgeld und Urlaubsgeld", "Provisionen und Prämien"],
    points: ["Kilometergeld", "Tages- und Nächtigungsgelder", "Abfertigung", ["Schmutzzulage, Urlaubsersatzleistung", false]],
  },
  {
    nr: 20, topic: "brutto-netto", difficulty: "MEDIUM",
    q: "Wie rechnet man die Ausbezahllöhne?",
    a: "DG:\nBrutto\n- SV Dienstnehmeranteil\n- Freibetrag\n- Pendlerpauschale\n= Bemessungsgrundlage\nDN:\nBrutto\n- SV\n- Lohnsteuer\nAusbezahllohn",
    wrong: ["Brutto + Lohnsteuer + SV = Ausbezahllohn", "Netto - Umsatzsteuer = Ausbezahllohn", "Brutto - Kommunalsteuer = Ausbezahllohn"],
    points: ["Brutto minus SV, Freibetrag, Pendlerpauschale = Bemessungsgrundlage", "Brutto minus SV minus Lohnsteuer = Ausbezahllohn"],
  },
  {
    nr: 21, topic: "brutto-netto", difficulty: "EASY",
    q: "Was bedeutet der Begriff Pendlerpauschale?",
    a: "Die Pendlerpauschale mindert die Lohnsteuer Bemessungsgrundlage und ist keine Geldleistung.",
    wrong: ["Eine monatliche Geldzahlung des Arbeitgebers", "Das amtliche Kilometergeld für Dienstreisen", "Eine Steuer für Pendler"],
    points: ["Mindert die Lohnsteuer-Bemessungsgrundlage", "Keine Geldleistung"],
  },
  {
    nr: 22, topic: "lohnnebenkosten", difficulty: "HARD",
    q: "Was beinhaltet die außerbetriebliche Abrechnung?",
    a: "FINANZAMT:\n- Lohnsteuer (vom Brutto)\n- Dienstgeberbeitrag 3,7 %\n- Dienstgeberbeitragszuschlag 0,36 % (2026)\nÖGK:\n- DGA 21,23 % (Jahr 2026)\n- DNA 18,32 % (Jahr 2026)\n- 1,53 % Abfertigung vom Bruttolohn\nGEMEINDE:\n- Kommunalsteuer 3 %\n- U-Bahnsteuer (2 € Woche)",
    wrong: ["Nur die Umsatzsteuer an das Finanzamt", "Finanzamt: Kommunalsteuer – Gemeinde: Lohnsteuer – ÖGK: Umsatzsteuer", "Nur die Grundumlage an die Wirtschaftskammer"],
    points: ["Finanzamt: Lohnsteuer, Dienstgeberbeitrag, Zuschlag", "ÖGK: Dienstgeber- und Dienstnehmeranteil, Abfertigung", "Gemeinde: Kommunalsteuer, U-Bahnsteuer"],
  },
];

export const buchPvChapter = buildBookChapter({ category: "k-personalverrechnung", prefix: "pvb", chapterName: "Personalverrechnung", items });
