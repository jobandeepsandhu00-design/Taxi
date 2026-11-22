import "server-only";
import { z } from "zod";
import type { CoachAiProvider } from "@/lib/coach/ai";
import { aiEnabled, parseCoach, UNSURE_SENTENCE } from "./llm";

const schema = z.object({ answer: z.string() });

/** Anthropic-Anbieter (nur wenn AI_ENABLED). */
const anthropicProvider: CoachAiProvider = {
  async answer(question, context) {
    const out = await parseCoach({
      context: `Wissensbasis der App (Skript-Fragen, FAQ):\n${context || "(keine Treffer)"}`,
      prompt: `Frage: ${question}\nAntworte kurz (2–4 Sätze, du-Form) nur auf Basis der Wissensbasis. Wenn sie nicht reicht: „${UNSURE_SENTENCE}“`,
      schema,
      fake: () => ({ answer: `Dazu steht in der App: ${context.split("\n")[0] || UNSURE_SENTENCE}` }),
      maxTokens: 800,
    });
    return out?.answer ?? null;
  },
};

/** Liefert den KI-Anbieter oder null (Standard: keine KI). */
export function coachAi(): CoachAiProvider | null {
  return aiEnabled() ? anthropicProvider : null;
}

/** Sichere Variante: nie werfen. */
export async function aiFallback(question: string, context: string): Promise<string | null> {
  const p = coachAi();
  if (!p) return null;
  try {
    return await p.answer(question, context);
  } catch {
    return null;
  }
}
