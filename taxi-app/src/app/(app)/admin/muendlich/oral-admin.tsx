"use client";

import { Check, Pencil, Sparkles, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { KeyPoint } from "@/lib/oral";
import { deleteOralQuestionAction, saveOralQuestionAction, setOralVerifiedAction, suggestOralAnswerAction } from "@/server/actions/admin-oral";
import { useAction } from "../use-action";

type Q = { id: string; categoryId: string; category: string; questionDe: string; modelAnswerDe: string; keyPoints: KeyPoint[]; legalReference: string | null; difficulty: string; examMode: string; followUpQuestion: string; followUpPoint: number; verified: boolean; attempts: number };

const empty = { id: "", categoryId: "", questionDe: "", modelAnswerDe: "", keyPoints: "", legalReference: "", difficulty: "MEDIUM", followUpQuestion: "", followUpPoint: "1", examMode: "" };
const area = "w-full rounded-xl border border-input bg-card p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

export function OralAdmin({ questions, categories }: { questions: Q[]; categories: { id: string; name: string }[] }) {
  const { run, pending, error, message } = useAction();
  const [form, setForm] = useState(empty);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function edit(q: Q) {
    setForm({
      id: q.id,
      categoryId: q.categoryId,
      questionDe: q.questionDe,
      modelAnswerDe: q.modelAnswerDe,
      keyPoints: q.keyPoints.map((k) => `${k.required ? "! " : ""}${k.text}`).join("\n"),
      legalReference: q.legalReference ?? "",
      difficulty: q.difficulty,
      followUpQuestion: q.followUpQuestion,
      followUpPoint: String(q.followUpPoint),
      examMode: q.examMode,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Frage bearbeiten" : "Neue mündliche Frage"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveOralQuestionAction({ ...form, id: form.id || undefined, followUpPoint: Number(form.followUpPoint) || 1, difficulty: form.difficulty as "EASY", examMode: form.examMode as "" }), { onSuccess: () => setForm(empty) });
            }}
          >
            <div>
              <Label htmlFor="oq-cat">Kategorie</Label>
              <select id="oq-cat" value={form.categoryId} onChange={set("categoryId")} className={area} required>
                <option value="">– wählen –</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="oq-diff">Schwierigkeit</Label>
                <select id="oq-diff" value={form.difficulty} onChange={set("difficulty")} className={area}>
                  <option value="EASY">leicht</option>
                  <option value="MEDIUM">mittel</option>
                  <option value="HARD">schwer</option>
                </select>
              </div>
              <div>
                <Label htmlFor="oq-mode">Prüfung</Label>
                <select id="oq-mode" value={form.examMode} onChange={set("examMode")} className={area}>
                  <option value="">beide</option>
                  <option value="TAXILENKER">Taxilenker</option>
                  <option value="KONZESSION">Konzession</option>
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="oq-q">Frage</Label>
              <Input id="oq-q" value={form.questionDe} onChange={set("questionDe")} placeholder="Wie verhalten Sie sich bei …?" required />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => suggestOralAnswerAction({ categoryId: form.categoryId, questionDe: form.questionDe }), {
                    onSuccess: (d) => setForm((f) => ({ ...f, modelAnswerDe: d.modelAnswerDe, keyPoints: d.keyPoints, legalReference: d.legalReference || f.legalReference, followUpQuestion: d.followUpQuestion, followUpPoint: String(d.followUpPoint) })),
                  })
                }
              >
                <Sparkles /> Musterantwort &amp; Kernpunkte vorschlagen
              </Button>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="oq-a">Musterantwort</Label>
              <textarea id="oq-a" value={form.modelAnswerDe} onChange={set("modelAnswerDe")} rows={4} className={area} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="oq-k">Kernpunkte – einer pro Zeile, „!“ am Anfang = Pflicht</Label>
              <textarea id="oq-k" value={form.keyPoints} onChange={set("keyPoints")} rows={5} className={area} placeholder={"! Unfallstelle absichern\n! Erste Hilfe leisten\nAm Unfallort bleiben"} required />
            </div>
            <div>
              <Label htmlFor="oq-legal">Rechtsgrundlage (optional)</Label>
              <Input id="oq-legal" value={form.legalReference} onChange={set("legalReference")} placeholder="§ 4 StVO" />
            </div>
            <div className="grid grid-cols-[1fr_5rem] gap-2">
              <div>
                <Label htmlFor="oq-fu">Nachfrage</Label>
                <Input id="oq-fu" value={form.followUpQuestion} onChange={set("followUpQuestion")} placeholder="Wen müssen Sie noch verständigen?" />
              </div>
              <div>
                <Label htmlFor="oq-fup">zu Punkt</Label>
                <Input id="oq-fup" type="number" min={1} max={8} value={form.followUpPoint} onChange={set("followUpPoint")} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {form.id ? "Speichern" : "Anlegen"}
              </Button>
              {form.id && (
                <Button type="button" variant="ghost" onClick={() => setForm(empty)}>
                  Abbrechen
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {questions.length} Fragen · {questions.filter((q) => !q.verified).length} ungeprüft
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {questions.map((q) => (
              <li key={q.id} className="flex flex-wrap items-start gap-3 py-3">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="mb-1 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-bold">{q.category}</span>
                    {q.verified ? <span className="rounded-full bg-success/12 px-2 py-0.5 font-bold text-success">geprüft</span> : <span className="rounded-full bg-warning/12 px-2 py-0.5 font-bold text-warning">ungeprüft</span>}
                    <span className="text-muted-foreground">{q.attempts} Versuche</span>
                  </span>
                  <span className="block font-semibold text-navy">{q.questionDe}</span>
                  <span className="block text-xs text-muted-foreground">{q.keyPoints.map((k) => `${k.required ? "●" : "○"} ${k.text}`).join(" · ")}</span>
                </span>
                <span className="flex gap-1">
                  <Button size="sm" variant="ghost" aria-label="Bearbeiten" onClick={() => edit(q)}>
                    <Pencil />
                  </Button>
                  <Button size="sm" variant={q.verified ? "outline" : "success"} disabled={pending} onClick={() => run(() => setOralVerifiedAction(q.id, !q.verified))}>
                    {q.verified ? <Undo2 /> : <Check />} {q.verified ? "Zurücknehmen" : "Freigeben"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} aria-label="Löschen" onClick={() => run(() => deleteOralQuestionAction(q.id), { confirm: "Frage samt Versuchen löschen?" })}>
                    <Trash2 />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
