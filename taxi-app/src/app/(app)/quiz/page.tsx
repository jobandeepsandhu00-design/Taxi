import type { Metadata } from "next";
import { Shuffle, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { startPracticeQuizAction } from "@/server/actions/learning";
import { getCategoryOverview } from "@/server/stats";

export const metadata: Metadata = { title: "Übungsquiz" };

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ leer?: string }> }) {
  const user = await requireUser();
  const { leer } = await searchParams;
  const [categories, settings, history] = await Promise.all([
    getCategoryOverview(user.id),
    getSettings(),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, mode: "PRACTICE", status: "COMPLETED" },
      orderBy: { finishedAt: "desc" },
      take: 8,
    }),
  ]);
  const total = categories.reduce((s, c) => s + c.questionCount, 0);
  const sizes = Array.from(new Set([10, 20, 30, 50, settings.defaultQuizSize])).sort((a, b) => a - b);

  return (
    <div>
      <PageHeader eyebrow="Übungsquiz" title="Zufällige Fragen üben" description="Gemischte Fragen aus allen oder ausgewählten Kategorien – mit sofortigem Feedback und Endergebnis." />
      {leer && <Alert variant="warning" className="mb-4">Für diese Auswahl gibt es keine Fragen. Bitte andere Kategorien oder Schwierigkeit wählen.</Alert>}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shuffle className="size-5 text-link" /> Quiz konfigurieren</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={startPracticeQuizAction} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="count">Anzahl Fragen</Label>
                  <Select id="count" name="count" defaultValue={String(settings.defaultQuizSize)}>
                    {sizes.map((s) => (
                      <option key={s} value={s}>{s} Fragen</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="difficulty">Schwierigkeit</Label>
                  <Select id="difficulty" name="difficulty" defaultValue="ALL">
                    <option value="ALL">Alle Schwierigkeitsgrade</option>
                    <option value="EASY">Leicht</option>
                    <option value="MEDIUM">Mittel</option>
                    <option value="HARD">Schwer</option>
                  </Select>
                </div>
              </div>
              <fieldset>
                <legend className="text-sm font-semibold text-navy">Kategorien <span className="font-normal text-muted-foreground">(keine Auswahl = alle, {total} Fragen)</span></legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 grid-cols-1">
                  {categories.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                      <input type="checkbox" name="categoryIds" value={c.id} className="size-4 accent-blue-700" />
                      <span className="flex-1 font-medium text-foreground/85">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.questionCount}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <SubmitButton size="lg" className="w-full sm:w-auto"><Sparkles /> Quiz starten</SubmitButton>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Letzte Quiz-Ergebnisse</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine abgeschlossenen Quizze.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => {
                  const pct = h.answeredCount ? Math.round((h.correctCount / h.answeredCount) * 100) : 0;
                  return (
                    <li key={h.id}>
                      <a href={`/sitzung/${h.id}`} className="flex items-center justify-between rounded-xl border p-3 text-sm hover:bg-muted/50">
                        <span>
                          <span className="block font-semibold text-navy">{h.correctCount}/{h.answeredCount} richtig</span>
                          <span className="text-xs text-muted-foreground">{h.finishedAt ? formatDate(h.finishedAt, true) : ""}</span>
                        </span>
                        <span className={`font-extrabold ${pct >= 70 ? "text-success" : "text-destructive"}`}>{pct}%</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
