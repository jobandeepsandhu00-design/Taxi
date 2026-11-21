/**
 * Kapitel der Konzessionsprüfung (Gliederung nach dem Skript „Inhaltsverzeichnis“, Kapitel 1–25).
 * Steuerrecht (Kap. 4) und Arbeits- und Sozialrecht (Kap. 8) sind die bestehenden Kategorien „steuerrecht“ und „arbeitsrecht“ (siehe BOOK_CHAPTERS).
 *
 * Die Fragen sind eigenständig erstellte ÜBUNGSFRAGEN (origin = DEMO, Tag „konzession“) –
 * keine offiziellen Prüfungsfragen. Rechtliche Angaben vor produktivem Einsatz prüfen.
 */
import type { SeedCategory } from "./categories";
import type { SeedQuestion } from "./questions";

type Opt = [text: string, correct: boolean, explanation: string];

function cat(order: number, slug: string, name: string, shortDescription: string, icon: string, color: string, topics: [string, string, string][], difficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM"): SeedCategory {
  return {
    slug,
    name,
    shortDescription,
    introduction: `${shortDescription}\n\nDieses Kapitel gehört zum Stoff der Konzessionsprüfung (Personenbeförderungsgewerbe mit Pkw – Taxi). Die Übungsfragen sind eigenständig erstellt und keine offiziellen Prüfungsfragen.`,
    color,
    icon,
    order,
    difficulty,
    topics: topics.map(([s, n, d]) => ({ slug: s, name: n, description: d })),
  };
}

export const konzessionCategories: SeedCategory[] = [
  cat(1, "k-rechnungswesen", "Rechnungswesen", "Aufgaben des Rechnungswesens, Buchführungsgrundsätze, Belege, Einnahmen-Ausgaben-Rechnung und Umsatzsteuer-Termine.", "Calculator", "amber", [
    ["grundsaetze", "Buchführungsgrundsätze", "Keine Buchung ohne Beleg"],
    ["belege", "Belegarten", "Eingangs-/Ausgangsrechnung, Kassa-, Bankbeleg"],
    ["ea-rechnung", "Einnahmen-Ausgaben-Rechnung", "Zufluss-Abfluss-Prinzip"],
  ]),
  cat(2, "k-buchhaltung-bilanz", "Doppelte Buchhaltung / Buchführung (Bilanz)", "Soll und Haben, Aktiva und Passiva, Bilanz und Gewinn- und Verlustrechnung.", "Calculator", "orange", [
    ["doppik", "Doppelte Buchhaltung", "Soll/Haben, Konten"],
    ["bilanz", "Bilanz", "Vermögen und Kapital"],
    ["guv", "Gewinn- und Verlustrechnung", "Erträge und Aufwände"],
  ]),
  cat(3, "k-personalverrechnung", "Personalverrechnung", "Vom Brutto zum Netto, Sozialversicherung, Lohnsteuer, Sonderzahlungen und Lohnnebenkosten.", "Users", "rose", [
    ["brutto-netto", "Brutto – Netto", "Abzüge vom Bruttolohn"],
    ["sonderzahlungen", "Sonderzahlungen", "Urlaubs- und Weihnachtsgeld"],
    ["lohnnebenkosten", "Lohnnebenkosten", "Abgaben des Dienstgebers"],
  ]),
  cat(5, "k-vollkostenrechnung", "Vollkostenrechnung", "Kostenarten-, Kostenstellen- und Kostenträgerrechnung, fixe und variable Kosten.", "Calculator", "teal", [
    ["kostenarten", "Kostenarten", "Fix/variabel, Einzel-/Gemeinkosten"],
    ["kostenstellen", "Kostenstellen & Kostenträger", "Wo und wofür Kosten entstehen"],
  ]),
  cat(6, "k-deckungsbeitrag", "Deckungsbeitrag", "Deckungsbeitrag, Break-even-Point und Entscheidungen mit der Teilkostenrechnung.", "Calculator", "emerald", [
    ["db", "Deckungsbeitrag", "Erlös minus variable Kosten"],
    ["break-even", "Break-even", "Gewinnschwelle"],
  ]),
  cat(7, "k-finanzierung", "Finanzierung", "Eigen- und Fremdfinanzierung, Kredite, Leasing und Liquidität.", "Landmark", "sky", [
    ["formen", "Finanzierungsformen", "Eigen-, Fremd-, Innenfinanzierung"],
    ["leasing", "Leasing & Kredit", "Fahrzeugfinanzierung"],
  ]),
  cat(9, "k-betriebsordnung-tarif", "Betriebsordnung und Tarif", "Pflichten nach der Betriebsordnung für das Taxigewerbe in Wien, Taxameter und Tarif.", "Car", "blue", [
    ["betriebsordnung", "Betriebsordnung", "Pflichten von Unternehmer und Lenker"],
    ["tarif", "Tarif & Taxameter", "Fahrpreis, Beleg"],
  ], "HARD"),
  cat(10, "k-kollektivvertrag", "Angestellten- und Arbeiter-Kollektivvertrag", "Wer den Kollektivvertrag abschließt, für wen er gilt und was er regelt.", "Users", "violet", [
    ["grundlagen", "Kollektivvertrag – Grundlagen", "Parteien, Geltung, Günstigkeitsprinzip"],
    ["inhalte", "Inhalte", "Mindestlohn, Arbeitszeit, Sonderzahlungen"],
  ]),
  cat(11, "k-gewerbeordnung", "Gewerbeordnung", "Gewerbearten, allgemeine Voraussetzungen, Gewerbeanmeldung und gewerberechtlicher Geschäftsführer.", "Building2", "indigo", [
    ["gewerbearten", "Gewerbearten", "Frei, reglementiert, konzessioniert"],
    ["voraussetzungen", "Voraussetzungen", "Allgemeine und besondere"],
    ["geschaeftsfuehrer", "Gewerberechtlicher Geschäftsführer", "Aufgaben und Haftung"],
  ]),
  cat(12, "k-wirtschaftskammer", "Wirtschaftskammerrecht", "Aufbau der Wirtschaftskammer, Pflichtmitgliedschaft, Umlagen und Sozialpartnerschaft.", "Building2", "cyan", [
    ["aufbau", "Aufbau der WKO", "Landeskammern, Sparten, Fachgruppen"],
    ["mitgliedschaft", "Mitgliedschaft & Umlagen", "Pflichtmitgliedschaft, Grundumlage"],
  ], "EASY"),
  cat(13, "k-gesellschaftsrecht", "Gesellschafts- und Handelsrecht", "Rechtsformen (Einzelunternehmen, OG, KG, GmbH), Haftung, Firmenbuch und Unternehmensgesetzbuch.", "Briefcase", "amber", [
    ["rechtsformen", "Rechtsformen", "Einzelunternehmen, OG, KG, GmbH"],
    ["firmenbuch", "Firmenbuch & UGB", "Eintragung, Prokura"],
  ]),
  cat(14, "k-buergerliches-recht", "Bürgerliches Recht", "ABGB: Rechtsfähigkeit, Verträge, Gewährleistung, Schadenersatz und Verjährung.", "Scale", "orange", [
    ["vertraege", "Verträge", "Zustandekommen, Beförderungsvertrag"],
    ["gewaehrleistung", "Gewährleistung & Schadenersatz", "Fristen und Voraussetzungen"],
  ]),
  cat(15, "k-marketing", "Marketing", "Marketing-Mix, Zielgruppen, Werbung und Kundenbindung im Taxigewerbe.", "HeartHandshake", "rose", [
    ["marketing-mix", "Marketing-Mix", "Produkt, Preis, Vertrieb, Kommunikation"],
  ], "EASY"),
  cat(16, "k-umweltschutz", "Umweltschutz", "Umweltbewusstes Fahren, Abfallentsorgung und alternative Antriebe.", "ShieldCheck", "emerald", [
    ["fahrweise", "Umweltbewusstes Fahren", "Spritsparen, Leerlauf"],
    ["abfall", "Abfall & Entsorgung", "Gefährliche Abfälle"],
  ], "EASY"),
  cat(17, "k-kalkulation", "Kalkulation", "Vom Selbstkostenpreis zum Bruttopreis: Gewinnaufschlag, Umsatzsteuer und Preisberechnung.", "Calculator", "teal", [
    ["preis", "Preiskalkulation", "Selbstkosten, Gewinn, Umsatzsteuer"],
  ]),
  cat(18, "k-versicherungsrecht", "Versicherungsrecht", "Kfz-Haftpflicht, Kasko, Insassenunfall und betriebliche Versicherungen.", "ShieldCheck", "sky", [
    ["kfz", "Kfz-Versicherungen", "Haftpflicht, Kasko"],
    ["betrieb", "Betriebliche Versicherungen", "Betriebshaftpflicht, Unfall"],
  ]),
  cat(19, "k-insolvenzrecht", "Insolvenzrecht", "Zahlungsunfähigkeit, Überschuldung, Konkurs- und Sanierungsverfahren.", "Scale", "violet", [
    ["verfahren", "Insolvenzverfahren", "Konkurs, Sanierung"],
    ["pflichten", "Pflichten & Fristen", "Antragspflicht, IEF"],
  ], "HARD"),
  cat(20, "k-lenkprotokoll", "Lenkprotokoll", "Aufzeichnung von Dienst-, Lenk- und Ruhezeiten im Taxibetrieb.", "Car", "indigo", [
    ["aufzeichnung", "Aufzeichnungspflicht", "Inhalt, Mitführen, Aufbewahren"],
  ]),
  cat(21, "k-gelegenheitsverkehrsgesetz", "Gelegenheitsverkehrsgesetz", "Konzessionspflicht, Voraussetzungen, Taxilenkerausweis und Tarife nach dem GelverkG.", "Landmark", "blue", [
    ["konzession", "Konzession", "Voraussetzungen und Behörde"],
    ["lenker", "Taxilenker", "Taxilenkerausweis"],
  ], "HARD"),
  cat(22, "k-registrierkassa", "Registrierkassa", "Registrierkassen- und Belegerteilungspflicht, Manipulationsschutz und Belegprüfung.", "Calculator", "cyan", [
    ["pflicht", "Registrierkassenpflicht", "Umsatzgrenzen"],
    ["beleg", "Belegerteilung", "Beleg, Signatur, Startbeleg"],
  ]),
  cat(23, "k-verkehrsgeographie", "Verkehrsgeographie", "Österreichs Bundesländer, Verkehrswege, Flughafen und Bahnhöfe rund um Wien.", "MapPinned", "emerald", [
    ["oesterreich", "Österreich", "Bundesländer, Landeshauptstädte"],
    ["wien-verkehr", "Verkehrsknoten Wien", "Flughafen, Bahnhöfe, Autobahnen"],
  ], "EASY"),
  cat(24, "k-eu-sozialrecht", "Europäisches Sozialrecht", "Koordinierung der Sozialversicherung in der EU, EKVK, A1-Bescheinigung und Freizügigkeit.", "Landmark", "indigo", [
    ["koordinierung", "Koordinierung", "Zuständiger Staat, Gleichbehandlung"],
    ["dokumente", "Dokumente", "EKVK, A1"],
  ]),
  cat(25, "k-sonstige", "Sonstige Fragen", "Gemischte Fragen: Notrufnummern, Datenschutz und Allgemeines für Unternehmer.", "BookOpen", "amber", [
    ["allgemein", "Allgemeines", "Notruf, Datenschutz"],
  ], "EASY"),
];

/** Kurzschreibweise für eine Übungsfrage. */
function q(id: string, category: string, topic: string, difficulty: "EASY" | "MEDIUM" | "HARD", text: string, options: [Opt, Opt, Opt, Opt], explanation: string, detail?: string): SeedQuestion {
  return { id: `kz-${id}`, category, topic, difficulty, text, options: shuffled(id, options), explanation, detail, tags: ["konzession"] };
}

/** Antwortreihenfolge deterministisch je Frage mischen (richtige Antwort nicht immer an Position A). */
export function shuffled(id: string, options: [Opt, Opt, Opt, Opt]): [Opt, Opt, Opt, Opt] {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const out = [...options];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out as [Opt, Opt, Opt, Opt];
}

export const konzessionQuestions: SeedQuestion[] = [
  // Kapitel 1 (Rechnungswesen) kommt aus dem Skript: siehe buch-rechnungswesen.ts

  // Kapitel 2 (Doppelte Buchhaltung) kommt aus dem Skript: siehe buch-buchhaltung.ts

  // Kapitel 3 (Personalverrechnung) kommt aus dem Skript: siehe buch-personal.ts

  // Kapitel 5–7 kommen aus dem Skript: siehe buch-kosten.ts

  // ───────────── 9. Betriebsordnung und Tarif ─────────────
  q("bo-01", "k-betriebsordnung-tarif", "tarif", "MEDIUM", "Wer legt die Taxitarife in einem Bundesland fest?", [
    ["Der Landeshauptmann durch Verordnung", true, "Die Tarife werden nach dem Gelegenheitsverkehrsgesetz verordnet."],
    ["Jeder Taxiunternehmer selbst", false, "Im Pflichtfahrgebiet gilt der verordnete Tarif."],
    ["Die Funkzentrale", false, "Funkzentralen legen keine verbindlichen Tarife fest."],
    ["Der Fahrgast", false, "Der Fahrgast bestimmt den Tarif nicht."],
  ], "Für das Taxigewerbe kann der Landeshauptmann verbindliche Tarife verordnen (in Wien: Wiener Taxitarif).", "§ 14 GelverkG"),
  q("bo-02", "k-betriebsordnung-tarif", "tarif", "EASY", "Wann muss der Taxameter eingeschaltet sein?", [
    ["Bei jeder Fahrt mit Fahrgast nach Tarif", true, "Der Fahrpreis ergibt sich aus dem Taxameter."],
    ["Nur bei langen Fahrten", false, "Die Pflicht gilt unabhängig von der Länge."],
    ["Nur auf Wunsch des Fahrgastes", false, "Der Lenker muss ihn von sich aus einschalten."],
    ["Nur nachts", false, "Die Pflicht gilt rund um die Uhr."],
  ], "Der geeichte Taxameter ist bei Tariffahrten einzuschalten; der Fahrpreis muss für den Fahrgast gut sichtbar sein."),
  q("bo-03", "k-betriebsordnung-tarif", "betriebsordnung", "MEDIUM", "Darf ein Taxilenker eine Fahrt grundlos ablehnen?", [
    ["Nein, es besteht grundsätzlich Beförderungspflicht", true, "Ablehnen darf er nur aus berechtigten Gründen."],
    ["Ja, jederzeit", false, "Im Taxigewerbe gilt die Beförderungspflicht."],
    ["Ja, bei kurzen Strecken", false, "Kurze Strecken sind kein Ablehnungsgrund."],
    ["Ja, wenn der Fahrgast mit Karte zahlen will", false, "Die Zahlungsart allein ist kein Ablehnungsgrund."],
  ], "Berechtigte Ablehnungsgründe sind z. B. Gefährdung der Sicherheit, stark betrunkene oder gewalttätige Fahrgäste."),
  q("bo-04", "k-betriebsordnung-tarif", "betriebsordnung", "EASY", "Welche Strecke muss der Lenker grundsätzlich wählen?", [
    ["Die kürzeste bzw. für den Fahrgast günstigste Strecke, außer der Fahrgast wünscht anders", true, "Umwege auf Kosten des Fahrgastes sind unzulässig."],
    ["Die schnellste für den Lenker", false, "Maßgeblich ist das Interesse des Fahrgastes."],
    ["Immer über die Autobahn", false, "Das ist nicht automatisch die günstigste Strecke."],
    ["Eine beliebige Strecke", false, "Der Lenker ist an die günstigste Strecke gebunden."],
  ], "Der Lenker hat den kürzesten bzw. wirtschaftlichsten Weg zu wählen, sofern der Fahrgast nichts anderes verlangt."),

  // ───────────── 10. Kollektivvertrag ─────────────
  q("kv-01", "k-kollektivvertrag", "grundlagen", "EASY", "Wer schließt einen Kollektivvertrag ab?", [
    ["Interessenvertretungen der Arbeitgeber und Arbeitnehmer (z. B. WKO und Gewerkschaft)", true, "Kollektivverträge sind Vereinbarungen der Sozialpartner."],
    ["Der einzelne Arbeitgeber mit dem Betriebsrat", false, "Das ist eine Betriebsvereinbarung."],
    ["Das Arbeitsministerium", false, "Der Staat schließt keine KV ab."],
    ["Der Arbeitnehmer mit dem Arbeitgeber", false, "Das ist ein Arbeitsvertrag."],
  ], "Der Kollektivvertrag wird zwischen kollektivvertragsfähigen Körperschaften abgeschlossen (z. B. Fachgruppe der WKO und Gewerkschaft vida).", "§ 2 ArbVG"),
  q("kv-02", "k-kollektivvertrag", "grundlagen", "MEDIUM", "Was besagt das Günstigkeitsprinzip?", [
    ["Der Arbeitsvertrag darf vom KV nur zugunsten des Arbeitnehmers abweichen", true, "Schlechtere Vereinbarungen sind unwirksam."],
    ["Der Arbeitgeber darf den günstigeren Lohn wählen", false, "Das wäre eine Abweichung zulasten des Arbeitnehmers."],
    ["Es gilt immer der billigste Tarif", false, "Hat nichts mit Tarifen zu tun."],
    ["Der KV gilt nur, wenn er günstiger als das Gesetz ist", false, "Gesetze sind meist Mindeststandards; die Aussage ist unvollständig."],
  ], "Einzelverträge dürfen nur Bestimmungen enthalten, die für den Arbeitnehmer günstiger sind als der Kollektivvertrag.", "§ 3 ArbVG"),
  q("kv-03", "k-kollektivvertrag", "inhalte", "EASY", "Was wird typischerweise im Kollektivvertrag geregelt?", [
    ["Mindestlöhne, Sonderzahlungen und Arbeitszeitregelungen", true, "Das sind klassische KV-Inhalte."],
    ["Die Höhe der Einkommensteuer", false, "Steuern regelt das Gesetz."],
    ["Die Taxitarife", false, "Tarife werden verordnet."],
    ["Die Führerscheinprüfung", false, "Hat mit dem KV nichts zu tun."],
  ], "Der KV regelt u. a. Mindestentgelte, Sonderzahlungen, Arbeitszeit, Zulagen und Kündigungsfristen."),
  q("kv-04", "k-kollektivvertrag", "grundlagen", "MEDIUM", "Gilt der Kollektivvertrag auch für Arbeitnehmer, die nicht Gewerkschaftsmitglied sind?", [
    ["Ja, er gilt für alle Arbeitnehmer der erfassten Betriebe", true, "Sogenannte Außenseiterwirkung."],
    ["Nein, nur für Gewerkschaftsmitglieder", false, "In Österreich gilt der KV für alle Arbeitnehmer des Betriebs."],
    ["Nur für Angestellte", false, "Es gibt KV für Arbeiter und Angestellte."],
    ["Nur bei Vollzeit", false, "Auch Teilzeitkräfte sind erfasst."],
  ], "Durch die Außenseiterwirkung gilt der KV für alle Arbeitnehmer eines kollektivvertragsangehörigen Arbeitgebers.", "§ 12 ArbVG"),

  // ───────────── 11. Gewerbeordnung ─────────────
  q("go-01", "k-gewerbeordnung", "gewerbearten", "MEDIUM", "Wie wird das Taxigewerbe gewerberechtlich eingeordnet?", [
    ["Als konzessioniertes Gewerbe nach dem Gelegenheitsverkehrsgesetz", true, "Es braucht eine Konzession."],
    ["Als freies Gewerbe", false, "Für freie Gewerbe genügt die Anmeldung – das Taxigewerbe braucht eine Konzession."],
    ["Als Teilgewerbe", false, "Das Taxigewerbe ist kein Teilgewerbe."],
    ["Es ist kein Gewerbe", false, "Die gewerbsmäßige Personenbeförderung ist ein Gewerbe."],
  ], "Das Personenbeförderungsgewerbe mit Pkw (Taxi) ist konzessionspflichtig; die GewO gilt ergänzend.", "§ 1, § 2 GelverkG"),
  q("go-02", "k-gewerbeordnung", "voraussetzungen", "EASY", "Welche allgemeine Voraussetzung gilt für die Ausübung eines Gewerbes durch natürliche Personen?", [
    ["Vollendung des 18. Lebensjahres (Eigenberechtigung)", true, "Gewerbetreibende müssen volljährig sein."],
    ["Mindestens 5 Jahre Berufserfahrung in jedem Fall", false, "Das ist keine allgemeine Voraussetzung."],
    ["Ein Hochschulabschluss", false, "Nicht erforderlich."],
    ["Mitgliedschaft in einer Partei", false, "Völlig unzulässiges Kriterium."],
  ], "Allgemeine Voraussetzungen: Eigenberechtigung (18 Jahre), Staatsangehörigkeit EU/EWR oder entsprechender Aufenthaltstitel, keine Gewerbeausschlussgründe.", "§ 8, § 13 GewO"),
  q("go-03", "k-gewerbeordnung", "geschaeftsfuehrer", "MEDIUM", "Wann braucht ein Unternehmen einen gewerberechtlichen Geschäftsführer?", [
    ["Wenn der Inhaber (bzw. die Gesellschaft) die fachlichen Voraussetzungen nicht selbst erfüllt", true, "Der Geschäftsführer bringt den Befähigungsnachweis ein."],
    ["Immer, bei jedem Gewerbe", false, "Erfüllt der Inhaber die Voraussetzungen, ist keiner nötig."],
    ["Nur bei mehr als 50 Mitarbeitern", false, "Die Mitarbeiterzahl ist kein Kriterium."],
    ["Nie, das gibt es nur im Handelsrecht", false, "Der gewerberechtliche Geschäftsführer ist in der GewO geregelt."],
  ], "Juristische Personen müssen immer einen gewerberechtlichen Geschäftsführer bestellen; er ist für die Einhaltung der gewerberechtlichen Vorschriften verantwortlich.", "§ 9, § 39 GewO"),
  q("go-04", "k-gewerbeordnung", "gewerbearten", "EASY", "Wo erfolgt heute die Gewerbeanmeldung und Registrierung?", [
    ["Bei der Gewerbebehörde, erfasst im Gewerbeinformationssystem Austria (GISA)", true, "GISA ist das zentrale Gewerberegister."],
    ["Beim Bezirksgericht", false, "Gerichte sind nicht Gewerbebehörde."],
    ["Bei der Polizei", false, "Die Polizei ist nicht zuständig."],
    ["Beim Finanzamt allein", false, "Das Finanzamt erhält Meldungen, ist aber nicht Gewerbebehörde."],
  ], "Gewerbebehörde ist die Bezirksverwaltungsbehörde (in Wien der Magistrat); die Daten werden im GISA geführt."),

  // ───────────── 12. Wirtschaftskammerrecht ─────────────
  q("wk-01", "k-wirtschaftskammer", "mitgliedschaft", "EASY", "Wer ist Mitglied der Wirtschaftskammer?", [
    ["Alle Inhaber einer Gewerbeberechtigung (Pflichtmitgliedschaft)", true, "Mit der Gewerbeberechtigung entsteht die Mitgliedschaft automatisch."],
    ["Nur wer freiwillig beitritt", false, "Es besteht Pflichtmitgliedschaft."],
    ["Nur Arbeitnehmer", false, "Arbeitnehmer gehören zur Arbeiterkammer."],
    ["Nur Unternehmen mit über 10 Mitarbeitern", false, "Die Größe spielt keine Rolle."],
  ], "Mitglieder der Wirtschaftskammern sind alle physischen und juristischen Personen, die zum selbständigen Betrieb eines Gewerbes berechtigt sind.", "§ 2 WKG"),
  q("wk-02", "k-wirtschaftskammer", "mitgliedschaft", "EASY", "Welchen Beitrag zahlen Mitglieder an ihre Fachorganisation?", [
    ["Die Grundumlage", true, "Sie wird von der Fachgruppe festgesetzt."],
    ["Die Kommunalsteuer", false, "Die geht an die Gemeinde."],
    ["Die Umsatzsteuer", false, "Die geht an das Finanzamt."],
    ["Die Gewerkschaftsbeiträge", false, "Diese zahlen Arbeitnehmer an die Gewerkschaft."],
  ], "Die Kammermitglieder zahlen Grundumlagen an die Fachorganisationen und Kammerumlagen."),
  q("wk-03", "k-wirtschaftskammer", "aufbau", "MEDIUM", "Wie ist die Wirtschaftskammer gegliedert?", [
    ["Bundeskammer und Landeskammern, jeweils in Sparten und Fachorganisationen", true, "Taxiunternehmen gehören zur Sparte Transport und Verkehr."],
    ["Nur eine einzige Kammer in Wien", false, "Es gibt neun Landeskammern und die Bundeskammer."],
    ["Nach Bezirken ohne Sparten", false, "Die Gliederung erfolgt nach Branchen (Sparten)."],
    ["Nach Parteien", false, "Gliederung nach Branchen, nicht nach Parteien."],
  ], "Taxiunternehmer sind in der Sparte Transport und Verkehr, Fachgruppe der Beförderungsgewerbe mit Personenkraftwagen, organisiert."),

  // ───────────── 13. Gesellschafts- und Handelsrecht ─────────────
  q("gr-01", "k-gesellschaftsrecht", "rechtsformen", "MEDIUM", "Wie hoch ist das gesetzliche Mindeststammkapital einer GmbH?", [
    ["10.000 €", true, "Seit 2024 beträgt das Mindeststammkapital 10.000 €, davon sind mindestens 5.000 € bar einzuzahlen."],
    ["1 €", false, "Das gilt in Österreich nicht."],
    ["35.000 € ohne Ausnahme", false, "Das war die frühere Höhe."],
    ["100.000 €", false, "Viel zu hoch."],
  ], "Mit dem Gesellschaftsrechts-Änderungsgesetz 2023 wurde das Mindeststammkapital auf 10.000 € gesenkt.", "§ 6 GmbHG"),
  q("gr-02", "k-gesellschaftsrecht", "rechtsformen", "EASY", "Wie haften die Gesellschafter einer Offenen Gesellschaft (OG)?", [
    ["Unbeschränkt, persönlich und solidarisch", true, "Jeder Gesellschafter haftet mit seinem gesamten Vermögen."],
    ["Nur mit der Einlage", false, "Das gilt für Kommanditisten einer KG."],
    ["Gar nicht", false, "Die Gesellschafter haften persönlich."],
    ["Nur bis 10.000 €", false, "Es gibt keine Haftungsgrenze."],
  ], "Bei der OG haften alle Gesellschafter unbeschränkt; bei der KG haftet nur der Komplementär unbeschränkt.", "§ 128 UGB"),
  q("gr-03", "k-gesellschaftsrecht", "firmenbuch", "MEDIUM", "Wo wird das Firmenbuch geführt?", [
    ["Bei den Landesgerichten (in Wien: Handelsgericht Wien)", true, "Das Firmenbuch ist ein öffentliches Verzeichnis."],
    ["Bei der Wirtschaftskammer", false, "Die WKO führt kein Firmenbuch."],
    ["Beim Finanzamt", false, "Das Finanzamt ist nicht zuständig."],
    ["Beim Bezirksamt", false, "Nicht zuständig."],
  ], "Firmenbuchgerichte sind die Landesgerichte bzw. in Wien das Handelsgericht Wien."),
  q("gr-04", "k-gesellschaftsrecht", "firmenbuch", "HARD", "Was ist eine Prokura?", [
    ["Eine umfassende, im Firmenbuch eingetragene Vertretungsmacht für fast alle Geschäfte", true, "Ausgenommen sind z. B. Grundstücksveräußerungen ohne besondere Befugnis."],
    ["Eine Gewerbeberechtigung", false, "Die Prokura ist eine Vollmacht."],
    ["Eine Steuerart", false, "Hat nichts mit Steuern zu tun."],
    ["Ein Kreditvertrag", false, "Hat nichts mit Krediten zu tun."],
  ], "Die Prokura ist eine handelsrechtliche Vollmacht, die nur von Unternehmern erteilt und ins Firmenbuch eingetragen wird.", "§ 48, § 49 UGB"),

  // ───────────── 14. Bürgerliches Recht ─────────────
  q("br-01", "k-buergerliches-recht", "vertraege", "EASY", "Wie kommt ein Vertrag zustande?", [
    ["Durch übereinstimmende Willenserklärungen (Angebot und Annahme)", true, "Ein Vertrag braucht Konsens der Parteien."],
    ["Nur durch notarielle Beurkundung", false, "Die meisten Verträge sind formfrei."],
    ["Nur schriftlich", false, "Auch mündliche oder schlüssige Verträge sind wirksam."],
    ["Durch Zahlung allein", false, "Die Zahlung ist Erfüllung, nicht Abschluss."],
  ], "Grundsatz der Formfreiheit: Verträge entstehen durch Angebot und Annahme, auch mündlich oder durch schlüssiges Verhalten.", "§ 861 ABGB"),
  q("br-02", "k-buergerliches-recht", "vertraege", "MEDIUM", "Welche Vertragsart ist eine Taxifahrt rechtlich am ehesten?", [
    ["Ein Werkvertrag (Beförderungsvertrag)", true, "Geschuldet ist der Erfolg: die Beförderung zum Ziel."],
    ["Ein Kaufvertrag", false, "Es wird keine Sache übereignet."],
    ["Ein Mietvertrag", false, "Der Fahrgast mietet das Fahrzeug nicht."],
    ["Ein Arbeitsvertrag", false, "Der Fahrgast ist nicht Arbeitgeber."],
  ], "Der Beförderungsvertrag ist ein Werkvertrag: Der Unternehmer schuldet die Beförderung zum vereinbarten Ziel."),
  q("br-03", "k-buergerliches-recht", "gewaehrleistung", "MEDIUM", "Wie lange beträgt die Gewährleistungsfrist für bewegliche Sachen?", [
    ["2 Jahre", true, "Für bewegliche Sachen gilt eine Frist von zwei Jahren."],
    ["6 Monate", false, "Das ist zu kurz."],
    ["5 Jahre", false, "Das ist zu lang."],
    ["30 Jahre", false, "Das ist die lange Verjährungsfrist für andere Ansprüche."],
  ], "Die Gewährleistungsfrist beträgt bei beweglichen Sachen 2 Jahre, bei unbeweglichen 3 Jahre.", "§ 933 ABGB"),
  q("br-04", "k-buergerliches-recht", "gewaehrleistung", "HARD", "Innerhalb welcher Frist verjähren Schadenersatzansprüche grundsätzlich?", [
    ["3 Jahre ab Kenntnis von Schaden und Schädiger", true, "Unabhängig davon spätestens nach 30 Jahren."],
    ["1 Monat", false, "Viel zu kurz."],
    ["1 Jahr ab Schadenseintritt", false, "Die Frist ist länger."],
    ["Sie verjähren nie", false, "Ansprüche verjähren."],
  ], "Schadenersatzansprüche verjähren in 3 Jahren ab Kenntnis von Schaden und Schädiger.", "§ 1489 ABGB"),

  // ───────────── 15. Marketing ─────────────
  q("mk-01", "k-marketing", "marketing-mix", "EASY", "Woraus besteht der klassische Marketing-Mix (4 P)?", [
    ["Produkt, Preis, Vertrieb (Place), Kommunikation (Promotion)", true, "Die vier Instrumente des Marketing-Mix."],
    ["Personal, Planung, Prüfung, Pause", false, "Das ist nicht der Marketing-Mix."],
    ["Nur Werbung", false, "Werbung ist nur ein Teil der Kommunikation."],
    ["Preis, Pünktlichkeit, Parkplatz, Polizei", false, "Das ist kein Marketing-Konzept."],
  ], "Der Marketing-Mix umfasst Produkt- (Leistung), Preis-, Distributions- und Kommunikationspolitik."),
  q("mk-02", "k-marketing", "marketing-mix", "EASY", "Was ist eine Zielgruppe?", [
    ["Eine klar abgegrenzte Kundengruppe, die angesprochen werden soll", true, "Z. B. Geschäftsreisende oder Flughafenkunden."],
    ["Das Fahrziel eines Fahrgastes", false, "Hat nichts mit Marketing zu tun."],
    ["Die Konkurrenz", false, "Die Konkurrenz ist keine Zielgruppe."],
    ["Alle Menschen ohne Unterschied", false, "Eine Zielgruppe ist gerade eingegrenzt."],
  ], "Marketingmaßnahmen sind wirksamer, wenn sie auf eine bestimmte Zielgruppe ausgerichtet sind."),
  q("mk-03", "k-marketing", "marketing-mix", "MEDIUM", "Welche Maßnahme dient vor allem der Kundenbindung?", [
    ["Freundlicher, zuverlässiger Service und Stammkunden-Angebote", true, "Zufriedene Kunden kommen wieder und empfehlen weiter."],
    ["Umwege fahren", false, "Schadet dem Vertrauen."],
    ["Fahrten ablehnen", false, "Verärgert Kunden."],
    ["Keine Belege ausstellen", false, "Ist zudem rechtswidrig."],
  ], "Kundenbindung entsteht durch Qualität, Freundlichkeit, Pünktlichkeit und Vertrauen."),

  // ───────────── 16. Umweltschutz ─────────────
  q("us-01", "k-umweltschutz", "fahrweise", "EASY", "Welche Fahrweise spart Treibstoff?", [
    ["Vorausschauend fahren, früh hochschalten, Leerlauf vermeiden", true, "Das senkt Verbrauch und Emissionen."],
    ["Motor im Stand laufen lassen", false, "Leerlauf verschwendet Treibstoff."],
    ["Häufig stark beschleunigen", false, "Erhöht den Verbrauch deutlich."],
    ["Mit zu wenig Reifendruck fahren", false, "Erhöht den Rollwiderstand und Verbrauch."],
  ], "Spritsparend fahren: vorausschauend, niedertourig, richtiger Reifendruck, unnötige Lasten vermeiden, Motor bei längeren Stopps abstellen."),
  q("us-02", "k-umweltschutz", "abfall", "MEDIUM", "Wie ist Altöl zu entsorgen?", [
    ["Als gefährlicher Abfall bei einer befugten Sammelstelle", true, "Altöl darf nicht in Kanal oder Hausmüll."],
    ["Im Hausmüll", false, "Verboten – Altöl ist gefährlicher Abfall."],
    ["In den Kanal", false, "Schwere Umweltgefährdung und verboten."],
    ["Im Straßengraben", false, "Verboten und strafbar."],
  ], "Altöl, Batterien und ähnliche Stoffe sind gefährliche Abfälle und an befugte Sammler zu übergeben."),
  q("us-03", "k-umweltschutz", "fahrweise", "EASY", "Welcher Antrieb verursacht im Fahrbetrieb keine lokalen Abgase?", [
    ["Elektroantrieb", true, "E-Fahrzeuge fahren lokal emissionsfrei."],
    ["Dieselmotor", false, "Erzeugt Abgase."],
    ["Benzinmotor", false, "Erzeugt Abgase."],
    ["Autogas (LPG)", false, "Erzeugt ebenfalls Abgase."],
  ], "Elektrofahrzeuge sind lokal emissionsfrei; viele Städte fördern E-Taxis."),

  // ───────────── 17. Kalkulation ─────────────
  q("ka-01", "k-kalkulation", "preis", "MEDIUM", "Welche Reihenfolge ergibt den Bruttopreis?", [
    ["Selbstkosten + Gewinnaufschlag = Nettopreis; + Umsatzsteuer = Bruttopreis", true, "So wird kalkuliert."],
    ["Umsatzsteuer + Gewinn = Selbstkosten", false, "Falsche Reihenfolge."],
    ["Bruttopreis − Selbstkosten = Umsatzsteuer", false, "Falsch gerechnet."],
    ["Nettopreis − Umsatzsteuer = Bruttopreis", false, "Die Umsatzsteuer wird aufgeschlagen, nicht abgezogen."],
  ], "Kalkulationsschema: Selbstkosten + Gewinn = Nettoverkaufspreis; + USt = Bruttoverkaufspreis."),
  q("ka-02", "k-kalkulation", "preis", "MEDIUM", "Welcher Umsatzsteuersatz gilt für die Personenbeförderung mit dem Taxi im Inland?", [
    ["10 %", true, "Für die Personenbeförderung gilt der ermäßigte Steuersatz von 10 %."],
    ["20 %", false, "Das ist der Normalsteuersatz."],
    ["0 %", false, "Die Personenbeförderung ist nicht steuerfrei."],
    ["13 %", false, "Dieser Satz gilt für andere Leistungen."],
  ], "Die Beförderung von Personen mit Taxis unterliegt dem ermäßigten Steuersatz von 10 %.", "§ 10 Abs. 2 UStG"),
  q("ka-03", "k-kalkulation", "preis", "HARD", "Ein Bruttofahrpreis beträgt 22 € (10 % USt). Wie hoch ist der Nettobetrag?", [
    ["20,00 €", true, "22 € / 1,10 = 20 € netto, 2 € Umsatzsteuer."],
    ["19,80 €", false, "Man darf nicht einfach 10 % vom Brutto abziehen."],
    ["24,20 €", false, "Das wäre der Bruttopreis von 22 € netto."],
    ["17,60 €", false, "Falsch gerechnet."],
  ], "Netto = Brutto / (1 + Steuersatz) = 22 / 1,10 = 20 €. Die Umsatzsteuer beträgt 2 €."),

  // ───────────── 18. Versicherungsrecht ─────────────
  q("vr-01", "k-versicherungsrecht", "kfz", "EASY", "Welche Kfz-Versicherung ist gesetzlich verpflichtend?", [
    ["Die Kfz-Haftpflichtversicherung", true, "Ohne sie darf kein Kfz zugelassen werden."],
    ["Die Vollkaskoversicherung", false, "Kasko ist freiwillig."],
    ["Die Insassenunfallversicherung", false, "Freiwillig."],
    ["Die Rechtsschutzversicherung", false, "Freiwillig."],
  ], "Die Kfz-Haftpflichtversicherung deckt Schäden, die mit dem Fahrzeug Dritten zugefügt werden, und ist Voraussetzung für die Zulassung.", "§ 59 KFG; KHVG"),
  q("vr-02", "k-versicherungsrecht", "kfz", "MEDIUM", "Was deckt die Vollkaskoversicherung zusätzlich zur Teilkasko?", [
    ["Selbst verschuldete Schäden am eigenen Fahrzeug und Vandalismus", true, "Teilkasko deckt z. B. Diebstahl, Elementarschäden, Glasbruch."],
    ["Schäden an fremden Fahrzeugen", false, "Das deckt die Haftpflicht."],
    ["Strafen der Polizei", false, "Strafen sind nicht versicherbar."],
    ["Treibstoffkosten", false, "Keine Versicherungsleistung."],
  ], "Vollkasko deckt auch selbst verschuldete Unfallschäden am eigenen Fahrzeug sowie mut- oder böswillige Beschädigung."),
  q("vr-03", "k-versicherungsrecht", "betrieb", "MEDIUM", "Was versteht man unter dem Bonus-Malus-System?", [
    ["Die Prämie sinkt bei schadenfreiem Fahren und steigt nach verschuldeten Schäden", true, "Es belohnt unfallfreies Fahren."],
    ["Ein Punktesystem für Verkehrsstrafen", false, "Das ist das Vormerksystem."],
    ["Ein Tarifsystem für Taxifahrten", false, "Hat nichts mit Fahrpreisen zu tun."],
    ["Eine Steuer auf Fahrzeuge", false, "Keine Steuer."],
  ], "Das Bonus-Malus-System stuft die Haftpflichtprämie nach dem Schadenverlauf ein."),

  // ───────────── 19. Insolvenzrecht ─────────────
  q("in-01", "k-insolvenzrecht", "verfahren", "MEDIUM", "Was sind die Eröffnungsgründe eines Insolvenzverfahrens?", [
    ["Zahlungsunfähigkeit (bei juristischen Personen auch Überschuldung)", true, "Das sind die gesetzlichen Insolvenzgründe."],
    ["Ein schlechtes Geschäftsjahr", false, "Ein Verlust allein ist kein Insolvenzgrund."],
    ["Ein Streit mit einem Kunden", false, "Kein Insolvenzgrund."],
    ["Die Kündigung eines Mitarbeiters", false, "Kein Insolvenzgrund."],
  ], "Insolvenzgründe sind Zahlungsunfähigkeit und – bei juristischen Personen und Verlassenschaften – Überschuldung.", "§ 66, § 67 IO"),
  q("in-02", "k-insolvenzrecht", "pflichten", "HARD", "Innerhalb welcher Frist muss bei Zahlungsunfähigkeit spätestens der Insolvenzantrag gestellt werden?", [
    ["Ohne schuldhaftes Zögern, spätestens 60 Tage nach Eintritt", true, "Die Antragspflicht trifft insbesondere Geschäftsführer."],
    ["Innerhalb eines Jahres", false, "Viel zu spät."],
    ["Nur wenn ein Gläubiger es verlangt", false, "Es besteht eine eigene Antragspflicht."],
    ["Es gibt keine Frist", false, "Die Frist ist gesetzlich festgelegt."],
  ], "Der Antrag ist ohne schuldhaftes Zögern, spätestens 60 Tage nach Eintritt der Zahlungsunfähigkeit zu stellen.", "§ 69 IO"),
  q("in-03", "k-insolvenzrecht", "pflichten", "MEDIUM", "Wer sichert offene Lohnansprüche der Arbeitnehmer bei Insolvenz des Arbeitgebers?", [
    ["Der Insolvenz-Entgelt-Fonds (IEF)", true, "Er übernimmt gesicherte Ansprüche."],
    ["Die Wirtschaftskammer", false, "Nicht zuständig."],
    ["Das Finanzamt", false, "Nicht zuständig."],
    ["Niemand", false, "Es gibt eine gesetzliche Absicherung."],
  ], "Das Insolvenz-Entgeltsicherungsgesetz sichert offene Entgeltansprüche über den IEF."),
  q("in-04", "k-insolvenzrecht", "verfahren", "MEDIUM", "Was ist das Ziel eines Sanierungsverfahrens?", [
    ["Das Unternehmen fortzuführen, wobei die Gläubiger eine Quote erhalten", true, "Im Gegensatz zum Konkurs wird nicht zerschlagen."],
    ["Das Unternehmen sofort zu schließen", false, "Das ist eher Folge eines Konkurses."],
    ["Die Gläubiger komplett leer ausgehen zu lassen", false, "Die Gläubiger erhalten eine Mindestquote."],
    ["Die Steuern zu erlassen", false, "Kein Ziel des Verfahrens."],
  ], "Im Sanierungsverfahren wird ein Sanierungsplan mit Mindestquote angeboten, damit das Unternehmen weitergeführt werden kann."),

  // ───────────── 20. Lenkprotokoll ─────────────
  q("lp-01", "k-lenkprotokoll", "aufzeichnung", "EASY", "Wozu dient das Lenkprotokoll im Taxibetrieb?", [
    ["Zur Aufzeichnung von Dienstbeginn, Dienstende, Lenk- und Ruhezeiten", true, "So lässt sich die Einhaltung der Arbeitszeitvorschriften prüfen."],
    ["Zur Abrechnung der Umsatzsteuer", false, "Dafür dienen Belege und Buchhaltung."],
    ["Zur Aufzeichnung der Fahrgastnamen", false, "Das ist nicht der Zweck."],
    ["Als Ersatz für den Führerschein", false, "Ersetzt keine Dokumente."],
  ], "Aufzeichnungen über Arbeits-, Lenk- und Ruhezeiten dienen dem Schutz der Lenker und der Verkehrssicherheit."),
  q("lp-02", "k-lenkprotokoll", "aufzeichnung", "MEDIUM", "Wer trägt die Verantwortung dafür, dass Arbeitszeitaufzeichnungen geführt werden?", [
    ["Der Arbeitgeber (Unternehmer)", true, "Er muss für die Aufzeichnungen sorgen und sie aufbewahren."],
    ["Nur der Fahrgast", false, "Der Fahrgast hat damit nichts zu tun."],
    ["Die Funkzentrale", false, "Nicht verantwortlich."],
    ["Die Polizei", false, "Die Polizei kontrolliert nur."],
  ], "Der Arbeitgeber hat Aufzeichnungen über die geleisteten Arbeitsstunden zu führen bzw. führen zu lassen.", "§ 26 AZG"),
  q("lp-03", "k-lenkprotokoll", "aufzeichnung", "EASY", "Was sollte man mit Lenkaufzeichnungen bei einer Kontrolle tun?", [
    ["Den Kontrollorganen auf Verlangen vorweisen", true, "Aufzeichnungen müssen kontrollierbar sein."],
    ["Verweigern", false, "Das kann Strafen nach sich ziehen."],
    ["Nachträglich ändern", false, "Manipulation ist verboten."],
    ["Wegwerfen", false, "Aufzeichnungen sind aufzubewahren."],
  ], "Aufzeichnungen müssen vollständig, wahrheitsgemäß und für Kontrollen verfügbar sein."),

  // ───────────── 21. Gelegenheitsverkehrsgesetz ─────────────
  q("gv-01", "k-gelegenheitsverkehrsgesetz", "konzession", "MEDIUM", "Welche Voraussetzungen braucht man für die Taxikonzession nach dem GelverkG?", [
    ["Zuverlässigkeit, finanzielle Leistungsfähigkeit und fachliche Eignung", true, "Das sind die besonderen Voraussetzungen."],
    ["Nur einen Führerschein", false, "Das reicht nicht."],
    ["Nur ein eigenes Fahrzeug", false, "Das reicht nicht."],
    ["Mitgliedschaft bei einer Funkzentrale", false, "Keine gesetzliche Voraussetzung."],
  ], "Die Konzession setzt Zuverlässigkeit, finanzielle Leistungsfähigkeit und fachliche Eignung (Konzessionsprüfung) voraus.", "§ 5 GelverkG"),
  q("gv-02", "k-gelegenheitsverkehrsgesetz", "lenker", "EASY", "Was braucht ein Lenker, um ein Taxi lenken zu dürfen?", [
    ["Einen gültigen Taxilenkerausweis", true, "Er wird nach bestandener Prüfung ausgestellt."],
    ["Nur einen Moped-Führerschein", false, "Nicht ausreichend."],
    ["Einen Reisepass", false, "Kein Nachweis der Befähigung."],
    ["Eine Konzession", false, "Die Konzession braucht der Unternehmer, der Lenker braucht den Ausweis."],
  ], "Taxilenker benötigen einen Ausweis (Taxilenkerausweis), der nach Ablegung der Prüfung ausgestellt wird.", "§ 6 GelverkG; BO"),
  q("gv-03", "k-gelegenheitsverkehrsgesetz", "konzession", "MEDIUM", "Welche Gewerbe wurden 2021 zum „Personenbeförderungsgewerbe mit Pkw – Taxi“ zusammengeführt?", [
    ["Taxi- und Mietwagengewerbe", true, "Seit 2021 gibt es ein einheitliches Gewerbe."],
    ["Taxi- und Busgewerbe", false, "Das Busgewerbe ist separat geregelt."],
    ["Taxi und Lkw-Transport", false, "Güterbeförderung ist ein anderes Gewerbe."],
    ["Taxi und Fahrschule", false, "Fahrschulen sind separat geregelt."],
  ], "Mit der GelverkG-Novelle wurden Taxi- und Mietwagengewerbe zu einem einheitlichen Gewerbe zusammengelegt."),
  q("gv-04", "k-gelegenheitsverkehrsgesetz", "konzession", "HARD", "Welche Behörde erteilt in Wien die Konzession für das Taxigewerbe?", [
    ["Der Magistrat der Stadt Wien als Gewerbebehörde", true, "In Wien ist der Magistrat Bezirksverwaltungsbehörde."],
    ["Das Bundesministerium für Finanzen", false, "Nicht zuständig."],
    ["Die Wirtschaftskammer", false, "Die WKO erteilt keine Konzessionen."],
    ["Das Bezirksgericht", false, "Gerichte sind nicht zuständig."],
  ], "Konzessionsbehörde ist die Bezirksverwaltungsbehörde, in Wien der Magistrat."),

  // ───────────── 22. Registrierkassa ─────────────
  q("rk-01", "k-registrierkassa", "pflicht", "MEDIUM", "Ab wann besteht die Registrierkassenpflicht?", [
    ["Ab 15.000 € Jahresumsatz je Betrieb, wenn die Barumsätze 7.500 € übersteigen", true, "Beide Grenzen müssen überschritten sein."],
    ["Ab dem ersten Euro Umsatz", false, "Ab dem ersten Euro gilt die Belegerteilungspflicht, nicht die Kassenpflicht."],
    ["Ab 100.000 € Jahresumsatz", false, "Die Grenze ist deutlich niedriger."],
    ["Nur für GmbHs", false, "Gilt unabhängig von der Rechtsform."],
  ], "Registrierkassenpflicht: Jahresumsatz ab 15.000 € je Betrieb und davon Barumsätze über 7.500 € (Barumsätze umfassen auch Karten- und Bankomatzahlungen).", "§ 131b BAO"),
  q("rk-02", "k-registrierkassa", "beleg", "EASY", "Ab welchem Betrag muss dem Fahrgast ein Beleg ausgestellt werden?", [
    ["Ab dem ersten Euro bei jeder Barzahlung", true, "Es gilt die Belegerteilungspflicht."],
    ["Ab 10 €", false, "Es gibt keine Mindestgrenze."],
    ["Ab 400 €", false, "Das betrifft Kleinbetragsrechnungen, nicht die Belegpflicht."],
    ["Nur auf Verlangen", false, "Der Beleg ist unaufgefordert auszustellen."],
  ], "Unternehmer müssen bei Barzahlung einen Beleg ausstellen; der Kunde muss ihn mitnehmen.", "§ 132a BAO"),
  q("rk-03", "k-registrierkassa", "beleg", "MEDIUM", "Wie wird eine Registrierkasse gegen Manipulation geschützt?", [
    ["Durch eine technische Sicherheitseinrichtung mit elektronischer Signatur", true, "Jeder Beleg erhält eine Signatur (QR-Code)."],
    ["Durch ein Vorhängeschloss", false, "Das ist kein gesetzlicher Manipulationsschutz."],
    ["Durch tägliches Ausdrucken aller Umsätze", false, "Reicht nicht."],
    ["Gar nicht", false, "Der Schutz ist gesetzlich vorgeschrieben."],
  ], "Nach der Registrierkassensicherheitsverordnung (RKSV) muss jede Kasse eine Sicherheitseinrichtung haben; der Startbeleg wird mit der BMF-Belegcheck-App geprüft."),
  q("rk-04", "k-registrierkassa", "beleg", "MEDIUM", "Welche Belege müssen bei einer Registrierkasse zusätzlich erstellt und geprüft werden?", [
    ["Startbeleg, Monatsbelege und Jahresbeleg", true, "Der Jahresbeleg ist mit der Belegcheck-App zu prüfen und aufzubewahren."],
    ["Nur ein Wochenbeleg", false, "Gibt es nicht."],
    ["Nur ein Beleg pro Fahrgast und Jahr", false, "Falsch."],
    ["Keine", false, "Diese Sonderbelege sind vorgeschrieben."],
  ], "Sonderbelege nach RKSV: Startbeleg, Monatsbeleg, Jahresbeleg (= Monatsbeleg Dezember), ggf. Null- und Schlussbeleg."),

  // ───────────── 23. Verkehrsgeographie ─────────────
  q("vg-01", "k-verkehrsgeographie", "oesterreich", "EASY", "Wie viele Bundesländer hat Österreich?", [
    ["9", true, "Wien, NÖ, OÖ, Salzburg, Tirol, Vorarlberg, Kärnten, Steiermark, Burgenland."],
    ["7", false, "Zu wenig."],
    ["10", false, "Zu viel."],
    ["12", false, "Zu viel."],
  ], "Österreich hat neun Bundesländer; Wien ist zugleich Bundesland und Bundeshauptstadt."),
  q("vg-02", "k-verkehrsgeographie", "oesterreich", "EASY", "Was ist die Landeshauptstadt von Niederösterreich?", [
    ["St. Pölten", true, "Seit 1986 Landeshauptstadt."],
    ["Wiener Neustadt", false, "Nicht die Landeshauptstadt."],
    ["Krems", false, "Nicht die Landeshauptstadt."],
    ["Eisenstadt", false, "Das ist die Hauptstadt des Burgenlands."],
  ], "Landeshauptstädte: St. Pölten (NÖ), Eisenstadt (Bgld), Linz (OÖ), Graz (Stmk), Klagenfurt (Ktn), Salzburg, Innsbruck (T), Bregenz (Vbg)."),
  q("vg-03", "k-verkehrsgeographie", "wien-verkehr", "EASY", "In welchem Ort liegt der Flughafen Wien?", [
    ["Schwechat (Niederösterreich)", true, "Der Flughafen liegt außerhalb der Stadtgrenze in Schwechat."],
    ["Wien-Floridsdorf", false, "Dort liegt kein Verkehrsflughafen."],
    ["Mödling", false, "Falsch."],
    ["Tulln", false, "Falsch."],
  ], "Der Flughafen Wien-Schwechat liegt in Niederösterreich und ist über die A4 (Ost Autobahn) erreichbar."),
  q("vg-04", "k-verkehrsgeographie", "wien-verkehr", "MEDIUM", "Welche Autobahn führt von Wien zum Flughafen Schwechat?", [
    ["A4 – Ost Autobahn", true, "Sie verbindet Wien mit dem Flughafen und Richtung Ungarn."],
    ["A1 – West Autobahn", false, "Führt nach Westen Richtung Linz."],
    ["A2 – Süd Autobahn", false, "Führt nach Süden Richtung Graz."],
    ["A22 – Donauufer Autobahn", false, "Führt entlang der Donau nach Norden."],
  ], "A4 Ost Autobahn: Wien – Flughafen Schwechat – Nickelsdorf (Ungarn)."),

  // ───────────── 24. Europäisches Sozialrecht ─────────────
  q("eu-01", "k-eu-sozialrecht", "koordinierung", "MEDIUM", "Welcher Grundsatz gilt bei der Koordinierung der Sozialversicherung in der EU?", [
    ["Man ist grundsätzlich nur in einem Staat versichert – meist im Beschäftigungsstaat", true, "So werden Doppelversicherungen vermieden."],
    ["Man ist immer in allen EU-Staaten versichert", false, "Das soll gerade vermieden werden."],
    ["Man ist immer im Heimatstaat versichert", false, "Grundsätzlich gilt das Beschäftigungslandprinzip."],
    ["Es gibt keine Regeln", false, "Die Koordinierung ist EU-weit geregelt."],
  ], "Nach der EU-Verordnung 883/2004 gelten die Rechtsvorschriften nur eines Staates – grundsätzlich des Beschäftigungsstaates.", "VO (EG) 883/2004"),
  q("eu-02", "k-eu-sozialrecht", "dokumente", "EASY", "Was ermöglicht die Europäische Krankenversicherungskarte (EKVK)?", [
    ["Medizinisch notwendige Behandlung bei vorübergehendem Aufenthalt in einem anderen EU-Staat", true, "Sie befindet sich auf der Rückseite der e-card."],
    ["Kostenlose Taxifahrten in der EU", false, "Hat nichts damit zu tun."],
    ["Eine Arbeitserlaubnis", false, "Ist keine Arbeitserlaubnis."],
    ["Steuerfreiheit im Ausland", false, "Keine steuerliche Wirkung."],
  ], "Die EKVK (Rückseite der e-card) sichert notwendige Behandlungen während eines vorübergehenden Aufenthalts im EU/EWR-Ausland und der Schweiz."),
  q("eu-03", "k-eu-sozialrecht", "dokumente", "MEDIUM", "Wofür dient die A1-Bescheinigung?", [
    ["Als Nachweis, welchem Sozialversicherungssystem man bei Entsendung ins EU-Ausland angehört", true, "Sie verhindert eine Doppelversicherung."],
    ["Als Führerscheinklasse", false, "Hat nichts mit dem Führerschein zu tun."],
    ["Als Gewerbeschein", false, "Kein Gewerbedokument."],
    ["Als Steuerbescheid", false, "Kein Steuerdokument."],
  ], "Die A1-Bescheinigung bestätigt bei Entsendung oder Tätigkeit in mehreren Staaten die anzuwendenden Rechtsvorschriften."),

  // ───────────── 25. Sonstige Fragen ─────────────
  q("so-01", "k-sonstige", "allgemein", "EASY", "Welche Notrufnummer hat die Rettung in Österreich?", [
    ["144", true, "Rettung: 144."],
    ["133", false, "Das ist die Polizei."],
    ["122", false, "Das ist die Feuerwehr."],
    ["140", false, "Das ist die Bergrettung."],
  ], "Notrufnummern: 112 Euro-Notruf, 122 Feuerwehr, 133 Polizei, 144 Rettung, 140 Bergrettung, 141 Ärztefunkdienst."),
  q("so-02", "k-sonstige", "allgemein", "MEDIUM", "Welche Regel gilt für Daten von Fahrgästen (z. B. Abholadressen in der App)?", [
    ["Sie dürfen nur zweckgebunden verarbeitet und müssen geschützt werden (DSGVO)", true, "Personenbezogene Daten sind geschützt."],
    ["Man darf sie frei weitergeben", false, "Verstößt gegen den Datenschutz."],
    ["Man darf sie in sozialen Medien posten", false, "Verboten."],
    ["Datenschutz gilt nicht für Taxis", false, "Die DSGVO gilt auch für Taxiunternehmen."],
  ], "Die DSGVO verlangt Zweckbindung, Datenminimierung und Schutz personenbezogener Daten."),
  q("so-03", "k-sonstige", "allgemein", "EASY", "Welche Nummer ist der europaweite Notruf?", [
    ["112", true, "Der Euro-Notruf funktioniert in allen EU-Staaten."],
    ["911", false, "Das ist der Notruf in Nordamerika."],
    ["999", false, "Das ist u. a. in Großbritannien gebräuchlich."],
    ["110", false, "Das ist in Deutschland die Polizei."],
  ], "112 ist die einheitliche europäische Notrufnummer – auch ohne SIM-Karte bzw. mit gesperrtem Handy erreichbar."),
];

/**
 * Nur die 25 Kapitel des Skripts sind aktiv. Bestehende Kategorien, die einem Kapitel entsprechen,
 * werden umbenannt und eingereiht; alle anderen werden deaktiviert (nicht gelöscht – Fortschritt bleibt erhalten).
 */
export const BOOK_CHAPTERS: Record<string, { name: string; order: number }> = {
  steuerrecht: { name: "Steuerrecht", order: 4 },
  arbeitsrecht: { name: "Arbeits- und Sozialrecht", order: 8 },
};

export function isBookCategory(slug: string): boolean {
  return slug.startsWith("k-") || slug in BOOK_CHAPTERS;
}

/** Mündliche Startfragen: Zuordnung zu den Kapiteln. */
export const ORAL_CHAPTER: Record<string, string> = {
  verkehrsrecht: "k-sonstige",
  stvo: "k-sonstige",
  gewerberecht: "k-gelegenheitsverkehrsgesetz",
  berufskunde: "k-betriebsordnung-tarif",
  fahrzeugkunde: "k-sonstige",
  kundenbetreuung: "k-sonstige",
  steuerrecht: "k-registrierkassa",
};

/** Frühere eigene Übungsfragen, die durch Skript-Fragen ersetzt wurden (werden archiviert). */
export const RETIRED_QUESTION_IDS = ["kz-rw-01", "kz-rw-02", "kz-rw-03", "kz-rw-04", "kz-rw-05", "rwb-01b", "rwb-02b", "rwb-07b", "rwb-18b", "rwb-26b", "rwb-27b", "rwb-43b", "rwb-43c", "kz-bb-01", "kz-bb-02", "kz-bb-03", "kz-bb-04", "kz-pv-01", "kz-pv-02", "kz-pv-03", "kz-pv-04", "demo-steuer-01", "demo-steuer-02", "demo-steuer-03", "demo-steuer-04", "demo-steuer-05", "demo-steuer-06", "demo-steuer-07", "kz-vk-01", "kz-vk-02", "kz-vk-03", "kz-vk-04", "kz-db-01", "kz-db-02", "kz-db-03", "kz-db-04", "kz-fi-01", "kz-fi-02", "kz-fi-03", "kz-fi-04"];
