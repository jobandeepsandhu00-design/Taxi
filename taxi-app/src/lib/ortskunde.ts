/**
 * Ortskunde Wien: Orte, Bezirke, Routen und Geo-Hilfsfunktionen (reine Funktionen, unit-getestet).
 * Koordinaten als [Längengrad, Breitengrad] (GeoJSON-Reihenfolge).
 * Übungsinhalte – eigenständig erstellt, keine offiziellen Prüfungsfragen.
 */

export const DISTRICT_NAMES: Record<number, string> = {
  1: "Innere Stadt", 2: "Leopoldstadt", 3: "Landstraße", 4: "Wieden", 5: "Margareten", 6: "Mariahilf",
  7: "Neubau", 8: "Josefstadt", 9: "Alsergrund", 10: "Favoriten", 11: "Simmering", 12: "Meidling",
  13: "Hietzing", 14: "Penzing", 15: "Rudolfsheim-Fünfhaus", 16: "Ottakring", 17: "Hernals", 18: "Währing",
  19: "Döbling", 20: "Brigittenau", 21: "Floridsdorf", 22: "Donaustadt", 23: "Liesing",
};

export interface Place {
  key: string;
  name: string;
  type: "Sehenswürdigkeit" | "Bahnhof" | "Spital" | "Platz" | "Sport & Freizeit";
  coord: [number, number];
  district: number;
}

/** Bezirkszuordnung gegen die Bezirksgrenzen (Statistik Austria) geprüft. */
export const PLACES: Place[] = [
  { key: "stephansdom", name: "Stephansdom", type: "Sehenswürdigkeit", coord: [16.37307, 48.20849], district: 1 },
  { key: "staatsoper", name: "Staatsoper", type: "Sehenswürdigkeit", coord: [16.36914, 48.20299], district: 1 },
  { key: "rathaus", name: "Rathaus", type: "Sehenswürdigkeit", coord: [16.35713, 48.21083], district: 1 },
  { key: "parlament", name: "Parlament", type: "Sehenswürdigkeit", coord: [16.35838, 48.20809], district: 1 },
  { key: "heldenplatz", name: "Heldenplatz (Hofburg)", type: "Platz", coord: [16.3635, 48.2066], district: 1 },
  { key: "universitaet", name: "Universität Wien (Hauptgebäude)", type: "Sehenswürdigkeit", coord: [16.3603, 48.2132], district: 1 },
  { key: "riesenrad", name: "Riesenrad (Prater)", type: "Sport & Freizeit", coord: [16.39594, 48.21664], district: 2 },
  { key: "praterstern", name: "Bahnhof Praterstern", type: "Bahnhof", coord: [16.39206, 48.21815], district: 2 },
  { key: "happel-stadion", name: "Ernst-Happel-Stadion", type: "Sport & Freizeit", coord: [16.42083, 48.20694], district: 2 },
  { key: "belvedere", name: "Oberes Belvedere", type: "Sehenswürdigkeit", coord: [16.3809, 48.1915], district: 3 },
  { key: "wien-mitte", name: "Bahnhof Wien Mitte", type: "Bahnhof", coord: [16.3849, 48.2064], district: 3 },
  { key: "karlskirche", name: "Karlskirche", type: "Sehenswürdigkeit", coord: [16.3717, 48.1981], district: 4 },
  { key: "margaretenplatz", name: "Margaretenplatz", type: "Platz", coord: [16.3551, 48.1919], district: 5 },
  { key: "haus-des-meeres", name: "Haus des Meeres", type: "Sport & Freizeit", coord: [16.3531, 48.1976], district: 6 },
  { key: "theater-josefstadt", name: "Theater in der Josefstadt", type: "Sehenswürdigkeit", coord: [16.3488, 48.2099], district: 8 },
  { key: "akh", name: "AKH Wien", type: "Spital", coord: [16.3468, 48.2205], district: 9 },
  { key: "votivkirche", name: "Votivkirche", type: "Sehenswürdigkeit", coord: [16.3588, 48.2155], district: 9 },
  { key: "franz-josefs-bahnhof", name: "Franz-Josefs-Bahnhof", type: "Bahnhof", coord: [16.3603, 48.2258], district: 9 },
  { key: "hauptbahnhof", name: "Hauptbahnhof", type: "Bahnhof", coord: [16.377, 48.1851], district: 10 },
  { key: "zentralfriedhof", name: "Zentralfriedhof", type: "Sehenswürdigkeit", coord: [16.4398, 48.1524], district: 11 },
  { key: "bahnhof-meidling", name: "Bahnhof Meidling", type: "Bahnhof", coord: [16.3335, 48.1747], district: 12 },
  { key: "schoenbrunn", name: "Schloss Schönbrunn", type: "Sehenswürdigkeit", coord: [16.31222, 48.18486], district: 13 },
  { key: "steinhof", name: "Kirche am Steinhof", type: "Sehenswürdigkeit", coord: [16.2812, 48.2099], district: 14 },
  { key: "stadthalle", name: "Wiener Stadthalle", type: "Sport & Freizeit", coord: [16.3327, 48.2024], district: 15 },
  { key: "klinik-ottakring", name: "Klinik Ottakring", type: "Spital", coord: [16.3096, 48.2145], district: 16 },
  { key: "tuerkenschanzpark", name: "Türkenschanzpark", type: "Sport & Freizeit", coord: [16.3332, 48.2356], district: 18 },
  { key: "kahlenberg", name: "Kahlenberg", type: "Sport & Freizeit", coord: [16.3335, 48.2762], district: 19 },
  { key: "millennium-tower", name: "Millennium Tower", type: "Sehenswürdigkeit", coord: [16.3855, 48.2411], district: 20 },
  { key: "bahnhof-floridsdorf", name: "Bahnhof Floridsdorf", type: "Bahnhof", coord: [16.4003, 48.2564], district: 21 },
  { key: "donauturm", name: "Donauturm", type: "Sehenswürdigkeit", coord: [16.4101, 48.2403], district: 22 },
  { key: "uno-city", name: "UNO-City (Vienna International Centre)", type: "Sehenswürdigkeit", coord: [16.417, 48.2349], district: 22 },
  { key: "donauzentrum", name: "Donauzentrum", type: "Platz", coord: [16.4335, 48.2429], district: 22 },
  { key: "bahnhof-liesing", name: "Bahnhof Liesing", type: "Bahnhof", coord: [16.2842, 48.1347], district: 23 },
];

/** Antwort gilt als richtig, wenn der Tipp höchstens so weit entfernt ist. */
export const PLACE_TOLERANCE_M = 700;

/** Entfernung zweier Punkte in Metern (Haversine). */
export function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Punkte für einen Kartentipp: 100 bei Volltreffer, 0 ab 3 km. */
export function scoreForDistance(m: number): number {
  if (m <= 150) return 100;
  if (m >= 3000) return 0;
  return Math.round(100 * (1 - (m - 150) / 2850));
}

type Ring = [number, number][];
export type DistrictGeometry = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };

function inRing(pt: [number, number], ring: Ring): boolean {
  const [x, y] = pt;
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[j];
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) c = !c;
  }
  return c;
}

/** Liegt der Punkt im (Multi-)Polygon? Löcher werden berücksichtigt. */
export function pointInGeometry(pt: [number, number], g: DistrictGeometry): boolean {
  const polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
  return polys.some((p) => inRing(pt, p[0]) && !p.slice(1).some((hole) => inRing(pt, hole)));
}

/** Bezirks-Beherrschung aus den letzten Versuchen (0–100). */
export function districtMastery(attempts: boolean[]): number {
  const last = attempts.slice(-5);
  if (last.length === 0) return 0;
  const correct = last.filter(Boolean).length;
  return Math.round((correct / 5) * 100);
}

/* ── Routen-Trainer: Ringstraße (Kfz-Verkehr als Einbahn im Uhrzeigersinn) ───────────── */

export const RING_POINTS: Record<string, [number, number]> = {
  oper: [16.3685, 48.203],
  schwarzenbergplatz: [16.374, 48.201],
  schubertring: [16.3765, 48.2025],
  stadtpark: [16.379, 48.205],
  urania: [16.3835, 48.2115],
  stubenring: [16.382, 48.209],
  schwedenplatz: [16.376, 48.2128],
  boerse: [16.367, 48.216],
  schottentor: [16.3625, 48.215],
  rathaus: [16.3605, 48.212],
  parlament: [16.3595, 48.2085],
  burgtor: [16.3625, 48.205],
};

export interface RouteSegment {
  name: string;
  path: [number, number][];
}

export interface RouteTask {
  id: string;
  title: string;
  from: string;
  to: string;
  hint: string;
  /** Abschnitte in der richtigen Reihenfolge */
  segments: RouteSegment[];
}

const P = RING_POINTS;
const SEG = {
  kaerntnerRing: { name: "Kärntner Ring", path: [P.schwarzenbergplatz, P.oper] },
  opernring: { name: "Opernring", path: [P.oper, P.burgtor] },
  burgring: { name: "Burgring", path: [P.burgtor, P.parlament] },
  rennerRing: { name: "Dr.-Karl-Renner-Ring", path: [P.parlament, P.rathaus] },
  universitaetsring: { name: "Universitätsring", path: [P.rathaus, P.schottentor] },
  schottenring: { name: "Schottenring", path: [P.schottentor, P.boerse] },
  kai: { name: "Franz-Josefs-Kai", path: [P.boerse, P.schwedenplatz, P.urania] },
  stubenring: { name: "Stubenring", path: [P.urania, P.stubenring] },
  parkring: { name: "Parkring", path: [P.stubenring, P.stadtpark] },
  schubertring: { name: "Schubertring", path: [P.stadtpark, P.schubertring, P.schwarzenbergplatz] },
} satisfies Record<string, RouteSegment>;

export const ROUTES: RouteTask[] = [
  {
    id: "oper-rathaus",
    title: "Von der Staatsoper zum Rathaus",
    from: "Staatsoper",
    to: "Rathaus",
    hint: "Auf der Ringstraße fährst du mit dem Auto im Uhrzeigersinn.",
    segments: [SEG.opernring, SEG.burgring, SEG.rennerRing, SEG.universitaetsring],
  },
  {
    id: "schwarzenberg-schottentor",
    title: "Vom Schwarzenbergplatz zum Schottentor",
    from: "Schwarzenbergplatz",
    to: "Schottentor",
    hint: "Folge dem Ring im Uhrzeigersinn an Oper, Burg und Parlament vorbei.",
    segments: [SEG.kaerntnerRing, SEG.opernring, SEG.burgring, SEG.rennerRing, SEG.universitaetsring],
  },
  {
    id: "schottentor-stadtpark",
    title: "Vom Schottentor zum Stadtpark",
    from: "Schottentor",
    to: "Stadtpark",
    hint: "Der Ring schließt sich über den Franz-Josefs-Kai am Donaukanal.",
    segments: [SEG.schottenring, SEG.kai, SEG.stubenring, SEG.parkring],
  },
  {
    id: "urania-oper",
    title: "Von der Urania zur Staatsoper",
    from: "Urania",
    to: "Staatsoper",
    hint: "Am Stadtpark vorbei Richtung Schwarzenbergplatz.",
    segments: [SEG.stubenring, SEG.parkring, SEG.schubertring, SEG.kaerntnerRing],
  },
];

/** Prüft die gewählte Reihenfolge der Straßennamen. */
export function checkRoute(task: RouteTask, order: string[]): { correct: boolean; firstWrong: number } {
  const expected = task.segments.map((s) => s.name);
  const firstWrong = expected.findIndex((n, i) => order[i] !== n);
  return { correct: firstWrong === -1 && order.length === expected.length, firstWrong };
}
