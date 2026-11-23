import { NextResponse } from "next/server";
import { readLocalObject } from "@/server/storage";

/** Nur lokale Entwicklung/Tests: Dateien aus .data/<bucket> ausliefern (in Produktion liefert Supabase direkt aus). */
const ALLOWED = new Set(["stories"]);
const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", mp4: "video/mp4" };

export async function GET(_req: Request, { params }: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path } = await params;
  if (!ALLOWED.has(bucket)) return new NextResponse(null, { status: 404 });
  const p = path.join("/");
  const data = await readLocalObject(bucket, p);
  if (!data) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": TYPES[p.split(".").pop() ?? ""] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
}
