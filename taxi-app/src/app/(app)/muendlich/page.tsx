import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ORAL_FREE_DAILY } from "@/lib/oral";
import { coachConfigured } from "@/server/coach/llm";
import { oralAccess, sttConfigured } from "@/server/oral";
import { OralStart } from "./oral-start";

export const metadata: Metadata = { title: "Mündliche Prüfung" };

export default async function OralStartPage() {
  const user = await requireUser();
  const [access, count, recent] = await Promise.all([
    oralAccess(user),
    prisma.oralQuestion.count(),
    prisma.oralSession.findMany({ where: { userId: user.id, finishedAt: { not: null } }, orderBy: { startedAt: "desc" }, take: 5, select: { id: true, mode: true, totalScore: true, startedAt: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Toni prüft dich" title="Mündliche Prüfung" description="Du hörst die Frage, antwortest laut – und bekommst sofort Feedback zu den Kernpunkten." />
      <OralStart
        enabled={coachConfigured() && count > 0}
        speech={sttConfigured()}
        unlimited={access.unlimited}
        remaining={access.unlimited ? null : access.remaining}
        freeDaily={ORAL_FREE_DAILY}
        privacyAck={access.privacyAck}
        saveAudio={access.saveAudio}
        questionCount={count}
        recent={recent.map((r) => ({ id: r.id, mode: r.mode, percent: r.totalScore ?? 0, date: r.startedAt.toISOString() }))}
      />
    </div>
  );
}
