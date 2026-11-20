import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

/** Standardmodell des Coaches; per COACH_MODEL überschreibbar. */
export const COACH_MODEL = process.env.COACH_MODEL || "claude-opus-5-5";

/** Testmodus: deterministische Antworten ohne API-Aufruf (für E2E-Tests und lokale Entwicklung). */
export function coachFake(): boolean {
  return process.env.COACH_FAKE === "1";
}

export function coachConfigured(): boolean {
  return coachFake() || Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export const UNSURE_SENTENCE = "Das solltest du im offiziellen Fragenkatalog oder bei der WKO nachprüfen.";

/** Gemeinsame Regeln für alle Coach-Aufrufe (stabiler Teil des System-Prompts). */
export const COACH_RULES = `Du bist „Dein Taxi-Coach“ in der App TaxiFit – ausschließlich für die Vorbereitung auf die Taxi-Prüfung in Wien (Taxilenker:in bzw. Konzession).
Sprache: österreichisches Deutsch, du-Form, freundlich, motivierend, knapp. Keine Floskeln.

Regeln:
- Antworte nur auf Basis des bereitgestellten Kontexts (Lernstand-JSON und angehängte Fragen mit Erklärungen). Erfinde keine Gesetze, Paragraphen, Zahlen, Fristen oder Prüfungsfragen.
- Nenne Paragraphen/Rechtsquellen nur, wenn sie wörtlich im Kontext stehen.
- Wenn du dir nicht sicher bist oder der Kontext die Frage nicht abdeckt, sag ehrlich, was du nicht weißt, und schreibe den Satz: „${UNSURE_SENTENCE}“
- Themen außerhalb der Taxi-Prüfungsvorbereitung lehnst du freundlich ab und lenkst zurück zum Lernen.
- Die Übungsfragen der App sind eigenständig erstellt und keine offiziellen Prüfungsfragen – weise darauf hin, wenn es relevant ist.
- Gib keine Rechts- oder Steuerberatung für konkrete Einzelfälle.
- Formatierung: kurze Absätze, bei Aufzählungen „- “. Kein Markdown-Fettdruck, keine Überschriften.`;

export type CoachMessageParam = { role: "user" | "assistant"; content: string };

function systemBlocks(extra: string): Anthropic.Beta.BetaTextBlockParam[] {
  return [
    { type: "text", text: COACH_RULES, cache_control: { type: "ephemeral" } },
    { type: "text", text: extra },
  ];
}

/** Streamt die Coach-Antwort als Text-Häppchen. */
export async function* streamCoach(params: { context: string; messages: CoachMessageParam[]; fake?: () => string; maxTokens?: number }): AsyncGenerator<string> {
  if (coachFake()) {
    const text = params.fake?.() ?? "Servus! Ich bin dein Taxi-Coach. (Testmodus)";
    for (const chunk of text.match(/.{1,12}/gs) ?? [text]) {
      await new Promise((r) => setTimeout(r, 15));
      yield chunk;
    }
    return;
  }
  const stream = anthropic().beta.messages.stream({
    model: COACH_MODEL,
    max_tokens: params.maxTokens ?? 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: systemBlocks(params.context),
    messages: params.messages,
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") yield `\n\nDazu kann ich leider nichts sagen. ${UNSURE_SENTENCE}`;
}

/** Strukturierte Antwort (validiert gegen ein Zod-Schema). */
export async function parseCoach<T extends z.ZodType>(params: { context: string; prompt: string; schema: T; fake: () => z.infer<T>; maxTokens?: number }): Promise<z.infer<T> | null> {
  if (coachFake()) return params.fake();
  const res = await anthropic().beta.messages.parse({
    model: COACH_MODEL,
    max_tokens: params.maxTokens ?? 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(params.schema) },
    system: systemBlocks(params.context),
    messages: [{ role: "user", content: params.prompt }],
  });
  if (res.stop_reason === "refusal") return null;
  return (res.parsed_output ?? null) as z.infer<T> | null;
}

/** Fehler einheitlich in eine verständliche Meldung übersetzen. */
export function coachErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) return "Der Coach ist gerade stark ausgelastet – bitte versuch es gleich noch einmal.";
  if (err instanceof Anthropic.AuthenticationError) return "Der Coach ist nicht richtig eingerichtet (API-Schlüssel).";
  if (err instanceof Anthropic.APIError) return "Der Coach ist gerade nicht erreichbar – bitte später erneut versuchen.";
  return "Da ist etwas schiefgelaufen – bitte erneut versuchen.";
}
