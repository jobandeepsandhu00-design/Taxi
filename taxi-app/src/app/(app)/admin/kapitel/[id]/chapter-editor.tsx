"use client";

import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Msg, QuestionForm, useRun, type Option } from "@/components/questions/question-form";
import { cn } from "@/lib/utils";
import { deleteChapterQuestionAction, moveQuestionAction, quickSaveQuestionAction, updateChapterAction } from "@/server/actions/admin-chapters";

type Q = { id: string; text: string; explanation: string; sourceDetail: string; published: boolean; archived: boolean; options: Option[] };
type Chapter = { id: string; no: number; name: string; shortDescription: string; isActive: boolean };

const field = "w-full rounded-xl border border-input bg-muted px-3 py-2 text-sm text-foreground";

function QuestionCard({ q, no, chapterId, first, last, autoOpen }: { q: Q; no: number; chapterId: string; first: boolean; last: boolean; autoOpen: boolean }) {
  const [edit, setEdit] = useState(autoOpen);
  const { pending, msg, run } = useRun();
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (autoOpen) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [autoOpen]);
  const correct = q.options.filter((o) => o.isCorrect);
  return (
    <li ref={ref} id={`q-${q.id}`} className={cn("glass rounded-2xl p-4", autoOpen && "ring-2 ring-primary")} data-testid={`q-card-${q.id}`}>
      {edit ? (
        <QuestionForm q={q} onSave={(v) => quickSaveQuestionAction({ id: q.id, categoryId: chapterId, ...v })} onDone={() => setEdit(false)} />
      ) : (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.07] text-xs font-extrabold text-navy">{no}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold whitespace-pre-line text-navy">{q.text}</p>
            <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-success">✓ {correct.map((o) => o.text).join(" · ")}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {q.options.length} Antworten · {q.archived ? "archiviert" : q.published ? "veröffentlicht" : "Entwurf"}
              {q.sourceDetail ? ` · ${q.sourceDetail}` : ""}
            </p>
            <Msg msg={msg} />
          </div>
          <div className="flex shrink-0 flex-col items-center sm:flex-row">
            <button type="button" aria-label="Nach oben" disabled={pending || first} onClick={() => run(() => moveQuestionAction(q.id, -1))} className="flex size-9 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button type="button" aria-label="Nach unten" disabled={pending || last} onClick={() => run(() => moveQuestionAction(q.id, 1))} className="flex size-9 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-30"><ArrowDown className="size-4" /></button>
            <button type="button" aria-label="Frage bearbeiten" onClick={() => setEdit(true)} className="flex size-9 items-center justify-center rounded-lg text-link hover:bg-accent" data-testid="q-edit"><Pencil className="size-4" /></button>
            <button type="button" aria-label="Frage löschen" disabled={pending} onClick={() => window.confirm("Diese Frage mit allen Antworten endgültig löschen?") && run(() => deleteChapterQuestionAction(q.id))} className="flex size-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10" data-testid="q-delete"><Trash2 className="size-4" /></button>
          </div>
        </div>
      )}
    </li>
  );
}

export function ChapterEditor({ chapter, questions, focusId }: { chapter: Chapter; questions: Q[]; focusId: string | null }) {
  const { pending, msg, run } = useRun();
  const [name, setName] = useState(chapter.name);
  const [desc, setDesc] = useState(chapter.shortDescription);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("");
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return questions.map((q, i) => ({ q, no: i + 1 })).filter(({ q }) => !f || q.text.toLowerCase().includes(f) || q.options.some((o) => o.text.toLowerCase().includes(f)));
  }, [questions, filter]);

  return (
    <div className="space-y-4">
      <form
        className="glass space-y-3 rounded-2xl p-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateChapterAction(chapter.id, { name, shortDescription: desc }));
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#111] font-display text-lg font-extrabold text-[#FFC400]">{chapter.no}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-muted px-3 font-display text-lg font-extrabold text-navy" aria-label="Kapitelname" data-testid="chapter-name" />
        </div>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className={cn(field, "h-10")} aria-label="Kurzbeschreibung" placeholder="Kurzbeschreibung" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground" data-testid="chapter-save">
            {pending && <Loader2 className="size-4 animate-spin" />} Kapitel speichern
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => updateChapterAction(chapter.id, { name, isActive: !chapter.isActive }))} className="min-h-10 rounded-xl border border-border px-3 text-sm font-semibold">
            {chapter.isActive ? "Kapitel ausblenden" : "Kapitel einblenden"}
          </button>
          <span className="text-xs text-muted-foreground">{questions.length} Fragen</span>
          <Msg msg={msg} />
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setAdding(true)} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#111] px-4 text-sm font-bold text-white dark:bg-white dark:text-[#111]" data-testid="add-question">
          <Plus className="size-4" /> Neue Frage
        </button>
        <label className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="In diesem Kapitel suchen …" className="h-11 w-full rounded-xl border border-input bg-muted pr-3 pl-9 text-sm text-foreground" aria-label="Fragen suchen" />
        </label>
      </div>

      {adding && (
        <div className="glass rounded-2xl p-4 ring-2 ring-primary" data-testid="new-question">
          <p className="mb-3 text-sm font-bold text-navy">Neue Frage (wird am Ende des Kapitels angefügt)</p>
          <QuestionForm onSave={(v) => quickSaveQuestionAction({ categoryId: chapter.id, ...v })} onDone={() => setAdding(false)} />
        </div>
      )}

      <ol className="space-y-2">
        {shown.map(({ q, no }) => (
          <QuestionCard key={q.id} q={q} no={no} chapterId={chapter.id} first={no === 1} last={no === questions.length} autoOpen={q.id === focusId} />
        ))}
      </ol>
      {questions.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Fragen – leg die erste mit „Neue Frage“ an.</p>}
    </div>
  );
}
