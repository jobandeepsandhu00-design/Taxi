"use client";

import Link from "next/link";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ContentOrigin, Difficulty, QuestionStatus } from "@prisma/client";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { OriginBadge } from "@/components/origin-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { bulkSetStatusAction, deleteQuestionAction, setQuestionStatusAction } from "@/server/actions/admin";
import { useAction } from "../use-action";

interface Row {
  id: string;
  text: string;
  status: QuestionStatus;
  origin: ContentOrigin;
  difficulty: Difficulty;
  multipleCorrect: boolean;
  updatedAt: string;
  category: { name: string };
  answers: number;
  sourceVerified: boolean;
}

export function QuestionTable({ questions }: { questions: Row[] }) {
  const { run, pending, error, message } = useAction();
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = questions.length > 0 && selected.length === questions.length;

  return (
    <div className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      {message && !error && <Alert variant="success">{message}</Alert>}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
          <strong className="text-navy">{selected.length} ausgewählt</strong>
          <Button size="sm" variant="success" disabled={pending} onClick={() => run(() => bulkSetStatusAction(selected, "PUBLISHED").then((r) => (r.ok ? { ...r, message: `${r.data.count} veröffentlicht.` } : r)), { onSuccess: () => setSelected([]) })}>Veröffentlichen</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => bulkSetStatusAction(selected, "DRAFT").then((r) => (r.ok ? { ...r, message: `${r.data.count} auf Entwurf gesetzt.` } : r)), { onSuccess: () => setSelected([]) })}>Zurückziehen</Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => bulkSetStatusAction(selected, "ARCHIVED").then((r) => (r.ok ? { ...r, message: `${r.data.count} archiviert.` } : r)), { onSuccess: () => setSelected([]) })}>Archivieren</Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl glass">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/60 text-left text-xs font-bold text-muted-foreground uppercase">
            <tr>
              <th className="w-10 p-3">
                <input type="checkbox" aria-label="Alle auswählen" checked={allSelected} onChange={() => setSelected(allSelected ? [] : questions.map((q) => q.id))} className="size-4 accent-blue-700" />
              </th>
              <th className="p-3">Frage</th>
              <th className="p-3">Kategorie</th>
              <th className="p-3">Status</th>
              <th className="p-3">Herkunft</th>
              <th className="p-3">Geändert</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {questions.map((q) => (
              <tr key={q.id} className="align-top hover:bg-muted/30">
                <td className="p-3">
                  <input type="checkbox" aria-label="Auswählen" checked={selected.includes(q.id)} onChange={() => setSelected((s) => (s.includes(q.id) ? s.filter((x) => x !== q.id) : [...s, q.id]))} className="size-4 accent-blue-700" />
                </td>
                <td className="max-w-md p-3">
                  <Link href={`/admin/fragen/${q.id}`} className="line-clamp-2 font-medium text-foreground hover:text-link">{q.text}</Link>
                  <div className="mt-1 flex gap-1.5">
                    <DifficultyBadge difficulty={q.difficulty} />
                    {q.multipleCorrect && <Badge variant="outline">Mehrfach</Badge>}
                    <span className="text-xs text-muted-foreground">{q.answers} Antworten</span>
                  </div>
                </td>
                <td className="p-3 text-foreground/75">{q.category.name}</td>
                <td className="p-3">
                  <Badge variant={q.status === "PUBLISHED" ? "success" : q.status === "DRAFT" ? "muted" : "outline"}>{statusLabel[q.status]}</Badge>
                </td>
                <td className="p-3"><OriginBadge origin={q.origin} verifiedSource={q.sourceVerified} /></td>
                <td className="p-3 text-xs whitespace-nowrap text-muted-foreground">{formatDate(q.updatedAt)}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    {q.status === "PUBLISHED" ? (
                      <Button size="icon" variant="ghost" title="Zurückziehen (Entwurf)" aria-label="Veröffentlichung zurückziehen" disabled={pending} onClick={() => run(() => setQuestionStatusAction(q.id, "DRAFT"))}>
                        <EyeOff />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" title="Veröffentlichen" aria-label="Veröffentlichen" disabled={pending} onClick={() => run(() => setQuestionStatusAction(q.id, "PUBLISHED"))}>
                        <Eye />
                      </Button>
                    )}
                    <Button asChild size="icon" variant="ghost" title="Bearbeiten">
                      <Link href={`/admin/fragen/${q.id}`} aria-label="Bearbeiten"><Pencil /></Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      title="Löschen"
                      aria-label="Löschen"
                      disabled={pending}
                      onClick={() => run(() => deleteQuestionAction(q.id), { confirm: `Frage wirklich löschen?${q.answers ? ` Dabei werden ${q.answers} gespeicherte Antworten entfernt. Tipp: Archivieren erhält die Statistik.` : ""}` })}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {questions.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Keine Fragen gefunden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
