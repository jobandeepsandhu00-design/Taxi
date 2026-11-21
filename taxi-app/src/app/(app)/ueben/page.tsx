import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Layers, Repeat, RotateCcw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate } from "@/lib/dates";
import { startReviewAction } from "@/server/actions/learning";
import { publishedWhere } from "@/server/questions";

export const metadata: Metadata = { title: "Üben" };

export default async function UebenPage() {
  const user = await requireUser();
  const [dueReview, dueRead, mistakes] = await Promise.all([
    prisma.reviewItem.count({ where: { userId: user.id, dueDate: { lte: dayKeyToDate(dayKey()) }, question: publishedWhere } }),
    prisma.readProgress.count({ where: { userId: user.id, status: "nochmal", nextRepeatAt: { lte: new Date() }, question: publishedWhere } }),
    prisma.mistakeEntry.count({ where: { userId: user.id, resolved: false, question: publishedWhere } }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Üben" title="Wiederholung" description="Hier wiederholst du, was fällig ist – Quizfragen nach dem Lernkarten-Prinzip und Lernbuch-Karten, die du mit „Nochmal“ markiert hast." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex h-full flex-col gap-3 pt-5 sm:pt-6">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><Repeat className="size-6" /></span>
            <h2 className="text-lg font-extrabold text-navy">Fällige Quizfragen</h2>
            <p className="text-sm text-muted-foreground">{dueReview > 0 ? `${dueReview} ${dueReview === 1 ? "Frage ist" : "Fragen sind"} heute fällig.` : "Heute ist nichts fällig – super!"}</p>
            {dueReview > 0 && (
              <form action={startReviewAction} className="mt-auto">
                <SubmitButton className="w-full">Wiederholung starten</SubmitButton>
              </form>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-full flex-col gap-3 pt-5 sm:pt-6">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><BookOpenCheck className="size-6" /></span>
            <h2 className="text-lg font-extrabold text-navy">Lernbuch: „Nochmal“-Karten</h2>
            <p className="text-sm text-muted-foreground">{dueRead > 0 ? `${dueRead} ${dueRead === 1 ? "Karte wartet" : "Karten warten"} auf dich.` : "Keine Karten zum Wiederholen."}</p>
            {dueRead > 0 && (
              <Link href="/lernbuch/story/wiederholung" className="mt-auto inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 font-bold text-primary-foreground" data-testid="repeat-story">
                Wiederholungs-Story öffnen
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <QuickLink href="/fehler" icon={<RotateCcw className="size-5" />} title="Fehlertraining" text={mistakes > 0 ? `${mistakes} offene Fehler` : "Keine offenen Fehler"} />
        <QuickLink href="/lernkarten" icon={<Layers className="size-5" />} title="Karteikarten" text="Wischen: gewusst / nicht gewusst" />
        <QuickLink href="/quiz" icon={<Sparkles className="size-5" />} title="Freies Quiz" text="Nur freigeschaltete Kapitel" />
      </div>
    </div>
  );
}

function QuickLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="glass glow-hover flex items-center gap-3 rounded-2xl p-4">
      <span className="flex size-10 items-center justify-center rounded-xl bg-foreground/5 text-primary">{icon}</span>
      <span>
        <span className="block font-bold text-navy">{title}</span>
        <span className="block text-xs text-muted-foreground">{text}</span>
      </span>
    </Link>
  );
}
