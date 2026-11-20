import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, ExternalLink, Play, ShieldAlert, ShieldCheck } from "lucide-react";
import { categoryColor, categoryIcon } from "@/components/category-style";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { OriginBadge } from "@/components/origin-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { startLearnSessionAction, startLessonAction } from "@/server/actions/learning";
import { categoryLessons } from "@/server/lessons";
import { LessonPath } from "./lesson-path";
import { publishedWhere } from "@/server/questions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await prisma.category.findUnique({ where: { slug }, select: { name: true } });
  return { title: c?.name ?? "Kategorie" };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ leer?: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const { leer } = await searchParams;
  const category = await prisma.category.findFirst({
    where: { slug, isActive: true },
    include: { topics: { orderBy: { order: "asc" } } },
  });
  if (!category) notFound();

  const [questions, progress, correctIds] = await Promise.all([
    prisma.question.findMany({
      where: { ...publishedWhere, categoryId: category.id },
      select: { id: true, text: true, difficulty: true, origin: true, topicId: true, source: { select: { verified: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.userProgress.findUnique({ where: { userId_categoryId: { userId: user.id, categoryId: category.id } } }),
    prisma.userAnswer.findMany({
      where: { userId: user.id, isCorrect: true, question: { categoryId: category.id } },
      select: { questionId: true },
      distinct: ["questionId"],
    }),
  ]);
  const lessons = await categoryLessons(user.id, category.id);
  const mastered = new Set(correctIds.map((c) => c.questionId));
  const color = categoryColor(category.color);
  const Icon = categoryIcon(category.icon);
  const pct = questions.length ? Math.round((questions.filter((q) => mastered.has(q.id)).length / questions.length) * 100) : 0;
  const accuracy = progress?.answeredCount ? Math.round((progress.correctCount / progress.answeredCount) * 100) : null;
  const topicCounts = new Map<string, number>();
  for (const q of questions) if (q.topicId) topicCounts.set(q.topicId, (topicCounts.get(q.topicId) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <Link href="/lernen" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-navy">
        <ArrowLeft className="size-4" /> Alle Kategorien
      </Link>

      <section className={`relative overflow-hidden rounded-3xl panel-night p-6 text-white sm:p-8`}>
        <div className="absolute -top-16 -right-16 size-56 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon className="size-8" />
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{category.name}</h1>
            <p className="mt-1 text-white/85">{category.shortDescription}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
              <span className="rounded-full bg-white/20 px-3 py-1">{questions.length} Fragen</span>
              <span className="rounded-full bg-white/20 px-3 py-1">{pct}% gelernt</span>
              {accuracy !== null && <span className="rounded-full bg-white/20 px-3 py-1">{accuracy}% Trefferquote</span>}
            </div>
          </div>
        </div>
      </section>

      {leer && <Alert variant="warning">Für diese Auswahl sind keine Fragen verfügbar. Bitte Filter anpassen.</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpenCheck className="size-5 text-link" /> Einführung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[15px] leading-relaxed text-foreground/85">
              {category.introduction.split(/\n{2,}/).map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
              <div className="rounded-xl border bg-muted/50 p-3 text-sm">
                {category.syllabusVerified ? (
                  <p className="flex items-start gap-2 text-success"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> Inhalt mit offiziellem Prüfungsstoff abgeglichen.</p>
                ) : (
                  <p className="flex items-start gap-2 text-warning">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                    Prüfungsstoff dieser Kategorie ist noch nicht mit den aktuellen offiziellen Vorgaben verifiziert. Bitte zusätzlich die offiziellen Unterlagen der Prüfungsstelle verwenden.
                  </p>
                )}
                {category.syllabusReference && <p className="mt-2 text-muted-foreground">Bezug: {category.syllabusReference}</p>}
              </div>
            </CardContent>
          </Card>

          {category.topics.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Themen</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {category.topics.map((t) => (
                  <div key={t.id} className={`rounded-xl ${color.soft} p-3`}>
                    <p className={`text-sm font-bold ${color.text}`}>{t.name}</p>
                    {t.description && <p className="mt-0.5 text-xs text-foreground/75">{t.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{topicCounts.get(t.id) ?? 0} Fragen</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Lektionen</CardTitle>
              <p className="text-sm text-muted-foreground">Je 5 Fragen, ca. 3 Minuten. Gemeistert = alle 5 richtig.</p>
            </CardHeader>
            <CardContent>
              <LessonPath categoryId={category.id} lessons={lessons.map((l) => ({ index: l.index, status: l.status, best: l.best, size: l.questionIds.length }))} />
              <form action={startLessonAction} className="mt-4">
                <input type="hidden" name="categoryId" value={category.id} />
                <SubmitButton variant="outline" className="w-full">⚡ Gemischte 3-Minuten-Lektion aus dieser Kategorie</SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Übungsfragen</CardTitle>
              <p className="text-sm text-muted-foreground">Einzelne Fragen gezielt üben – die Lösung wird erst nach deiner Antwort angezeigt.</p>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {questions.map((q, i) => (
                  <li key={q.id}>
                    <Link href={`/fragen/${q.id}`} className="flex items-start gap-3 py-3 hover:bg-muted/40">
                      <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${mastered.has(q.id) ? "bg-success/15 text-success" : "bg-foreground/8 text-foreground/75"}`}>
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm text-foreground/85">{q.text}</span>
                      <span className="hidden shrink-0 gap-1 sm:flex">
                        <DifficultyBadge difficulty={q.difficulty} />
                        <OriginBadge origin={q.origin} verifiedSource={q.source?.verified} />
                      </span>
                      <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader><CardTitle>Lernmodus starten</CardTitle></CardHeader>
            <CardContent>
              <form action={startLearnSessionAction} className="space-y-4">
                <input type="hidden" name="categoryId" value={category.id} />
                {category.topics.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="topicId">Thema</Label>
                    <Select id="topicId" name="topicId" defaultValue="">
                      <option value="">Alle Themen</option>
                      {category.topics.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="difficulty">Schwierigkeit</Label>
                  <Select id="difficulty" name="difficulty" defaultValue="ALL">
                    <option value="ALL">Alle</option>
                    <option value="EASY">Leicht</option>
                    <option value="MEDIUM">Mittel</option>
                    <option value="HARD">Schwer</option>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground/85">
                  <input type="checkbox" name="onlyNew" className="size-4 accent-blue-700" /> Nur noch nicht gelernte Fragen
                </label>
                <SubmitButton className="w-full" size="lg" disabled={questions.length === 0}>
                  <Play /> Lernen starten
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-bold text-navy">Dein Fortschritt</p>
            <Progress value={pct} className="mt-2" barClassName={`bg-gradient-to-r ${color.gradient}`} />
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><dt className="text-[11px] text-muted-foreground">Beantwortet</dt><dd className="font-extrabold text-navy">{progress?.answeredCount ?? 0}</dd></div>
              <div><dt className="text-[11px] text-muted-foreground">Richtig</dt><dd className="font-extrabold text-success">{progress?.correctCount ?? 0}</dd></div>
              <div><dt className="text-[11px] text-muted-foreground">Falsch</dt><dd className="font-extrabold text-destructive">{progress?.incorrectCount ?? 0}</dd></div>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
