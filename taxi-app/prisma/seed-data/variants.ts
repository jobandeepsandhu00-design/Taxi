/**
 * Vorab erzeugte KI-Varianten für 10 Demo-Fragen (Einfache Sprache B1 + Englisch).
 * Alle als „ungeprüft“ (verified=false) – im Admin-Bereich „KI-Varianten“ prüfen.
 */
type Opt = { label: string; text: string };
export interface SeedVariant {
  questionId: string;
  simple: { text: string; options: Opt[] };
  glossary: { term: string; definition: string }[];
  en: { question: string; options: Opt[]; explanation: string };
}

export const seedVariants: SeedVariant[] = [
  {
    questionId: "bbb-04",
    simple: { text: "Wie berechnest du das Eigenkapital einer Firma?", options: [{ label: "A", text: "Gesamt Vermögen + Gesamt Fremdkapital = Eigenkapital" }, { label: "B", text: "Fremdkapital - Umlaufvermögen = Eigenkapital" }, { label: "C", text: "Gesamt Vermögen - Gesamt Fremdkapital = Eigenkapital" }, { label: "D", text: "Umsatz - Ausgaben = Eigenkapital" }] },
    glossary: [{ term: "Eigenkapital", definition: "Das Geld und Vermögen, das dem Unternehmer selbst gehört – nicht geliehen." }],
    en: { question: "How do you calculate equity (Eigenkapital)?", options: [{ label: "A", text: "Total assets + total liabilities = equity" }, { label: "B", text: "Liabilities - current assets = equity" }, { label: "C", text: "Total assets - total liabilities (Fremdkapital) = equity" }, { label: "D", text: "Revenue - expenses = equity" }], explanation: "Equity (Eigenkapital) is total assets (Gesamtvermögen) minus total liabilities (Fremdkapital)." },
  },
  {
    questionId: "demo-stvo-01",
    simple: { text: "Wie schnell darfst du im Ortsgebiet normalerweise höchstens fahren?", options: [{ label: "A", text: "30 km/h" }, { label: "B", text: "40 km/h" }, { label: "C", text: "50 km/h" }, { label: "D", text: "60 km/h" }] },
    glossary: [{ term: "Ortsgebiet", definition: "Das Gebiet zwischen den Ortstafeln – also innerhalb einer Stadt oder eines Ortes." }, { term: "Höchstgeschwindigkeit", definition: "Die größte Geschwindigkeit, mit der man fahren darf." }],
    en: { question: "What is the general speed limit in built-up areas (Ortsgebiet)?", options: [{ label: "A", text: "30 km/h" }, { label: "B", text: "40 km/h" }, { label: "C", text: "50 km/h" }, { label: "D", text: "60 km/h" }], explanation: "In built-up areas (Ortsgebiet) the limit is 50 km/h unless traffic signs (Verkehrszeichen) say otherwise. Vienna has many 30 km/h zones (Tempo-30-Zonen)." },
  },
  {
    questionId: "demo-stvo-02",
    simple: { text: "Wie schnell dürfen Pkw in Österreich normalerweise höchstens fahren, wenn kein Schild etwas anderes sagt?", options: [{ label: "A", text: "In der Stadt (Ortsgebiet): 50 km/h" }, { label: "B", text: "Auf Landstraßen (Freiland): 100 km/h" }, { label: "C", text: "Auf der Autobahn: 130 km/h" }, { label: "D", text: "Auf der Autobahn: 150 km/h" }] },
    glossary: [{ term: "Höchstgeschwindigkeiten", definition: "Die schnellsten erlaubten Geschwindigkeiten." }],
    en: { question: "Which general speed limits apply to cars in Austria unless otherwise indicated?", options: [{ label: "A", text: "Built-up area (Ortsgebiet): 50 km/h" }, { label: "B", text: "Rural roads (Freilandstraße): 100 km/h" }, { label: "C", text: "Motorway (Autobahn): 130 km/h" }, { label: "D", text: "Motorway (Autobahn): 150 km/h" }], explanation: "The general limits are 50 km/h in built-up areas (Ortsgebiet), 100 km/h on rural roads (Freilandstraße) and 130 km/h on motorways (Autobahn). Different limits are shown by traffic signs (Verkehrszeichen)." },
  },
  {
    questionId: "demo-stvo-03",
    simple: { text: "An einer Kreuzung gibt es keine Schilder und keine Ampel. Welches Fahrzeug darf zuerst fahren? (Es geht nicht um Straßenbahnen.)", options: [{ label: "A", text: "Das Fahrzeug, das von links kommt" }, { label: "B", text: "Das Fahrzeug, das von rechts kommt" }, { label: "C", text: "Das größere Fahrzeug" }, { label: "D", text: "Wer zuerst an der Kreuzung ist" }] },
    glossary: [{ term: "Vorrang", definition: "Das Recht, zuerst zu fahren – die anderen müssen warten." }, { term: "Schienenfahrzeuge", definition: "Fahrzeuge auf Schienen, zum Beispiel die Straßenbahn." }],
    en: { question: "At an intersection without traffic signs and without traffic lights, who has the right of way (Vorrang) among vehicles that are not rail vehicles?", options: [{ label: "A", text: "The vehicle coming from the left" }, { label: "B", text: "The vehicle coming from the right" }, { label: "C", text: "The larger vehicle" }, { label: "D", text: "Whoever reaches the intersection first" }], explanation: "If the right of way (Vorrang) is not regulated by signs or lights, vehicles coming from the right have priority (Rechtsregel – right-hand rule)." },
  },
  {
    questionId: "demo-stvo-04",
    simple: { text: "Du kommst zu einer Kreuzung ohne Schilder und ohne Ampel. Von links kommt eine Straßenbahn. Wer darf zuerst fahren?", options: [{ label: "A", text: "Du, weil die Straßenbahn von links kommt" }, { label: "B", text: "Die Straßenbahn" }, { label: "C", text: "Wer schneller ist" }, { label: "D", text: "Niemand – beide müssen stehen bleiben" }] },
    glossary: [{ term: "ungeregelten Kreuzung", definition: "Eine Kreuzung ohne Ampel und ohne Vorrangschilder." }],
    en: { question: "At an unregulated intersection (ungeregelte Kreuzung), a tram (Straßenbahn) approaches from the left. Who has the right of way (Vorrang)?", options: [{ label: "A", text: "You, because the tram comes from the left" }, { label: "B", text: "The tram" }, { label: "C", text: "Whoever is faster" }, { label: "D", text: "Nobody – both must stop" }], explanation: "Rail vehicles (Schienenfahrzeuge) generally have the right of way at intersections without other rules – even over vehicles coming from the right. This only changes if signs or traffic lights say otherwise." },
  },
  {
    questionId: "demo-stvo-06",
    simple: { text: "Du willst bei einer Kreuzung halten oder parken. Wie viel Abstand musst du mindestens zur Kreuzung lassen? (Gemessen von der Stelle, wo sich die Fahrbahnränder treffen.)", options: [{ label: "A", text: "2 Meter" }, { label: "B", text: "5 Meter" }, { label: "C", text: "10 Meter" }, { label: "D", text: "15 Meter" }] },
    glossary: [{ term: "Schnittpunkt", definition: "Die Stelle, an der sich zwei Linien treffen." }, { term: "Fahrbahnränder", definition: "Die äußeren Kanten der Straße, auf der die Autos fahren." }],
    en: { question: "What minimum distance must you keep from the nearest point where the road edges of an intersection meet (Schnittpunkt der Fahrbahnränder) when stopping or parking?", options: [{ label: "A", text: "2 metres" }, { label: "B", text: "5 metres" }, { label: "C", text: "10 metres" }, { label: "D", text: "15 metres" }], explanation: "Stopping and parking (Halten und Parken) is prohibited within less than 5 m of the nearest point where crossing road edges meet – so that the view at intersections stays clear." },
  },
  {
    questionId: "demo-ort-01",
    simple: { text: "Wie viele Bezirke hat Wien?", options: [{ label: "A", text: "21" }, { label: "B", text: "23" }, { label: "C", text: "25" }, { label: "D", text: "19" }] },
    glossary: [{ term: "Gemeindebezirke", definition: "Die Stadtteile von Wien, die eine eigene Nummer haben." }],
    en: { question: "How many districts (Gemeindebezirke) does Vienna have?", options: [{ label: "A", text: "21" }, { label: "B", text: "23" }, { label: "C", text: "25" }, { label: "D", text: "19" }], explanation: "Vienna is divided into 23 districts (Gemeindebezirke) – from the 1st district, Innere Stadt, to the 23rd district, Liesing." },
  },
  {
    questionId: "demo-ort-02",
    simple: { text: "In welchem Bezirk steht der Stephansdom?", options: [{ label: "A", text: "1. Bezirk – Innere Stadt" }, { label: "B", text: "3. Bezirk – Landstraße" }, { label: "C", text: "7. Bezirk – Neubau" }, { label: "D", text: "9. Bezirk – Alsergrund" }] },
    glossary: [],
    en: { question: "In which district is St. Stephen's Cathedral (Stephansdom)?", options: [{ label: "A", text: "1st district – Innere Stadt" }, { label: "B", text: "3rd district – Landstraße" }, { label: "C", text: "7th district – Neubau" }, { label: "D", text: "9th district – Alsergrund" }], explanation: "St. Stephen's Cathedral (Stephansdom) is on Stephansplatz in the heart of the Innere Stadt (1st district)." },
  },
  {
    questionId: "demo-kfz-01",
    simple: { text: "Wie tief muss das Profil von Sommerreifen bei einem Pkw laut Gesetz mindestens sein?", options: [{ label: "A", text: "1,0 mm" }, { label: "B", text: "1,6 mm" }, { label: "C", text: "3,0 mm" }, { label: "D", text: "4,0 mm" }] },
    glossary: [{ term: "Mindestprofiltiefe", definition: "Wie tief die Rillen im Reifen mindestens sein müssen." }],
    en: { question: "What is the legal minimum tread depth (Mindestprofiltiefe) for summer tyres on a car?", options: [{ label: "A", text: "1.0 mm" }, { label: "B", text: "1.6 mm" }, { label: "C", text: "3.0 mm" }, { label: "D", text: "4.0 mm" }], explanation: "The legal minimum tread depth (Mindestprofiltiefe) is 1.6 mm. For more safety on wet roads, changing tyres earlier is recommended." },
  },
  {
    questionId: "demo-kfz-02",
    simple: { text: "In welcher Zeit gilt in Österreich die Pflicht für Winterausrüstung bei Pkw – wenn die Straße winterlich ist?", options: [{ label: "A", text: "1. Oktober bis 31. März" }, { label: "B", text: "1. November bis 15. April" }, { label: "C", text: "15. November bis 15. März" }, { label: "D", text: "Das ganze Jahr" }] },
    glossary: [{ term: "Winterausrüstungspflicht", definition: "Die Pflicht, bei Schnee oder Eis Winterreifen (oder Schneeketten) zu verwenden." }, { term: "situative", definition: "Gilt nur in einer bestimmten Situation – hier: wenn die Straße winterlich ist." }],
    en: { question: "During which period does the situational winter equipment requirement (situative Winterausrüstungspflicht) for cars apply in Austria?", options: [{ label: "A", text: "1 October to 31 March" }, { label: "B", text: "1 November to 15 April" }, { label: "C", text: "15 November to 15 March" }, { label: "D", text: "All year round" }], explanation: "From 1 November to 15 April, cars must have winter tyres (Winterreifen) on all wheels in wintry road conditions (snow, slush, ice); on continuous snow or ice, snow chains (Schneeketten) on the drive wheels are allowed instead." },
  },
  {
    questionId: "demo-beruf-02",
    simple: { text: "Ein Fahrgast will während der Fahrt rauchen. Was gilt?", options: [{ label: "A", text: "Er darf, wenn der Lenker Ja sagt" }, { label: "B", text: "Er darf, wenn das Fenster offen ist" }, { label: "C", text: "Im Taxi darf man nicht rauchen" }, { label: "D", text: "E-Zigaretten sind immer erlaubt" }] },
    glossary: [],
    en: { question: "A passenger wants to smoke during the ride. What applies?", options: [{ label: "A", text: "Allowed if the driver agrees" }, { label: "B", text: "Allowed if the window is open" }, { label: "C", text: "Smoking is prohibited in taxis (Rauchverbot)" }, { label: "D", text: "Only e-cigarettes are always allowed" }], explanation: "Smoking is prohibited in taxis (Rauchverbot) – for passengers and drivers. This protects health and the condition of the vehicle." },
  },
];
