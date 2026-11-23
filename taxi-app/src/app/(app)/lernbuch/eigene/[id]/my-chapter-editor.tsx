"use client";

import { useRouter } from "next/navigation";
import { EyeOff, Loader2, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Msg, QuestionForm, useRun, type Option } from "@/components/questions/question-form";
import { cn } from "@/lib/utils";
import { deleteMyChapterAction, deleteMyOwnQuestionAction, hideMyQuestionAction, renameMyChapterAction, restoreMyQuestionAction, saveMyQuestionAction } from "@/server/actions/my-questions";

export type MyItem = { key: string; kind: "base" | "own"; baseId?: string; ownId?: string; text: string; options: Option[]; explanation: string; changed: boolean; hidden: boolean };
type Chapter = { kind: "catalog" | "own"; id: string; name: string };

function ItemCard({ item, no, chapter, autoOpen }: { item: MyItem; no: number; chapter: Chapter; autoOpen: boolean }) {
  const [edit, setEdit] = useState(autoOpen);
  const { pending, msg, run } = useRun();
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (autoOpen) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [autoOpen]);
  const correct = item.options.filter((o) => o.isCorrect);
  const save = (v: { text: string; options: Option[]; explanation: string }) =>
    saveMyQuestionAction({
      ...(item.kind === "base" ? { baseQuestionId: item.baseId } : { ownId: item.ownId }),
      text: v.text,
      explanation: v.explanation,
      options: v.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
    });

  return (
    <li ref={ref} className={cn("glass rounded-2xl p-4", autoOpen && "ring-2 ring-primary", item.hidden && "opacity-60")} data-testid={`my-card-${item.key}`}>
      {edit ? (
        <QuestionForm q={{ text: item.text, options: item.options, explanation: item.explanation, sourceDetail: "", published: true }} onSave={save} onDone={() => setEdit(false)} showMeta={false} minOptions={1} />
      ) : (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.07] text-xs font-extrabold text-navy">{no}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              {item.kind === "own" && <span className="rounded-full bg-[#FFC400]/25 px-2 py-0.5 text-[10px] font-extrabold text-[#8a6300] dark:text-[#FFC400]">EIGENE FRAGE</span>}
              {item.changed && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-link">VON DIR GEÄNDERT</span>}
              {item.hidden && <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-extrabold text-muted-foreground">AUSGEBLENDET</span>}
            </div>
            <p className="mt-1 text-sm font-bold whitespace-pre-line text-navy">{item.text}</p>
            <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-success">✓ {correct.map((o) => o.text).join(" · ")}</p>
            <Msg msg={msg} />
          </div>
          <div className="flex shrink-0 flex-col items-center sm:flex-row">
            {item.hidden ? (
              <button type="button" aria-label="Wieder einblenden" disabled={pending} onClick={() => run(() => restoreMyQuestionAction(item.baseId!))} className="flex size-9 items-center justify-center rounded-lg text-link hover:bg-accent" data-testid="my-q-restore">
                <RotateCcw className="size-4" />
              </button>
            ) : (
              <>
                <button type="button" aria-label="Frage bearbeiten" onClick={() => setEdit(true)} className="flex size-9 items-center justify-center rounded-lg text-link hover:bg-accent" data-testid="my-q-edit">
                  <Pencil className="size-4" />
                </button>
                {item.changed && (
                  <button type="button" aria-label="Original wiederherstellen" disabled={pending} onClick={() => run(() => restoreMyQuestionAction(item.baseId!))} className="flex size-9 items-center justify-center rounded-lg hover:bg-accent" data-testid="my-q-reset">
                    <RotateCcw className="size-4" />
                  </button>
                )}
                {item.kind === "base" ? (
                  <button type="button" aria-label="Für mich ausblenden" disabled={pending} onClick={() => run(() => hideMyQuestionAction(item.baseId!))} className="flex size-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10" data-testid="my-q-hide">
                    <EyeOff className="size-4" />
                  </button>
                ) : (
                  <button type="button" aria-label="Frage löschen" disabled={pending} onClick={() => window.confirm("Eigene Frage löschen?") && run(() => deleteMyOwnQuestionAction(item.ownId!))} className="flex size-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10" data-testid="my-q-delete">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {chapter.kind === "catalog" && item.kind === "base" && edit && <p className="mt-2 text-[11px] text-muted-foreground">Deine Fassung ersetzt die Originalfrage nur für dich. Das Original bleibt erhalten und kann jederzeit wiederhergestellt werden.</p>}
    </li>
  );
}

export function MyChapterEditor({ chapter, items, focusId }: { chapter: Chapter; items: MyItem[]; focusId: string | null }) {
  const router = useRouter();
  const { pending, msg, run } = useRun();
  const [name, setName] = useState(chapter.name);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const visible = items.filter((i) => !i.hidden);
  const hidden = items.filter((i) => i.hidden);
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return visible.map((item, i) => ({ item, no: i + 1 })).filter(({ item }) => !f || item.text.toLowerCase().includes(f) || item.options.some((o) => o.text.toLowerCase().includes(f)));
  }, [visible, filter]);

  return (
    <div className="space-y-4">
      <div className="glass space-y-3 rounded-2xl p-4">
        {chapter.kind === "own" ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => renameMyChapterAction(chapter.id, name));
            }}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#111] text-lg text-[#FFC400]">★</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-muted px-3 font-display text-lg font-extrabold text-navy" aria-label="Kapitelname" data-testid="my-chapter-name" />
            <button type="submit" disabled={pending} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
              {pending && <Loader2 className="size-4 animate-spin" />} Speichern
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => window.confirm(`Kapitel „${chapter.name}“ mit allen eigenen Fragen löschen?`) && run(() => deleteMyChapterAction(chapter.id), () => router.push("/lernbuch/eigene"))}
              className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
              data-testid="my-chapter-delete"
            >
              <Trash2 className="size-4" /> Kapitel löschen
            </button>
          </form>
        ) : (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Kapitel des Lernbuchs</p>
            <h1 className="font-display text-xl font-extrabold text-navy">{chapter.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">Änderungen gelten nur für dich – im Lernbuch und in deinen Kapitel-Stories.</p>
          </div>
        )}
        <Msg msg={msg} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setAdding(true)} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#111] px-4 text-sm font-bold text-white dark:bg-white dark:text-[#111]" data-testid="my-add-question">
          <Plus className="size-4" /> Eigene Frage
        </button>
        <label className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Suchen …" className="h-11 w-full rounded-xl border border-input bg-muted pr-3 pl-9 text-sm text-foreground" aria-label="Fragen suchen" />
        </label>
      </div>

      {adding && (
        <div className="glass rounded-2xl p-4 ring-2 ring-primary" data-testid="my-new-question">
          <p className="mb-3 text-sm font-bold text-navy">Neue eigene Frage (am Ende des Kapitels)</p>
          <QuestionForm
            showMeta={false}
            minOptions={1}
            onSave={(v) =>
              saveMyQuestionAction({
                ...(chapter.kind === "own" ? { userChapterId: chapter.id } : { categoryId: chapter.id }),
                text: v.text,
                explanation: v.explanation,
                options: v.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
              })
            }
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      <ol className="space-y-2">
        {shown.map(({ item, no }) => (
          <ItemCard key={item.key} item={item} no={no} chapter={chapter} autoOpen={item.key === focusId || item.baseId === focusId || `uq:${item.ownId}` === focusId} />
        ))}
      </ol>
      {visible.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Fragen – leg deine erste mit „Eigene Frage“ an.</p>}

      {hidden.length > 0 && (
        <section className="space-y-2">
          <button type="button" onClick={() => setShowHidden((s) => !s)} className="text-sm font-bold text-link" data-testid="my-hidden-toggle">
            {showHidden ? "Ausgeblendete verbergen" : `Ausgeblendete Fragen anzeigen (${hidden.length})`}
          </button>
          {showHidden && (
            <ol className="space-y-2">
              {hidden.map((item, i) => (
                <ItemCard key={item.key} item={item} no={i + 1} chapter={chapter} autoOpen={false} />
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
