import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Headphones } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ORAL_FREE_DAILY } from "@/lib/oral";
import { oralAccess } from "@/server/oral";
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
      <Link href="/muendlich/auto" className="panel-night glow-hover flex items-center gap-4 rounded-3xl p-5 text-white" data-testid="oral-auto-link">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Headphones className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold tracking-wider text-white/70 uppercase">Neu</span>
          <span className="block text-lg font-extrabold">Auto-Modus</span>
          <span className="block text-sm text-white/75">Frage hören, laut antworten, Antwort hören – Kapitel für Kapitel, auch mit gesperrtem Bildschirm.</span>
        </span>
        <ArrowRight className="size-6 shrink-0" />
      </Link>
      <h2 className="text-lg font-extrabold text-navy">Mit Bewertung durch Toni</h2>
      <OralStart
        enabled={count > 0}
        speech
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
