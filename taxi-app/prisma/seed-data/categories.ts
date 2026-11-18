/**
 * Kategorien für Wien. Der Prüfungsstoff ist NICHT als verifiziert markiert –
 * er muss vom Betreiber mit den aktuellen offiziellen Vorgaben abgeglichen werden.
 */
export interface SeedCategory {
  slug: string;
  name: string;
  shortDescription: string;
  introduction: string;
  color: string;
  icon: string;
  order: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topics: { slug: string; name: string; description: string }[];
}

const SYLLABUS_NOTE =
  "Zuordnung zum Prüfungsstoff noch nicht verifiziert. Bitte mit den aktuellen Vorgaben der zuständigen Prüfungsstelle in Wien (Befähigungs-/Fachkundeprüfung bzw. Taxilenkerprüfung) abgleichen.";

export const syllabusNote = SYLLABUS_NOTE;

export const categories: SeedCategory[] = [
  {
    slug: "verkehrsrecht",
    name: "Österreichisches Verkehrsrecht",
    shortDescription: "Kraftfahrgesetz, Führerscheingesetz, Alkoholgrenzen und Pflichten nach Unfällen.",
    introduction:
      "Das österreichische Verkehrsrecht besteht aus mehreren Gesetzen: Die Straßenverkehrsordnung (StVO) regelt das Verhalten auf der Straße, das Kraftfahrgesetz (KFG) die Fahrzeuge und deren Ausrüstung und das Führerscheingesetz (FSG) die Lenkberechtigung.\n\nFür Berufslenkerinnen und Berufslenker ist ein sicherer Umgang mit diesen Regeln besonders wichtig: Verstöße können nicht nur Strafen, sondern auch den Verlust der Lenkberechtigung und damit der beruflichen Existenz bedeuten.\n\nIn dieser Kategorie lernst du die wichtigsten Pflichten rund um Dokumente, Alkohol, Vormerksystem, Versicherung und das richtige Verhalten nach einem Unfall.",
    color: "blue",
    icon: "Scale",
    order: 1,
    difficulty: "MEDIUM",
    topics: [
      { slug: "fuehrerschein", name: "Führerschein & Lenkberechtigung", description: "FSG, Probeführerschein, Vormerksystem" },
      { slug: "kfg", name: "Kraftfahrgesetz", description: "Mitführpflichten, Ausrüstung, Versicherung" },
      { slug: "alkohol", name: "Alkohol & Drogen", description: "Promillegrenzen und Folgen" },
      { slug: "unfall", name: "Verhalten bei Unfällen", description: "Absichern, Helfen, Melden" },
    ],
  },
  {
    slug: "stvo",
    name: "Straßenverkehrsordnung (StVO)",
    shortDescription: "Vorrang, Geschwindigkeit, Halten und Parken, Lichtzeichen und Rettungsgasse.",
    introduction:
      "Die Straßenverkehrsordnung 1960 (StVO) ist das zentrale Regelwerk für das Verhalten im Straßenverkehr in Österreich. Sie regelt unter anderem Vorrang, Geschwindigkeiten, das Halten und Parken sowie die Bedeutung von Verkehrszeichen und Lichtzeichen.\n\nGerade im dichten Stadtverkehr in Wien – mit Straßenbahnen, Radfahrern, Fußgängerzonen und vielen Kurzparkzonen – musst du die Regeln sicher beherrschen.\n\nDie Fragen in dieser Kategorie trainieren typische Alltagssituationen eines Taxilenkers.",
    color: "indigo",
    icon: "TrafficCone",
    order: 2,
    difficulty: "MEDIUM",
    topics: [
      { slug: "vorrang", name: "Vorrang", description: "Rechtsregel, Schienenfahrzeuge, Schutzwege" },
      { slug: "geschwindigkeit", name: "Geschwindigkeit", description: "Allgemeine Höchstgeschwindigkeiten" },
      { slug: "halten-parken", name: "Halten & Parken", description: "Verbote, Taxistandplätze" },
      { slug: "lichtzeichen", name: "Lichtzeichen & Verkehrszeichen", description: "Ampelphasen, Zusatztafeln" },
      { slug: "autobahn", name: "Autobahn & Schnellstraße", description: "Rettungsgasse" },
    ],
  },
  {
    slug: "gewerberecht",
    name: "Gewerberecht und Taxi-Konzessionsrecht",
    shortDescription: "Gelegenheitsverkehrsgesetz, Konzession, Voraussetzungen, Tarife und Taxilenkerausweis.",
    introduction:
      "Das Taxigewerbe ist in Österreich ein konzessioniertes Gewerbe. Rechtsgrundlage ist vor allem das Gelegenheitsverkehrs-Gesetz 1996 (GelverkG) gemeinsam mit der Gewerbeordnung und den dazu erlassenen Verordnungen. Seit 2021 sind das frühere Taxi- und Mietwagengewerbe im „Personenbeförderungsgewerbe mit Pkw – Taxi“ zusammengeführt.\n\nFür die Erteilung einer Konzession sind unter anderem Zuverlässigkeit, finanzielle Leistungsfähigkeit und fachliche Eignung nachzuweisen. Ergänzend gelten Betriebsordnungen und landesrechtliche Tarifvorschriften.\n\nHinweis: Gerade in diesem Bereich ändern sich Vorschriften regelmäßig – prüfe Details immer anhand der aktuellen Rechtslage.",
    color: "violet",
    icon: "Landmark",
    order: 3,
    difficulty: "HARD",
    topics: [
      { slug: "konzession", name: "Konzession & Voraussetzungen", description: "Zuverlässigkeit, Leistungsfähigkeit, fachliche Eignung" },
      { slug: "gelverkg", name: "Gelegenheitsverkehrsgesetz", description: "Aufbau und Grundsätze" },
      { slug: "tarife", name: "Tarife & Taxameter", description: "Tarifverordnung, Eichpflicht" },
      { slug: "lenker", name: "Taxilenker", description: "Taxilenkerausweis" },
    ],
  },
  {
    slug: "ortskenntnisse-wien",
    name: "Wiener Ortskenntnisse",
    shortDescription: "Bezirke, Sehenswürdigkeiten, Bahnhöfe, Spitäler und wichtige Ziele in Wien.",
    introduction:
      "Gute Ortskenntnisse sind das Handwerkszeug jedes Taxilenkers. Wien ist in 23 Gemeindebezirke gegliedert – vom 1. Bezirk (Innere Stadt) innerhalb der Ringstraße bis zum 23. Bezirk (Liesing).\n\nFahrgäste erwarten, dass du wichtige Ziele wie Bahnhöfe, Spitäler, Hotels, Behörden, Veranstaltungsorte und Sehenswürdigkeiten ohne Umwege erreichst – auch dann, wenn die Navigation einmal ausfällt.\n\nLerne in dieser Kategorie die Lage der Bezirke und der wichtigsten Ziele.",
    color: "emerald",
    icon: "MapPinned",
    order: 4,
    difficulty: "MEDIUM",
    topics: [
      { slug: "bezirke", name: "Bezirke", description: "Nummern und Namen der 23 Bezirke" },
      { slug: "sehenswuerdigkeiten", name: "Sehenswürdigkeiten & Ziele", description: "Kultur, Tourismus, Veranstaltungen" },
      { slug: "verkehrsknoten", name: "Bahnhöfe & Flughafen", description: "Wichtige Verkehrsknoten" },
      { slug: "einrichtungen", name: "Spitäler & Einrichtungen", description: "Krankenhäuser, internationale Organisationen" },
    ],
  },
  {
    slug: "berufskunde",
    name: "Berufskunde und Taxibetrieb",
    shortDescription: "Pflichten im Taxibetrieb, Fahrgastbeförderung, Fundgegenstände und Fahrzeugkennzeichnung.",
    introduction:
      "Der Taxibetrieb folgt eigenen Regeln: Wer Fahrgäste befördert, übernimmt Verantwortung für deren Sicherheit, für faire Preise und für einen korrekten Ablauf der Fahrt.\n\nDazu gehören unter anderem die Wahl der Fahrtstrecke, der richtige Umgang mit Fundgegenständen, das Rauchverbot, die Mitnahme von Assistenzhunden und die Frage, wann eine Fahrt abgelehnt werden darf.\n\nDetails sind in Betriebsordnungen geregelt – die Fragen hier behandeln die grundlegenden Prinzipien.",
    color: "amber",
    icon: "Car",
    order: 5,
    difficulty: "MEDIUM",
    topics: [
      { slug: "pflichten", name: "Pflichten des Lenkers", description: "Fahrtstrecke, Verhalten, Ablehnung" },
      { slug: "fahrgaeste", name: "Fahrgastbeförderung", description: "Assistenzhunde, Gepäck, Rauchverbot" },
      { slug: "fundsachen", name: "Fundgegenstände", description: "Richtiger Umgang mit vergessenen Sachen" },
    ],
  },
  {
    slug: "arbeitsrecht",
    name: "Arbeitsrecht und Sozialversicherung",
    shortDescription: "Arbeitszeit, Ruhezeit, Urlaub, Dienstzettel und Sozialversicherungsträger.",
    introduction:
      "Wer Lenkerinnen und Lenker beschäftigt, muss das österreichische Arbeitsrecht kennen: Arbeitszeitgesetz (AZG), Urlaubsgesetz, Arbeitsvertragsrechts-Anpassungsgesetz (AVRAG) und die Regeln der Sozialversicherung (ASVG, GSVG).\n\nFür Lenker gelten im AZG zusätzlich Sonderbestimmungen zu Lenkzeiten und Pausen. Kollektivverträge können weitere Regelungen enthalten.\n\nIn dieser Kategorie lernst du die Grundregeln für Arbeitszeit, Urlaub und Sozialversicherung.",
    color: "rose",
    icon: "Users",
    order: 6,
    difficulty: "MEDIUM",
    topics: [
      { slug: "arbeitszeit", name: "Arbeitszeit & Ruhezeit", description: "Normal- und Höchstarbeitszeit" },
      { slug: "arbeitsvertrag", name: "Arbeitsvertrag & Urlaub", description: "Dienstzettel, Urlaubsanspruch" },
      { slug: "sozialversicherung", name: "Sozialversicherung", description: "ÖGK, SVS, Anmeldung" },
    ],
  },
  {
    slug: "steuerrecht",
    name: "Steuerrecht und Buchhaltung",
    shortDescription: "Umsatzsteuer, Registrierkasse, Belegerteilung, Aufbewahrung und Rechnungslegung.",
    introduction:
      "Als Taxiunternehmer bist du für korrekte Aufzeichnungen und Steuern verantwortlich. Wichtige Themen sind die Umsatzsteuer, die Registrierkassen- und Belegerteilungspflicht, Aufbewahrungsfristen sowie die Frage, ob eine Einnahmen-Ausgaben-Rechnung genügt oder doppelte Buchhaltung erforderlich ist.\n\nSteuerliche Grenzwerte werden regelmäßig angepasst. Prüfe konkrete Beträge daher immer anhand der aktuellen Rechtslage oder mit deiner Steuerberatung.",
    color: "cyan",
    icon: "Calculator",
    order: 7,
    difficulty: "HARD",
    topics: [
      { slug: "umsatzsteuer", name: "Umsatzsteuer", description: "Steuersätze, Vorsteuer" },
      { slug: "registrierkasse", name: "Registrierkasse & Belege", description: "Registrierkassen- und Belegerteilungspflicht" },
      { slug: "buchhaltung", name: "Buchhaltung & Aufbewahrung", description: "E/A-Rechnung, UGB, Fristen" },
    ],
  },
  {
    slug: "kundenbetreuung",
    name: "Kundenbetreuung und Verhalten",
    shortDescription: "Kommunikation, Beschwerden, Barrierefreiheit, Deeskalation und Notrufe.",
    introduction:
      "Ein Taxi ist eine Dienstleistung – und der Eindruck, den Fahrgäste mitnehmen, entscheidet über Weiterempfehlungen und Stammkunden. Freundlichkeit, Hilfsbereitschaft, Diskretion und ein gepflegtes Auftreten gehören dazu.\n\nGleichzeitig musst du in schwierigen Situationen ruhig bleiben: bei Beschwerden, Sprachbarrieren oder aggressiven Fahrgästen. Im Notfall zählt schnelles, richtiges Handeln.",
    color: "orange",
    icon: "HeartHandshake",
    order: 8,
    difficulty: "EASY",
    topics: [
      { slug: "kommunikation", name: "Kommunikation & Service", description: "Umgang mit Fahrgästen" },
      { slug: "barrierefreiheit", name: "Barrierefreiheit", description: "Fahrgäste mit Behinderung" },
      { slug: "sicherheit", name: "Konflikte & Notfälle", description: "Deeskalation, Notrufnummern" },
    ],
  },
  {
    slug: "fahrzeugkunde",
    name: "Fahrzeugkunde und Verkehrssicherheit",
    shortDescription: "Reifen, Bremsweg, Pflichtausrüstung, Begutachtung und sicheres Fahren.",
    introduction:
      "Ein Taxi legt pro Jahr sehr viele Kilometer zurück. Technischer Zustand und Sicherheitsausrüstung sind daher besonders wichtig – für dich und deine Fahrgäste.\n\nIn dieser Kategorie geht es um Reifen und Winterausrüstung, Anhalteweg und Bremsweg, die vorgeschriebene Ausrüstung, die wiederkehrende Begutachtung („Pickerl“) und richtiges Verhalten in Gefahrensituationen wie Aquaplaning.",
    color: "teal",
    icon: "ShieldCheck",
    order: 9,
    difficulty: "MEDIUM",
    topics: [
      { slug: "reifen", name: "Reifen & Winterausrüstung", description: "Profiltiefe, situative Winterreifenpflicht" },
      { slug: "anhalteweg", name: "Anhalteweg & Bremsen", description: "Faustformeln" },
      { slug: "ausruestung", name: "Ausrüstung & Begutachtung", description: "Pflichtausrüstung, § 57a KFG" },
      { slug: "gefahren", name: "Gefahrensituationen", description: "Aquaplaning, Sicht" },
    ],
  },
  {
    slug: "unternehmerische-grundlagen",
    name: "Unternehmerische Grundlagen",
    shortDescription: "Rechtsformen, Haftung, Kostenrechnung, Deckungsbeitrag, Break-even und Liquidität.",
    introduction:
      "Wer ein Taxiunternehmen führt, muss wirtschaftlich denken: Welche Rechtsform passt? Wie hoch sind Fixkosten und variable Kosten? Ab wie vielen Fahrten trägt sich das Fahrzeug?\n\nDiese Kategorie vermittelt die betriebswirtschaftlichen Grundlagen: Rechtsformen und Haftung, Kostenrechnung, Deckungsbeitrag, Break-even-Analyse und Liquiditätsplanung.",
    color: "sky",
    icon: "Briefcase",
    order: 10,
    difficulty: "MEDIUM",
    topics: [
      { slug: "rechtsformen", name: "Rechtsformen & Haftung", description: "Einzelunternehmen, GmbH" },
      { slug: "kalkulation", name: "Kostenrechnung & Kalkulation", description: "Fixkosten, Deckungsbeitrag, Break-even" },
      { slug: "finanzierung", name: "Finanzierung & Liquidität", description: "Zahlungsfähigkeit sichern" },
    ],
  },
];
