"use client";

import { CheckCircle2, Pencil, Plus, ShieldAlert, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ContentOrigin } from "@prisma/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Textarea } from "@/components/ui/input";
import { originShort } from "@/lib/labels";
import { deleteExamConfigAction, saveExamConfigAction } from "@/server/actions/admin";
import { useAction } from "../use-action";

interface Cfg {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  questionCount: number;
  passPercentage: number;
  isActive: boolean;
  isDefault: boolean;
  verified: boolean;
  officialReference: string;
  allowedOrigins: ContentOrigin[];
  categoryDistribution: Record<string, number>;
  attempts: number;
}

const empty: Cfg = {
  id: "",
  name: "",
  description: "",
  durationMinutes: 60,
  questionCount: 40,
  passPercentage: 70,
  isActive: true,
  isDefault: false,
  verified: false,
  officialReference: "",
  allowedOrigins: [],
  categoryDistribution: {},
  attempts: 0,
};

export function ExamConfigManager({ configs, categories }: { configs: Cfg[]; categories: { id: string; name: string; available: number }[] }) {
  const [form, setForm] = useState<Cfg | null>(null);
  const { run, pending, error, message, fieldErrors } = useAction();
  const set = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setForm((p) => (p ? { ...p, [k]: v } : p));
  const distSum = form ? Object.values(form.categoryDistribution).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Unbekannt";

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {message && !error && <Alert variant="success">{message}</Alert>}
      {!form && <div className="flex justify-end"><Button onClick={() => setForm(empty)}><Plus /> Neue Konfiguration</Button></div>}

      {form && (
        <Card className="space-y-4 p-5">
          <p className="font-bold text-navy">{form.id ? "Konfiguration bearbeiten" : "Neue Konfiguration"}</p>
          <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Name *</span><Input value={form.name} onChange={(e) => set("name", e.target.value)} /><FieldError messages={fieldErrors.name} /></label>
          <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Beschreibung</span><Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Dauer (Minuten) *</span><Input type="number" min={1} value={form.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} /><FieldError messages={fieldErrors.durationMinutes} /></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Anzahl Fragen *</span><Input type="number" min={1} value={form.questionCount} onChange={(e) => set("questionCount", Number(e.target.value))} /><FieldError messages={fieldErrors.questionCount} /></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Bestehensgrenze (%) *</span><Input type="number" min={1} max={100} value={form.passPercentage} onChange={(e) => set("passPercentage", Number(e.target.value))} /><FieldError messages={fieldErrors.passPercentage} /></label>
          </div>
          <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Offizielle Grundlage (Prüfungsordnung, Stand)</span><Textarea rows={2} value={form.officialReference} onChange={(e) => set("officialReference", e.target.value)} /></label>
          <fieldset>
            <legend className="text-sm font-semibold text-navy">Erlaubte Fragenherkunft <span className="font-normal text-muted-foreground">(keine Auswahl = alle veröffentlichten)</span></legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {(["OFFICIAL", "PRACTICE", "DEMO"] as const).map((o) => (
                <label key={o} className="flex items-center gap-2">
                  <input type="checkbox" className="size-4 accent-blue-700" checked={form.allowedOrigins.includes(o)} onChange={(e) => set("allowedOrigins", e.target.checked ? [...form.allowedOrigins, o] : form.allowedOrigins.filter((x) => x !== o))} />
                  {originShort[o]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold text-navy">Feste Anzahl Fragen je Kategorie <span className="font-normal text-muted-foreground">(optional – Rest wird zufällig aufgefüllt; Summe {distSum}/{form.questionCount})</span></legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 grid-cols-1">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-xl border p-2 text-sm">
                  <span className="flex-1 truncate">{c.name} <span className="text-xs text-muted-foreground">({c.available} verfügbar)</span></span>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-20"
                    value={form.categoryDistribution[c.id] ?? 0}
                    onChange={(e) => set("categoryDistribution", { ...form.categoryDistribution, [c.id]: Number(e.target.value) })}
                    aria-label={`Fragen aus ${c.name}`}
                  />
                </label>
              ))}
            </div>
            {distSum > form.questionCount && <p className="mt-1 text-xs text-destructive">Die Summe übersteigt die Gesamtzahl der Fragen.</p>}
          </fieldset>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-blue-700" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Aktiv</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-blue-700" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} /> Standard-Prüfung</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-emerald-600" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Mit offizieller Prüfungsordnung abgeglichen (verifiziert)</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setForm(null)}>Abbrechen</Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    saveExamConfigAction(form.id || null, {
                      name: form.name,
                      description: form.description,
                      durationMinutes: form.durationMinutes,
                      questionCount: form.questionCount,
                      passPercentage: form.passPercentage,
                      isActive: form.isActive,
                      isDefault: form.isDefault,
                      verified: form.verified,
                      officialReference: form.officialReference,
                      allowedOrigins: form.allowedOrigins,
                      categoryDistribution: form.categoryDistribution,
                    }),
                  { onSuccess: () => setForm(null) },
                )
              }
            >
              Speichern
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {configs.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="flex items-center gap-1.5 font-bold text-navy">{c.isDefault && <Star className="size-4 fill-primary text-warning" />}{c.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.verified ? <Badge variant="success"><CheckCircle2 className="size-3" /> verifiziert</Badge> : <Badge variant="warning"><ShieldAlert className="size-3" /> Übungsvorgabe</Badge>}
                  {!c.isActive && <Badge variant="muted">inaktiv</Badge>}
                  <Badge variant="outline">{c.attempts} Versuche</Badge>
                </div>
              </div>
              <Button size="icon" variant="ghost" aria-label="Bearbeiten" onClick={() => setForm(c)}><Pencil /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" aria-label="Löschen" disabled={pending} onClick={() => run(() => deleteExamConfigAction(c.id), { confirm: `Konfiguration „${c.name}“ löschen?` })}><Trash2 /></Button>
            </div>
            <p className="mt-3 text-sm text-foreground/85">{c.durationMinutes} Min. · {c.questionCount} Fragen · Bestehen ab {c.passPercentage} %</p>
            {Object.keys(c.categoryDistribution).length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Verteilung: {Object.entries(c.categoryDistribution).map(([id, n]) => `${catName(id)} ${n}`).join(", ")}</p>
            )}
            {c.officialReference && <p className="mt-1 text-xs text-muted-foreground">Grundlage: {c.officialReference}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
