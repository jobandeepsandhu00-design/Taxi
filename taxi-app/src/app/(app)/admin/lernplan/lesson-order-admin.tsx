"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Shuffle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { redistributeLessonsAction, setQuestionLessonAction } from "@/server/actions/admin-learn-plan";
import { useAction } from "../use-action";

type Q = { id: string; text: string; lessonIndex: number; difficulty: string; published: boolean };

const diff: Record<string, string> = { EASY: "leicht", MEDIUM: "mittel", HARD: "schwer" };

export function LessonOrderAdmin({ categories, current, questions }: { categories: { id: string; name: string; slug: string }[]; current: { id: string; slug: string; name: string } | null; questions: Q[] }) {
  const { run, pending, error, message } = useAction();
  const lessons = Array.from(new Set(questions.map((q) => q.lessonIndex))).sort((a, b) => a - b);
  const maxLesson = Math.max(1, ...lessons);
  return (
    <div className="space-y-4">
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {categories.map((c) => (
          <Link key={c.id} href={`/admin/lernplan?kategorie=${c.slug}`} className={cn("min-h-9 shrink-0 rounded-full px-3 py-2 text-xs font-semibold", current?.id === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80")}>
            {c.name}
          </Link>
        ))}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {current && (
        <Button variant="outline" disabled={pending} onClick={() => run(() => redistributeLessonsAction(current.id), { confirm: `Alle Fragen in „${current.name}“ automatisch neu auf Lektionen verteilen?` })}>
          <Shuffle /> Automatisch neu verteilen
        </Button>
      )}
      {lessons.map((li) => {
        const qs = questions.filter((q) => q.lessonIndex === li);
        const published = qs.filter((q) => q.published).length;
        return (
          <Card key={li}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Lektion {li}
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", published === 5 ? "bg-success/12 text-success" : "bg-warning/12 text-warning")}>{published} veröffentlicht</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {qs.map((q) => (
                  <li key={q.id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2">{q.text}</span>
                      <span className="text-xs text-muted-foreground">
                        {diff[q.difficulty] ?? q.difficulty}
                        {!q.published && " · nicht veröffentlicht"}
                      </span>
                    </span>
                    <Button size="icon" variant="ghost" disabled={pending || li <= 1} aria-label="In vorige Lektion" onClick={() => run(() => setQuestionLessonAction(q.id, li - 1))}>
                      <ArrowUp />
                    </Button>
                    <Button size="icon" variant="ghost" disabled={pending} aria-label="In nächste Lektion" onClick={() => run(() => setQuestionLessonAction(q.id, Math.min(maxLesson + 1, li + 1)))}>
                      <ArrowDown />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
