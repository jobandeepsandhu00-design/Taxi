/**
 * Optionale KI für „Frag Toni“ – unsichtbar für Nutzer:innen.
 * Nur aktiv mit AI_ENABLED (siehe aiEnabled in server/coach/llm.ts) und nur, wenn die Suche nichts findet.
 * Jeder Fehler führt still zur regelbasierten Antwort – nie API- oder Schlüssel-Fehler anzeigen.
 */
export interface CoachAiProvider {
  /** Antwort auf eine Frage mit Kontext aus der Wissensbasis, oder null */
  answer(question: string, context: string): Promise<string | null>;
}

/** Kontext aus Suchtreffern (für den Prompt). */
export function contextFromHits(hits: { title: string; body: string }[]): string {
  return hits
    .slice(0, 6)
    .map((h, i) => `[${i + 1}] ${h.title}\n${h.body.slice(0, 600)}`)
    .join("\n\n");
}
