/** Lernbuch – gemeinsame Typen und Themen-Gruppierung (Thema → Kapitel = Kategorie). */

export type ReadStatus = "gelesen" | "verstanden" | "nochmal";
export type ChapterState = "neu" | "weiterlesen" | "gelesen" | "check";

export const CHECK_PASS_PERCENT = 80;
export const CHECK_QUESTIONS = 5;
export const READ_AFTER_MS = 3000;
/** Fragen pro Abschnitt eines Kapitels */
export const SECTION_SIZE = 10;

export function sectionCount(total: number): number {
  return Math.max(1, Math.ceil(total / SECTION_SIZE));
}

export const LERNBUCH_TOPICS: { id: string; title: string; description: string; icon: string; color: string; slugs: string[] }[] = [
  { id: "rechnungswesen", title: "Rechnungswesen & Steuern", description: "Buchführung, Bilanz, Personalverrechnung, Steuern und Registrierkasse.", icon: "Calculator", color: "amber", slugs: ["k-rechnungswesen", "k-buchhaltung-bilanz", "k-personalverrechnung", "steuerrecht", "k-registrierkassa"] },
  { id: "kosten", title: "Kosten, Kalkulation & Finanzen", description: "Vollkosten, Deckungsbeitrag, Finanzierung, Kalkulation, Versicherung und Insolvenz.", icon: "Landmark", color: "emerald", slugs: ["k-vollkostenrechnung", "k-deckungsbeitrag", "k-finanzierung", "k-kalkulation", "k-versicherungsrecht", "k-insolvenzrecht"] },
  { id: "arbeit", title: "Arbeit & Soziales", description: "Arbeits- und Sozialrecht, Kollektivvertrag und EU-Recht.", icon: "Users", color: "rose", slugs: ["arbeitsrecht", "k-kollektivvertrag", "k-eu-sozialrecht"] },
  { id: "taxi", title: "Taxi-Recht & Betrieb", description: "Betriebsordnung, Tarif, Gelegenheitsverkehrsgesetz, Lenkprotokoll und Verkehrsgeographie.", icon: "Car", color: "blue", slugs: ["k-betriebsordnung-tarif", "k-gelegenheitsverkehrsgesetz", "k-lenkprotokoll", "k-verkehrsgeographie"] },
  { id: "recht", title: "Gewerbe, Kammer & Recht", description: "Gewerbeordnung, Wirtschaftskammer, Gesellschafts- und bürgerliches Recht.", icon: "Scale", color: "indigo", slugs: ["k-gewerbeordnung", "k-wirtschaftskammer", "k-gesellschaftsrecht", "k-buergerliches-recht"] },
  { id: "sonstiges", title: "Marketing, Umwelt & Sonstiges", description: "Marketing, Umweltschutz und sonstige Fragen.", icon: "BookOpen", color: "teal", slugs: ["k-marketing", "k-umweltschutz", "k-sonstige"] },
];

export function topicIdForSlug(slug: string): string {
  return LERNBUCH_TOPICS.find((t) => t.slugs.includes(slug))?.id ?? "sonstiges";
}

export type ChapterOverview = {
  id: string;
  slug: string;
  title: string;
  order: number;
  topicId: string;
  total: number;
  read: number;
  understood: number;
  again: number;
  lastPosition: number;
  checkScore: number | null;
  checkPassed: boolean;
  state: ChapterState;
  estMinutes: number;
};

export type TopicOverview = { id: string; title: string; description: string; icon: string; color: string; chapters: ChapterOverview[]; total: number; read: number; understood: number };

export type LernbuchOverview = {
  topics: TopicOverview[];
  total: number;
  read: number;
  understood: number;
  dueAgain: number;
  chaptersDone: number;
  checksPassed: number;
  current: ChapterOverview | null;
};

export type StoryCard = {
  id: string;
  question: string;
  answer: string;
  /** Buchstaben der richtigen Antwort(en) – für die Übersetzung */
  answerLabels: string[];
  wrong: string[];
  explanation: string | null;
  legal: string | null;
  mnemonic: string | null;
  verified: boolean;
  status: ReadStatus | null;
  starred: boolean;
};

export function chapterState(c: { total: number; read: number; checkPassed: boolean }): ChapterState {
  if (c.checkPassed) return "check";
  if (c.total > 0 && c.read >= c.total) return "gelesen";
  if (c.read > 0) return "weiterlesen";
  return "neu";
}

export function estMinutes(total: number): number {
  return Math.max(1, Math.round(total * 0.5));
}

/** Natürliche Sortierung von Fragen-IDs (rwb-2 vor rwb-10). */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, "de", { numeric: true });
}

/** Erklärung nur anzeigen, wenn sie mehr als die Antwort enthält. */
export function extraExplanation(answer: string, explanation: string | null | undefined): string | null {
  if (!explanation) return null;
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  return norm(explanation) === norm(answer) ? null : explanation;
}
