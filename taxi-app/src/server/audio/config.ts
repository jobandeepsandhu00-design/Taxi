import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { DEFAULT_LEXICON, ssmlBodyFor, ssmlToPlain, type AudioKind, type LexiconEntry, type QuestionForAudio } from "@/lib/tts/prepare";
import { ttsProvider } from "@/lib/tts/provider";

export type VoiceChoice = "female" | "male";

export async function getAudioConfig() {
  const provider = ttsProvider();
  const row = await prisma.audioConfig.findUnique({ where: { id: "default" } });
  const female = row?.voiceFemale || provider.defaultVoices.female;
  const male = row?.voiceMale || provider.defaultVoices.male;
  const defaultVoice = (row?.defaultVoice === "male" ? "male" : "female") as VoiceChoice;
  return { provider, voices: { female, male }, defaultVoice, defaultVoiceId: defaultVoice === "male" ? male : female, pricePerMillion: row?.pricePerMillion ?? 16 };
}

/** Lexikon aus der DB (fällt auf das Standard-Wörterbuch zurück). */
export async function getLexicon(): Promise<LexiconEntry[]> {
  const rows = await prisma.ttsLexicon.findMany({ select: { term: true, spoken: true } }).catch(() => []);
  return rows.length ? rows : DEFAULT_LEXICON;
}

export type AudioQuestionRow = { id: string; text: string; explanation: string; categoryId: string; options: { label: string; text: string; isCorrect: boolean }[] };

export function toAudioQuestion(q: AudioQuestionRow): QuestionForAudio {
  return {
    text: q.text,
    answer: q.options.filter((o) => o.isCorrect).map((o) => o.text).join("\n"),
    explanation: q.explanation,
    options: q.options.map((o) => ({ label: o.label, text: o.text })),
  };
}

export type AudioItemSpec = { kind: AudioKind; body: string; hash: string; characters: number };

/** SSML + Hash für eine Frage/Art/Stimme. */
export function audioItemSpec(kind: AudioKind, q: QuestionForAudio, voice: string, lexicon: LexiconEntry[]): AudioItemSpec | null {
  const body = ssmlBodyFor(kind, q, lexicon);
  if (!body) return null;
  const hash = createHash("sha256").update(`${body}|${voice}`).digest("hex");
  return { kind, body, hash, characters: ssmlToPlain(body).length };
}

export const questionAudioSelect = { id: true, text: true, explanation: true, categoryId: true, options: { orderBy: { order: "asc" as const }, select: { label: true, text: true, isCorrect: true } } } as const;
