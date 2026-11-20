/**
 * Zahlen-Fakten und Routen für die Lern-Extras – alle UNGEPRÜFT (verified=false).
 * Vor dem Freigeben im Admin-Bereich gegen die aktuelle Rechtslage prüfen.
 */
export const numberFacts = [
  { key: "bac-general", category: "Alkohol", statement: "Allgemeine Promillegrenze für Kfz-Lenker: {x}", value: "0,5", unit: "‰", distractors: ["0,1", "0,8", "0,3"], legalReference: "§ 5 StVO" },
  { key: "bac-probation", category: "Alkohol", statement: "Promillegrenze für Lenker mit Probeführerschein: {x}", value: "0,1", unit: "‰", distractors: ["0,5", "0,0", "0,3"], legalReference: "§ 4 FSG" },
  { key: "speed-town", category: "Geschwindigkeit", statement: "Allgemeine Höchstgeschwindigkeit im Ortsgebiet: {x}", value: "50", unit: "km/h", distractors: ["30", "40", "60"], legalReference: "§ 20 Abs. 2 StVO" },
  { key: "speed-rural", category: "Geschwindigkeit", statement: "Allgemeine Höchstgeschwindigkeit auf Freilandstraßen: {x}", value: "100", unit: "km/h", distractors: ["80", "90", "110"], legalReference: "§ 20 Abs. 2 StVO" },
  { key: "speed-motorway", category: "Geschwindigkeit", statement: "Allgemeine Höchstgeschwindigkeit auf Autobahnen: {x}", value: "130", unit: "km/h", distractors: ["100", "120", "140"], legalReference: "§ 20 Abs. 2 StVO" },
  { key: "stop-crosswalk", category: "Abstände", statement: "Halte- und Parkverbot vor einem Schutzweg (bis zu): {x}", value: "5", unit: "m", distractors: ["3", "10", "15"], legalReference: "§ 24 Abs. 1 lit. d StVO" },
  { key: "stop-intersection", category: "Abstände", statement: "Halte- und Parkverbot vom Schnittpunkt der Fahrbahnränder einer Kreuzung: weniger als {x}", value: "5", unit: "m", distractors: ["2", "10", "15"], legalReference: "§ 24 Abs. 1 lit. d StVO" },
  { key: "stop-busstop", category: "Abstände", statement: "Halteverbot im Haltestellenbereich öffentlicher Verkehrsmittel: {x} vor und nach dem Haltestellenzeichen", value: "15", unit: "m", distractors: ["5", "10", "20"], legalReference: "§ 24 Abs. 1 lit. e StVO" },
  { key: "overtake-bike-town", category: "Abstände", statement: "Seitenabstand beim Überholen von Radfahrern im Ortsgebiet (mindestens): {x}", value: "1,5", unit: "m", distractors: ["1", "2", "0,5"], legalReference: "§ 15 Abs. 4 StVO" },
  { key: "overtake-bike-rural", category: "Abstände", statement: "Seitenabstand beim Überholen von Radfahrern außerhalb des Ortsgebiets (mindestens): {x}", value: "2", unit: "m", distractors: ["1,5", "1", "3"], legalReference: "§ 15 Abs. 4 StVO" },
  { key: "child-age", category: "Kindersicherung", statement: "Kinder brauchen eine Kindersitz-Rückhalteeinrichtung bis zum vollendeten {x} (sofern kleiner als 135 cm)", value: "14", unit: "Lebensjahr", distractors: ["12", "10", "16"], legalReference: "§ 106 Abs. 5 KFG" },
  { key: "child-height", category: "Kindersicherung", statement: "Kindersitzpflicht gilt für Kinder kleiner als {x}", value: "135", unit: "cm", distractors: ["120", "150", "140"], legalReference: "§ 106 Abs. 5 KFG" },
  { key: "tread-summer", category: "Fahrzeug", statement: "Gesetzliche Mindestprofiltiefe bei Pkw-Sommerreifen: {x}", value: "1,6", unit: "mm", distractors: ["1,0", "3,0", "4,0"], legalReference: "§ 4 Abs. 4 KDV" },
  { key: "tread-winter", category: "Fahrzeug", statement: "Mindestprofiltiefe, damit Pkw-Reifen als Winterreifen gelten: {x}", value: "4", unit: "mm", distractors: ["3", "1,6", "5"], legalReference: "§ 4 Abs. 4 KDV" },
  { key: "winter-start", category: "Fristen", statement: "Die situative Winterausrüstungspflicht beginnt am: {x}", value: "1. November", unit: "", distractors: ["1. Oktober", "15. November", "1. Dezember"], legalReference: "§ 102 Abs. 8a KFG" },
  { key: "winter-end", category: "Fristen", statement: "Die situative Winterausrüstungspflicht endet am: {x}", value: "15. April", unit: "", distractors: ["31. März", "30. April", "15. März"], legalReference: "§ 102 Abs. 8a KFG" },
];

export const routes = [
  {
    slug: "ringrunde-schwedenplatz",
    fromName: "Schwarzenbergplatz",
    toName: "Schwedenplatz",
    streets: ["Kärntner Ring", "Opernring", "Burgring", "Dr.-Karl-Renner-Ring", "Universitätsring", "Schottenring", "Franz-Josefs-Kai"],
    path: [
      [[16.3745, 48.2012], [16.37, 48.2025]],
      [[16.37, 48.2025], [16.3657, 48.2037]],
      [[16.3657, 48.2037], [16.3602, 48.207]],
      [[16.3602, 48.207], [16.359, 48.21]],
      [[16.359, 48.21], [16.3605, 48.214]],
      [[16.3605, 48.214], [16.3665, 48.2165]],
      [[16.3665, 48.2165], [16.3735, 48.2128], [16.3772, 48.2114]],
    ],
  },
  {
    slug: "oper-westbahnhof",
    fromName: "Oper",
    toName: "Westbahnhof",
    streets: ["Opernring", "Getreidemarkt", "Gumpendorfer Straße", "Mariahilfer Gürtel", "Europaplatz"],
    path: [
      [[16.3693, 48.2027], [16.3657, 48.2037]],
      [[16.3657, 48.2037], [16.3625, 48.2005]],
      [[16.3625, 48.2005], [16.35, 48.1965], [16.341, 48.1935]],
      [[16.341, 48.1935], [16.339, 48.196]],
      [[16.339, 48.196], [16.3385, 48.1967]],
    ],
  },
  {
    slug: "stephansplatz-praterstern",
    fromName: "Stephansplatz",
    toName: "Praterstern",
    streets: ["Rotenturmstraße", "Franz-Josefs-Kai", "Aspernbrücke", "Praterstraße"],
    path: [
      [[16.373, 48.2085], [16.376, 48.2112]],
      [[16.376, 48.2112], [16.383, 48.2112]],
      [[16.383, 48.2112], [16.3855, 48.2125]],
      [[16.3855, 48.2125], [16.392, 48.216], [16.3925, 48.2185]],
    ],
  },
];
