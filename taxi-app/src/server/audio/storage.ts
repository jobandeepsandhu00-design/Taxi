import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Audio-Speicher: Supabase Storage (öffentlicher Bucket „audio“, unveränderliche Cache-Header).
 * Ohne Supabase-Zugang (lokale Entwicklung/Tests): Dateisystem unter .data/audio, ausgeliefert über /api/audio/file.
 */
const BUCKET = "audio";
const LOCAL_DIR = path.join(process.cwd(), ".data", "audio");

function supabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

/** Lokaler Speicher nur außerhalb von Vercel (dort ist das Dateisystem schreibgeschützt). */
function localAllowed() {
  return !process.env.VERCEL;
}

export function storageMode(): "supabase" | "local" | null {
  if (supabaseEnv()) return "supabase";
  return localAllowed() ? "local" : null;
}

export async function uploadAudioFile(objectPath: string, data: Buffer, contentType: string): Promise<void> {
  const env = supabaseEnv();
  if (env) {
    const res = await fetch(`${env.url}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.key}`, apikey: env.key, "Content-Type": contentType, "x-upsert": "true", "cache-control": "public, max-age=31536000, immutable" },
      body: new Uint8Array(data),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Speicher: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 120)}`);
    return;
  }
  if (!localAllowed()) throw new Error("Speicher nicht eingerichtet (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY fehlen).");
  const file = path.join(LOCAL_DIR, objectPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

export async function deleteAudioFiles(paths: string[]): Promise<void> {
  const env = supabaseEnv();
  if (!env || paths.length === 0) return;
  await fetch(`${env.url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${env.key}`, apikey: env.key, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: paths }),
  }).catch(() => undefined);
}

/** Öffentliche URL einer Audiodatei (für Wiedergabe und Offline-Cache). */
export function audioPublicUrl(objectPath: string): string {
  const env = supabaseEnv();
  if (env) return `${env.url}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  return `/api/audio/file/${objectPath}`;
}

/** Lokale Datei lesen (nur Entwicklungs-Fallback). */
export async function readLocalAudio(objectPath: string): Promise<Buffer | null> {
  const safe = path.normalize(objectPath).replace(/^(\.\.(\/|\\|$))+/, "");
  if (safe.includes("..")) return null;
  return readFile(path.join(LOCAL_DIR, safe)).catch(() => null);
}
