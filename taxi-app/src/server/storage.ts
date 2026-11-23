import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Allgemeiner Objektspeicher: Supabase Storage (öffentliche Buckets) oder lokal unter .data/<bucket> (Entwicklung/Tests).
 */
function supabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}
const localAllowed = () => !process.env.VERCEL;
const localDir = (bucket: string) => path.join(process.cwd(), ".data", bucket);

export function objectStorageReady(): boolean {
  return Boolean(supabaseEnv()) || localAllowed();
}

export async function uploadObject(bucket: string, objectPath: string, data: Buffer, contentType: string): Promise<void> {
  const env = supabaseEnv();
  if (env) {
    const res = await fetch(`${env.url}/storage/v1/object/${bucket}/${objectPath}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.key}`, apikey: env.key, "Content-Type": contentType, "x-upsert": "true", "cache-control": "public, max-age=31536000, immutable" },
      body: new Uint8Array(data),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Speicher: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 120)}`);
    return;
  }
  if (!localAllowed()) throw new Error("Speicher nicht eingerichtet (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY fehlen).");
  const file = path.join(localDir(bucket), objectPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

export function objectPublicUrl(bucket: string, objectPath: string): string {
  const env = supabaseEnv();
  if (env) return `${env.url}/storage/v1/object/public/${bucket}/${objectPath}`;
  return `/api/storage/${bucket}/${objectPath}`;
}

export async function readLocalObject(bucket: string, objectPath: string): Promise<Buffer | null> {
  const safe = path.normalize(objectPath).replace(/^(\.\.(\/|\\|$))+/, "");
  if (safe.includes("..") || !/^[\w-]+$/.test(bucket)) return null;
  return readFile(path.join(localDir(bucket), safe)).catch(() => null);
}
