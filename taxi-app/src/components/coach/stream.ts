"use client";

export type CoachStreamEvent =
  | { type: "meta"; citations?: { id: string; text: string; category: string }[]; remaining?: number | null }
  | { type: "delta"; text: string }
  | { type: "done"; messageId?: string }
  | { type: "error"; message: string };

/** Liest eine NDJSON-Antwort des Coaches und ruft für jedes Ereignis `onEvent` auf. */
export async function readCoachStream(url: string, body: unknown, onEvent: (e: CoachStreamEvent) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    onEvent({ type: "error", message: json?.error ?? "Der Coach ist gerade nicht erreichbar." });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as CoachStreamEvent);
    }
  }
}
