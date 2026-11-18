/**
 * Rechtsgrundlagen als Quellenverweise. Bewusst NICHT als „verifiziert“ markiert:
 * Fassung und Aktualität müssen vom Betreiber geprüft werden (RIS: www.ris.bka.gv.at).
 */
export interface SeedSource {
  key: string;
  title: string;
  type: "LAW" | "OFFICIAL_EXAM" | "OFFICIAL_DOCUMENT" | "TEXTBOOK" | "OTHER";
  reference?: string;
  url?: string;
}

const RIS = "https://www.ris.bka.gv.at";

export const sources: SeedSource[] = [
  { key: "stvo", title: "Straßenverkehrsordnung 1960 (StVO)", type: "LAW", reference: "BGBl. Nr. 159/1960 i.d.g.F.", url: RIS },
  { key: "kfg", title: "Kraftfahrgesetz 1967 (KFG)", type: "LAW", reference: "BGBl. Nr. 267/1967 i.d.g.F.", url: RIS },
  { key: "kdv", title: "Kraftfahrgesetz-Durchführungsverordnung 1967 (KDV)", type: "LAW", reference: "BGBl. Nr. 399/1967 i.d.g.F.", url: RIS },
  { key: "fsg", title: "Führerscheingesetz (FSG)", type: "LAW", reference: "BGBl. I Nr. 120/1997 i.d.g.F.", url: RIS },
  { key: "gelverkg", title: "Gelegenheitsverkehrs-Gesetz 1996 (GelverkG)", type: "LAW", reference: "BGBl. Nr. 112/1996 i.d.g.F.", url: RIS },
  { key: "bo", title: "Betriebsordnung für den nichtlinienmäßigen Personenverkehr (BO 1994)", type: "LAW", reference: "BGBl. Nr. 951/1993 i.d.g.F.", url: RIS },
  { key: "gewo", title: "Gewerbeordnung 1994 (GewO)", type: "LAW", reference: "BGBl. Nr. 194/1994 i.d.g.F.", url: RIS },
  { key: "azg", title: "Arbeitszeitgesetz (AZG)", type: "LAW", reference: "BGBl. Nr. 461/1969 i.d.g.F.", url: RIS },
  { key: "urlg", title: "Urlaubsgesetz (UrlG)", type: "LAW", reference: "BGBl. Nr. 390/1976 i.d.g.F.", url: RIS },
  { key: "avrag", title: "Arbeitsvertragsrechts-Anpassungsgesetz (AVRAG)", type: "LAW", reference: "BGBl. Nr. 459/1993 i.d.g.F.", url: RIS },
  { key: "asvg", title: "Allgemeines Sozialversicherungsgesetz (ASVG)", type: "LAW", reference: "BGBl. Nr. 189/1955 i.d.g.F.", url: RIS },
  { key: "gsvg", title: "Gewerbliches Sozialversicherungsgesetz (GSVG)", type: "LAW", reference: "BGBl. Nr. 560/1978 i.d.g.F.", url: RIS },
  { key: "ustg", title: "Umsatzsteuergesetz 1994 (UStG)", type: "LAW", reference: "BGBl. Nr. 663/1994 i.d.g.F.", url: RIS },
  { key: "bao", title: "Bundesabgabenordnung (BAO)", type: "LAW", reference: "BGBl. Nr. 194/1961 i.d.g.F.", url: RIS },
  { key: "ugb", title: "Unternehmensgesetzbuch (UGB)", type: "LAW", reference: "dRGBl. S 219/1897 i.d.g.F.", url: RIS },
  { key: "gmbhg", title: "GmbH-Gesetz (GmbHG)", type: "LAW", reference: "RGBl. Nr. 58/1906 i.d.g.F.", url: RIS },
  { key: "tnrsg", title: "Tabak- und Nichtraucherinnen- bzw. Nichtraucherschutzgesetz (TNRSG)", type: "LAW", reference: "BGBl. Nr. 431/1995 i.d.g.F.", url: RIS },
  { key: "meg", title: "Maß- und Eichgesetz (MEG)", type: "LAW", reference: "BGBl. Nr. 152/1950 i.d.g.F.", url: RIS },
  { key: "wien", title: "Stadt Wien – Bezirke und Stadtinformation", type: "OTHER", url: "https://www.wien.gv.at" },
  { key: "fachwissen", title: "Allgemeines Fachwissen (eigenständig erstellt)", type: "OTHER" },
];
