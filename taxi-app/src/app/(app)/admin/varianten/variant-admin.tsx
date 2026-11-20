"use client";

import Link from "next/link";
import { Check, Loader2, Play, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { deleteVariantAction, generateVariantBatchAction, setVariantVerifiedAction } from "@/server/actions/admin-variants";
import { useAction } from "../use-action";

type Row = { kind: string; lang: string; label: string; done: number; total: number };

/** „Alle Varianten generieren“ je Art/Sprache – läuft in kleinen Stapeln, mit Fortschritt. */
export function BatchRunner({ rows }: { rows: Row[] }) {
  const [running, setRunning] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  async function run(r: Row) {
    const key = `${r.kind}:${r.lang}`;
    setRunning(key);
    setError(null);
    for (let i = 0; i < 200; i++) {
      const res = await generateVariantBatchAction(r.kind, r.lang).catch(() => null);
      if (!res || !res.ok) {
        setError(res && !res.ok ? res.error : "Unterbrochen.");
        break;
      }
      setProgress((p) => ({ ...p, [key]: r.total - res.data.remaining }));
      if (res.data.remaining === 0) break;
    }
    setRunning(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alle Varianten generieren</CardTitle>
        <p className="text-sm text-muted-foreground">Erzeugt fehlende Varianten für alle veröffentlichten Fragen (zählt nicht zum Nutzer-Tageslimit). Neue Varianten sind „ungeprüft“.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {error && <Alert variant="error">{error}</Alert>}
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const key = `${r.kind}:${r.lang}`;
            const done = Math.max(r.done, progress[key] ?? 0);
            const pct = r.total ? Math.round((done / r.total) * 100) : 0;
            return (
              <li key={key} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-navy">{r.label}</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </span>
                </span>
                <span className="w-16 text-right text-xs text-muted-foreground tabular">
                  {done}/{r.total}
                </span>
                <Button size="sm" variant="outline" disabled={Boolean(running) || done >= r.total} onClick={() => void run(r)} aria-label={`${r.label} generieren`}>
                  {running === key ? <Loader2 className="animate-spin" /> : <Play />} {done >= r.total ? "Fertig" : "Starten"}
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

type Item = { id: string; kind: string; lang: string; verified: boolean; model: string; flags: number; createdAt: string; questionId: string; questionText: string; content: Record<string, unknown> };

function ContentView({ kind, content }: { kind: string; content: Record<string, unknown> }) {
  if (kind === "simple" || kind === "translation") {
    const c = content as { text?: string; question?: string; options?: { label: string; text: string }[]; explanation?: string };
    return (
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{c.text ?? c.question}</p>
        <ul className="space-y-0.5">
          {(c.options ?? []).map((o) => (
            <li key={o.label}>
              <strong>{o.label})</strong> {o.text}
            </li>
          ))}
        </ul>
        {c.explanation && <p className="text-muted-foreground">{c.explanation}</p>}
      </div>
    );
  }
  if (kind === "glossary") {
    const c = content as { terms?: { term: string; definition: string }[] };
    return (
      <ul className="space-y-0.5 text-sm">
        {(c.terms ?? []).map((t) => (
          <li key={t.term}>
            <strong>{t.term}:</strong> {t.definition}
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm whitespace-pre-line">{String((content as { text?: string }).text ?? "")}</p>;
}

const filters = [
  { key: "gemeldet", label: "Gemeldet (👎)" },
  { key: "ungeprueft", label: "Ungeprüft" },
  { key: "geprueft", label: "Geprüft" },
  { key: "alle", label: "Alle" },
];

/** Prüf-Warteschlange: gemeldete und ungeprüfte Varianten freigeben oder löschen (wird dann neu erzeugt). */
export function VariantReviewList({ items, filter, flaggedCount }: { items: Item[]; filter: string; flaggedCount: number }) {
  const { run, pending, error, message } = useAction();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prüfen</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <Link key={f.key} href={`/admin/varianten?filter=${f.key}`} className={cn("min-h-9 rounded-full px-3 py-1.5 text-xs font-semibold", filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80")}>
              {f.label}
              {f.key === "gemeldet" && flaggedCount > 0 ? ` · ${flaggedCount}` : ""}
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <Alert variant="error">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nichts zu prüfen.</p>}
        {items.map((v) => (
          <div key={v.id} className="rounded-2xl border border-border p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-muted px-2 py-0.5 font-bold">{v.kind}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-bold uppercase">{v.lang}</span>
              {v.verified ? <span className="rounded-full bg-success/12 px-2 py-0.5 font-bold text-success">geprüft</span> : <span className="rounded-full bg-warning/12 px-2 py-0.5 font-bold text-warning">ungeprüft</span>}
              {v.flags > 0 && <span className="rounded-full bg-destructive/12 px-2 py-0.5 font-bold text-destructive">👎 {v.flags}</span>}
              <span className="text-muted-foreground">{v.model}</span>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Original:{" "}
              <Link href={`/admin/fragen/${v.questionId}`} className="text-link hover:underline">
                {v.questionText.slice(0, 140)}
              </Link>
            </p>
            <ContentView kind={v.kind} content={v.content} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant={v.verified ? "outline" : "success"} disabled={pending} onClick={() => run(() => setVariantVerifiedAction(v.id, !v.verified))}>
                {v.verified ? <Undo2 /> : <Check />} {v.verified ? "Prüfung zurücknehmen" : "Als geprüft markieren"}
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteVariantAction(v.id), { confirm: "Variante löschen? Sie wird bei der nächsten Anfrage neu erzeugt." })}>
                <Trash2 /> Löschen
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
