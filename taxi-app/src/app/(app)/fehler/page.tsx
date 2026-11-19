import type { Metadata } from "next";
import Link from "next/link";
import { PartyPopper, RotateCcw, TrendingUp } from "lucide-react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { startMistakeTrainingAction } from "@/server/actions/learning";

export const metadata: Metadata = { title: "Falsche Antworten" };

export default async function MistakesPage({ searchParams }: { searchParams: Promise<{ leer?: string }> }) {
  const user = await requireUser();
  const { leer } = await searchParams;
  const [open, resolvedCount, settings] = await Promise.all([
    prisma.mistakeEntry.findMany({
      where: { userId: user.id, resolved: false, question: { status: "PUBLISHED" } },
      include: { question: { select: { id: true, text: true, difficulty: true, category: { select: { id: true, name: true } } } } },
      orderBy: [{ wrongCount: "desc" }, { lastWrongAt: "desc" }],
    }),
    prisma.mistakeEntry.count({ where: { userId: user.id, resolved: true } }),
    getSettings(),
  ]);
  const total = open.length + resolvedCount;
  const improvement = total ? Math.round((resolvedCount / total) * 100) : 0;
  const byCategory = new Map<string, { name: string; count: number }>();
  for (const m of open) {
    const c = byCategory.get(m.question.category.id) ?? { name: m.question.category.name, count: 0 };
    c.count += 1;
    byCategory.set(m.question.category.id, c);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Fehlertraining"
        title="Falsche Antworten"
        description={`Falsch beantwortete Fragen werden automatisch gesammelt. Nach ${settings.mistakeRemovalThreshold} richtigen Antworten in Folge wird eine Frage aus der Liste entfernt.`}
      />
      {leer && <Alert variant="info" className="mb-4">Aktuell gibt es keine offenen Fehler in dieser Auswahl.</Alert>}
      <div className="mb-6 grid gap-3 sm:grid-cols-3 grid-cols-1">
        <Card className="p-5"><p className="text-3xl font-extrabold text-destructive">{open.length}</p><p className="text-sm text-muted-foreground">offene Fehler</p></Card>
        <Card className="p-5"><p className="text-3xl font-extrabold text-success">{resolvedCount}</p><p className="text-sm text-muted-foreground">bereits verbessert</p></Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-3xl font-extrabold text-navy"><TrendingUp className="size-6 text-link" />{improvement}%</p>
          <p className="text-sm text-muted-foreground">Verbesserungsquote</p>
          <Progress value={improvement} className="mt-2" barClassName="bg-success" />
        </Card>
      </div>

      {open.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="Keine offenen Fehler"
          description="Sehr gut! Sobald du eine Frage falsch beantwortest, erscheint sie hier zur Wiederholung."
          action={<Link href="/quiz" className="font-semibold text-link hover:underline">Quiz starten</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:order-2">
            <CardHeader><CardTitle>Training starten</CardTitle></CardHeader>
            <CardContent>
              <form action={startMistakeTrainingAction} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="categoryId">Kategorie</Label>
                  <Select id="categoryId" name="categoryId" defaultValue="">
                    <option value="">Alle Kategorien ({open.length})</option>
                    {[...byCategory.entries()].map(([id, c]) => (
                      <option key={id} value={id}>{c.name} ({c.count})</option>
                    ))}
                  </Select>
                </div>
                <SubmitButton variant="destructive" size="lg" className="w-full"><RotateCcw /> Fehler wiederholen</SubmitButton>
              </form>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Deine Fehlerliste</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y">
                {open.map((m) => (
                  <li key={m.id} className="py-3">
                    <Link href={`/fragen/${m.question.id}`} className="block rounded-lg hover:bg-muted/40">
                      <p className="text-sm font-medium text-foreground">{m.question.text}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{m.question.category.name}</span>
                        <DifficultyBadge difficulty={m.question.difficulty} />
                        <span className="font-semibold text-destructive">{m.wrongCount}× falsch</span>
                        <span>Fortschritt: {m.correctStreak}/{settings.mistakeRemovalThreshold} richtig in Folge</span>
                        <span>zuletzt {formatDate(m.lastWrongAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
