"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { createChapterAction, deleteChapterAction, moveChapterAction, updateChapterAction } from "@/server/actions/admin-chapters";

type Chapter = { id: string; no: number; name: string; shortDescription: string; isActive: boolean; total: number; published: number };

export function ChapterList({ chapters }: { chapters: Chapter[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (r.message ? { ok: true, text: r.message } : null) : { ok: false, text: r.error ?? "Fehler" });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <div className="space-y-4">
      <form
        className="glass flex flex-wrap items-end gap-2 rounded-2xl p-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createChapterAction({ name }), () => setName(""));
        }}
      >
        <label className="min-w-0 flex-1 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Neues Kapitel</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="z. B. Ortskunde Wien" className="h-11 w-full rounded-xl border border-input bg-muted px-3 text-sm text-foreground" data-testid="new-chapter-name" />
        </label>
        <button type="submit" disabled={pending} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground" data-testid="new-chapter-btn">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Kapitel anlegen
        </button>
        {msg && <p className={cn("w-full text-xs font-semibold", msg.ok ? "text-success" : "text-destructive")} role="status">{msg.text}</p>}
      </form>

      <ul className="space-y-2">
        {chapters.map((c, i) => (
          <li key={c.id} className={cn("glass flex items-center gap-3 rounded-2xl p-3", !c.isActive && "opacity-60")} data-testid={`chapter-row-${c.id}`}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#111] font-display text-base font-extrabold text-[#FFC400]">{c.no}</span>
            <Link href={`/admin/kapitel/${c.id}`} className="min-w-0 flex-1">
              <p className="truncate font-bold text-navy">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.total} Fragen · {c.published} veröffentlicht{c.isActive ? "" : " · ausgeblendet"}
              </p>
            </Link>
            <div className="flex shrink-0 items-center">
              <button type="button" aria-label="Nach oben" disabled={pending || i === 0} onClick={() => run(() => moveChapterAction(c.id, -1))} className="flex size-9 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button type="button" aria-label="Nach unten" disabled={pending || i === chapters.length - 1} onClick={() => run(() => moveChapterAction(c.id, 1))} className="flex size-9 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-30"><ArrowDown className="size-4" /></button>
              <button type="button" aria-label={c.isActive ? "Ausblenden" : "Einblenden"} disabled={pending} onClick={() => run(() => updateChapterAction(c.id, { name: c.name, isActive: !c.isActive }))} className="flex size-9 items-center justify-center rounded-lg hover:bg-accent">{c.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
              <button
                type="button"
                aria-label="Kapitel löschen"
                disabled={pending}
                onClick={() => {
                  const text = c.total ? `Kapitel „${c.name}“ mit allen ${c.total} Fragen endgültig löschen? Das kann nicht rückgängig gemacht werden.` : `Kapitel „${c.name}“ löschen?`;
                  if (window.confirm(text)) run(() => deleteChapterAction(c.id, true));
                }}
                className="flex size-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
              </button>
              <Link href={`/admin/kapitel/${c.id}`} aria-label="Fragen bearbeiten" className="flex size-9 items-center justify-center rounded-lg text-link hover:bg-accent"><ChevronRight className="size-5" /></Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
