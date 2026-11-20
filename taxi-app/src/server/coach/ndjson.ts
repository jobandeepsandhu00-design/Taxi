import "server-only";

export type CoachEvent =
  | { type: "meta"; citations?: { id: string; text: string; category: string }[]; remaining?: number | null; variantId?: string; cached?: boolean; verified?: boolean }
  | { type: "extra"; kind: "why_wrong"; label: string; text: string; variantId?: string }
  | { type: "delta"; text: string }
  | { type: "done"; messageId?: string }
  | { type: "error"; message: string };

/** Antwort als NDJSON-Stream (eine JSON-Zeile pro Ereignis). */
export function ndjsonResponse(run: (send: (e: CoachEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Bricht der Client ab (Seite verlassen), läuft die Antwort weiter und wird trotzdem gespeichert.
      const send = (e: CoachEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          closed = true;
        }
      };
      try {
        await run(send);
      } catch (err) {
        console.error("Coach-Stream fehlgeschlagen", err);
        send({ type: "error", message: "Da ist etwas schiefgelaufen – bitte erneut versuchen." });
      } finally {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* bereits geschlossen */
          }
        }
      }
    },
    cancel() {
      closed = true;
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
