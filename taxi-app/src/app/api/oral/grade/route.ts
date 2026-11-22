import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { gradeByRules, ORAL_MAX_SECONDS, parseFollowUps, parseKeyPoints } from "@/lib/oral";
import { rateLimit } from "@/lib/rate-limit";
import { coachConfigured } from "@/server/coach/llm";
import { gradeOralAnswer, oralAccess, ORAL_LIMIT_REACHED, updateOralProgress } from "@/server/oral";

export const maxDuration = 60;

const bodySchema = z.object({
  sessionId: z.string().min(1).max(64),
  questionId: z.string().min(1).max(64),
  transcript: z.string().trim().max(4000),
  followUpQuestion: z.string().trim().max(500).nullish(),
  followUpTranscript: z.string().trim().max(4000).nullish(),
  audioPath: z.string().max(300).nullish(),
  durationMs: z.number().int().min(0).max((ORAL_MAX_SECONDS + 5) * 2000).nullish(),
  dontKnow: z.boolean().optional(),
  /** Prüfungsmodus: bei fehlenden Pflichtpunkten zuerst eine Nachfrage zurückgeben (ohne zu speichern) */
  allowFollowUp: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const rl = rateLimit(`oral-grade:${user.id}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Zu viele Anfragen – bitte ${rl.retryAfterSec} s warten.` }, { status: 429 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const b = parsed.data;
  if (!b.dontKnow && b.transcript.length < 2) return NextResponse.json({ error: "Bitte gib eine Antwort." }, { status: 400 });

  const session = await prisma.oralSession.findFirst({ where: { id: b.sessionId, userId: user.id, finishedAt: null }, select: { id: true, mode: true, questionIds: true } });
  if (!session || !session.questionIds.includes(b.questionId)) return NextResponse.json({ error: "Sitzung nicht gefunden." }, { status: 404 });
  const q = await prisma.oralQuestion.findUnique({ where: { id: b.questionId } });
  if (!q) return NextResponse.json({ error: "Frage nicht gefunden." }, { status: 404 });

  const access = await oralAccess(user);
  if (!access.unlimited && access.remaining <= 0 && !access.usedIds.includes(q.id)) {
    return NextResponse.json({ error: ORAL_LIMIT_REACHED, limitReached: true }, { status: 402 });
  }
  // Pfad nur übernehmen, wenn er wirklich zu diesem Konto gehört
  const audioPath = access.saveAudio && b.audioPath?.startsWith(`${user.id}/`) ? b.audioPath : null;
  const points = parseKeyPoints(q.keyPoints);

  let grade;
  if (b.dontKnow) {
    grade = { coveredPointIds: [], missingPointIds: points.map((p) => p.id), score: 0, verdict: "falsch" as const, feedbackDe: "Kein Problem – schau dir die Musterantwort in Ruhe an und sprich sie einmal laut nach.", followUpQuestion: null };
  } else {
    const combined = [b.transcript, b.followUpTranscript].filter(Boolean).join(" ");
    // Optional KI (AI_ENABLED) – sonst und bei jedem Fehler: Bewertung nach Regeln (Stichwörter je Kernpunkt)
    if (coachConfigured()) {
      grade = await gradeOralAnswer(q, { transcript: b.transcript, followUpQuestion: b.followUpQuestion, followUpTranscript: b.followUpTranscript }).catch(() => null);
    }
    grade ??= gradeByRules(points, parseFollowUps(q.followUps), combined, b.transcript.length);
  }

  // Prüfungsmodus: genau eine Nachfrage, wenn Pflichtpunkte fehlen
  if (b.allowFollowUp && session.mode === "pruefung" && !b.followUpTranscript && !b.dontKnow && grade.verdict !== "richtig" && grade.followUpQuestion) {
    return NextResponse.json({ followUp: grade.followUpQuestion });
  }

  const attempt = await prisma.oralAttempt.create({
    data: {
      userId: user.id,
      oralQuestionId: q.id,
      sessionId: session.id,
      audioPath,
      transcript: b.dontKnow ? "" : b.transcript,
      followUpQuestion: b.followUpTranscript ? b.followUpQuestion ?? null : null,
      followUpTranscript: b.followUpTranscript ?? null,
      coveredPointIds: grade.coveredPointIds,
      score: grade.score,
      verdict: grade.verdict,
      feedbackDe: grade.feedbackDe,
      durationMs: b.durationMs ?? null,
    },
  });
  const leitner = await updateOralProgress(user.id, q.id, grade.verdict, grade.score);
  const after = await oralAccess(user);
  return NextResponse.json({
    attemptId: attempt.id,
    verdict: grade.verdict,
    score: grade.score,
    coveredPointIds: grade.coveredPointIds,
    missingPointIds: grade.missingPointIds,
    feedbackDe: grade.feedbackDe,
    box: leitner.box,
    previousBox: leitner.previousBox,
    remaining: after.unlimited ? null : after.remaining,
    keyPoints: points,
    modelAnswerDe: q.modelAnswerDe,
    legalReference: q.legalReference,
  });
}
