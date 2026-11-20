import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SegState } from "@/components/focus/focus-parts";
import { OralReport, type ReportItem } from "@/components/oral/oral-report";
import { OralRunner } from "@/components/oral/oral-runner";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseKeyPoints, sessionPercent, type OralMode, type OralVerdict } from "@/lib/oral";

export const metadata: Metadata = { title: "Mündliche Prüfung" };

export default async function OralSessionPage({ params, searchParams }: { params: Promise<{ sessionId: string }>; searchParams: Promise<{ timer?: string }> }) {
  const user = await requireUser();
  const { sessionId } = await params;
  const { timer } = await searchParams;
  const session = await prisma.oralSession.findFirst({ where: { id: sessionId, userId: user.id }, include: { attempts: { orderBy: { createdAt: "asc" } } } });
  if (!session) notFound();

  const qs = await prisma.oralQuestion.findMany({ where: { id: { in: session.questionIds } }, include: { category: { select: { name: true } } } });
  const byId = new Map(qs.map((q) => [q.id, q]));
  const ordered = session.questionIds.map((id) => byId.get(id)).filter((q): q is NonNullable<typeof q> => Boolean(q));
  const last = new Map<string, (typeof session.attempts)[number]>();
  for (const a of session.attempts) last.set(a.oralQuestionId, a);
  const mode = session.mode as OralMode;

  if (session.finishedAt) {
    const items: ReportItem[] = ordered.map((q) => {
      const a = last.get(q.id);
      return {
        id: q.id,
        questionDe: q.questionDe,
        category: q.category.name,
        modelAnswerDe: q.modelAnswerDe,
        keyPoints: parseKeyPoints(q.keyPoints),
        attempt: a ? { verdict: a.verdict as OralVerdict, score: a.score, transcript: a.transcript, followUpQuestion: a.followUpQuestion, followUpTranscript: a.followUpTranscript, coveredPointIds: a.coveredPointIds, feedbackDe: a.feedbackDe } : null,
      };
    });
    const percent = session.totalScore ?? sessionPercent([...last.values()].map((a) => a.score), mode === "pruefung" ? ordered.length : Math.max(1, last.size));
    return <OralReport mode={mode} percent={percent} items={items} />;
  }

  const answered: Record<string, SegState> = {};
  for (const [id, a] of last) answered[id] = mode === "pruefung" ? "answered" : a.verdict === "richtig" ? "correct" : a.verdict === "falsch" ? "wrong" : "answered";
  return (
    <OralRunner
      sessionId={session.id}
      mode={mode}
      timer={timer === "1"}
      answered={answered}
      questions={ordered.map((q) => ({ id: q.id, questionDe: q.questionDe, category: q.category.name, verified: q.verified }))}
    />
  );
}
