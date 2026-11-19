"use client";

import { ExternalLink, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import type { SourceType } from "@prisma/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Select, Textarea } from "@/components/ui/input";
import { sourceTypeLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { deleteSourceAction, saveSourceAction } from "@/server/actions/admin";
import { useAction } from "../use-action";

interface Src {
  id: string;
  title: string;
  type: SourceType;
  reference: string;
  url: string;
  verified: boolean;
  verifiedAt: string | null;
  note: string;
  questionCount: number;
}

const empty: Src = { id: "", title: "", type: "LAW", reference: "", url: "", verified: false, verifiedAt: null, note: "", questionCount: 0 };

export function SourceManager({ sources }: { sources: Src[] }) {
  const [form, setForm] = useState<Src | null>(null);
  const { run, pending, error, message, fieldErrors } = useAction();
  const set = <K extends keyof Src>(k: K, v: Src[K]) => setForm((p) => (p ? { ...p, [k]: v } : p));

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {message && !error && <Alert variant="success">{message}</Alert>}
      {!form && (
        <div className="flex justify-end"><Button onClick={() => setForm(empty)}><Plus /> Neue Quelle</Button></div>
      )}
      {form && (
        <Card className="space-y-4 p-5">
          <p className="font-bold text-navy">{form.id ? "Quelle bearbeiten" : "Neue Quelle"}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Titel *</span><Input value={form.title} onChange={(e) => set("title", e.target.value)} /><FieldError messages={fieldErrors.title} /></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Typ</span><Select value={form.type} onChange={(e) => set("type", e.target.value as SourceType)}>{Object.entries(sourceTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Kurzbezeichnung / Fundstelle</span><Input value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="z. B. BGBl. Nr. 159/1960 i.d.g.F." /></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">URL</span><Input value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://www.ris.bka.gv.at/…" /><FieldError messages={fieldErrors.url} /></label>
          </div>
          <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Notiz (z. B. Stand, geprüft von)</span><Textarea rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="size-4 accent-emerald-600" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Inhalt und Aktualität dieser Quelle wurden geprüft (verifiziert)</label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setForm(null)}>Abbrechen</Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() => saveSourceAction(form.id || null, { title: form.title, type: form.type, reference: form.reference, url: form.url, verified: form.verified, note: form.note }), {
                  onSuccess: () => setForm(null),
                })
              }
            >
              Speichern
            </Button>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sources.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start gap-3">
              {s.verified ? <ShieldCheck className="mt-0.5 size-5 text-success" /> : <ShieldAlert className="mt-0.5 size-5 text-warning" />}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-navy">{s.title}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline">{sourceTypeLabel[s.type]}</Badge>
                  {s.verified ? <Badge variant="success">verifiziert {s.verifiedAt ? formatDate(s.verifiedAt) : ""}</Badge> : <Badge variant="warning">nicht verifiziert</Badge>}
                  <span>{s.questionCount} Fragen</span>
                </div>
                {s.reference && <p className="mt-1 text-xs text-muted-foreground">{s.reference}</p>}
                {s.note && <p className="mt-1 text-xs text-foreground/75">{s.note}</p>}
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-link hover:underline">
                    Quelle öffnen <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <Button size="icon" variant="ghost" aria-label="Bearbeiten" onClick={() => setForm(s)}><Pencil /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" aria-label="Löschen" disabled={pending} onClick={() => run(() => deleteSourceAction(s.id), { confirm: `Quelle „${s.title}“ löschen? Fragen verlieren den Quellenbezug.` })}><Trash2 /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
