"use client";

import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { createMyChapterAction } from "@/server/actions/my-questions";

export function NewChapterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        // ohne useTransition (Seitenwechsel direkt danach)
        void (async () => {
          setPending(true);
          const r = await createMyChapterAction(name).finally(() => setPending(false));
          if (!r.ok) return setErr(r.error);
          setErr(null);
          setName("");
          router.push(`/lernbuch/eigene/u-${r.data.id}`);
        })();
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} placeholder="Neues Kapitel, z. B. Meine Notizen" aria-label="Name des neuen Kapitels" className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-muted px-3 text-sm text-foreground" data-testid="my-new-chapter" />
      <button type="submit" disabled={pending} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground" data-testid="my-new-chapter-btn">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Anlegen
      </button>
      {err && <p className="text-xs font-semibold text-destructive">{err}</p>}
    </form>
  );
}
