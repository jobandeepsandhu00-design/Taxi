import type { ContentOrigin, Difficulty } from "@prisma/client";

/** Serialisierbare Frage OHNE Lösung (wird an den Client gesendet) */
export interface ClientQuestion {
  id: string;
  text: string;
  difficulty: Difficulty;
  multipleCorrect: boolean;
  imageUrl: string | null;
  tags: string[];
  origin: ContentOrigin;
  sourceDetail: string | null;
  category: { id: string; name: string; slug: string; color: string };
  topic: { name: string } | null;
  source: { title: string; verified: boolean } | null;
  options: { id: string; label: string; text: string }[];
  /** zwischengespeicherte Fachbegriffe (KI-Glossar), falls vorhanden */
  glossary?: { term: string; definition: string }[];
}
