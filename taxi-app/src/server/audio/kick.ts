import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import { autoEnqueueAndKick } from "./jobs";

/**
 * Nach dem Anlegen/Bearbeiten/Importieren von Fragen: fehlende bzw. veraltete Audios automatisch einreihen
 * und den Worker anstoßen (läuft nach der Antwort, blockiert die Aktion nicht). Ohne TTS-Schlüssel: nichts.
 */
export async function kickAudioAfterChange(): Promise<void> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return;
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;
    after(() => autoEnqueueAndKick(origin).catch(() => undefined));
  } catch {
    /* außerhalb eines Requests – ignorieren */
  }
}
