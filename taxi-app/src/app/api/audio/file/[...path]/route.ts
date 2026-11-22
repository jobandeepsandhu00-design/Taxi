import { NextResponse } from "next/server";
import { readLocalAudio, storageMode } from "@/server/audio/storage";

/** Lokaler Entwicklungs-Fallback: Audiodateien aus .data/audio ausliefern. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (storageMode() !== "local") return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const { path } = await params;
  const p = path.map(decodeURIComponent).join("/");
  const data = await readLocalAudio(p);
  if (!data) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": p.endsWith(".opus") ? "audio/ogg" : "audio/mpeg", "Cache-Control": "public, max-age=31536000, immutable", "Accept-Ranges": "bytes" },
  });
}
