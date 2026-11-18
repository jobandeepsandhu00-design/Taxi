import { prisma } from "@/lib/db";

export interface AppSettings {
  /** Nach so vielen richtigen Antworten in Folge wird eine Frage aus der Fehlerliste entfernt */
  mistakeRemovalThreshold: number;
  /** Standardanzahl Fragen im Übungsquiz */
  defaultQuizSize: number;
  /** Pflicht-Hinweis, der auf allen Seiten angezeigt wird */
  disclaimer: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  mistakeRemovalThreshold: 2,
  defaultQuizSize: 20,
  disclaimer:
    "Diese App ist ein unabhängiges Lernangebot. Übungs- und Demo-Fragen sind eigenständig erstellt und keine offiziellen Prüfungsfragen. Maßgeblich sind ausschließlich die aktuellen Rechtsvorschriften und die Vorgaben der zuständigen Prüfungsstelle.",
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.appSetting.findMany();
  const settings: AppSettings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in settings) (settings as unknown as Record<string, unknown>)[row.key] = row.value;
  }
  return settings;
}
