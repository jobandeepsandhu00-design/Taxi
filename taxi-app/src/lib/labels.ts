import type { ContentOrigin, Difficulty, QuestionStatus, QuizMode, SourceType } from "@prisma/client";

export const difficultyLabel: Record<Difficulty, string> = { EASY: "Leicht", MEDIUM: "Mittel", HARD: "Schwer" };
export const statusLabel: Record<QuestionStatus, string> = {
  DRAFT: "Entwurf",
  PUBLISHED: "Veröffentlicht",
  ARCHIVED: "Archiviert",
};
export const originLabel: Record<ContentOrigin, string> = {
  OFFICIAL: "Offiziell (verifiziert)",
  PRACTICE: "Übungsfrage (eigenständig erstellt)",
  DEMO: "Demo-Frage",
};
export const originShort: Record<ContentOrigin, string> = { OFFICIAL: "Offiziell", PRACTICE: "Übung", DEMO: "Demo" };
export const sourceTypeLabel: Record<SourceType, string> = {
  LAW: "Gesetz / Verordnung",
  OFFICIAL_EXAM: "Offizielle Prüfungsunterlage",
  OFFICIAL_DOCUMENT: "Offizielles Dokument",
  TEXTBOOK: "Lehrbuch / Skriptum",
  OTHER: "Sonstige",
};
export const modeLabel: Record<QuizMode, string> = {
  LEARN: "Lernmodus",
  PRACTICE: "Übungsquiz",
  MISTAKES: "Fehlertraining",
  REVIEW: "Wiederholung",
};
