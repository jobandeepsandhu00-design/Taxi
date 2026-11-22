import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ORAL_MAX_BYTES } from "@/lib/oral";
import { rateLimit } from "@/lib/rate-limit";
import { oralAccess, sttConfigured, transcribeAudio, uploadAudio } from "@/server/oral";

export const maxDuration = 60;

/** Aufnahme (webm/mp4, max. 90 s / 5 MB) → Transkript. Die Aufnahme wird nur gespeichert, wenn gewünscht. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const rl = rateLimit(`oral-stt:${user.id}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Zu viele Aufnahmen – bitte ${rl.retryAfterSec} s warten.` }, { status: 429 });
  if (!sttConfigured()) return NextResponse.json({ error: "Tippe deine Antwort bitte ein.", fallback: true }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const sessionId = String(form?.get("sessionId") ?? "");
  const questionId = String(form?.get("questionId") ?? "");
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: "Keine Aufnahme empfangen." }, { status: 400 });
  if (audio.size > ORAL_MAX_BYTES) return NextResponse.json({ error: "Die Aufnahme ist zu groß (max. 90 Sekunden)." }, { status: 413 });
  if (!/^audio\/(webm|mp4|ogg|mpeg|x-m4a|aac|wav)/.test(audio.type || "audio/webm")) return NextResponse.json({ error: "Dieses Audioformat wird nicht unterstützt." }, { status: 415 });

  const session = await prisma.oralSession.findFirst({ where: { id: sessionId, userId: user.id, finishedAt: null }, select: { questionIds: true } });
  if (!session || !session.questionIds.includes(questionId)) return NextResponse.json({ error: "Sitzung nicht gefunden." }, { status: 404 });
  const q = await prisma.oralQuestion.findUnique({ where: { id: questionId }, select: { modelAnswerDe: true } });
  if (!q) return NextResponse.json({ error: "Frage nicht gefunden." }, { status: 404 });

  const access = await oralAccess(user);
  if (!access.unlimited && access.remaining <= 0 && !access.usedIds.includes(questionId)) {
    return NextResponse.json({ error: "Tageslimit erreicht.", limitReached: true }, { status: 402 });
  }

  try {
    const fakeText = String(form?.get("fakeTranscript") ?? "") || q.modelAnswerDe;
    const [transcript, audioPath] = await Promise.all([transcribeAudio(audio, fakeText), access.saveAudio ? uploadAudio(user.id, audio) : Promise.resolve(null)]);
    if (!transcript) return NextResponse.json({ error: "Ich habe nichts verstanden – sprich bitte etwas lauter oder tippe deine Antwort.", empty: true }, { status: 422 });
    return NextResponse.json({ transcript, audioPath });
  } catch (err) {
    console.error("Oral STT", err);
    return NextResponse.json({ error: "Die Spracherkennung hat nicht geklappt – versuch es nochmal oder tippe deine Antwort.", fallback: true }, { status: 502 });
  }
}
