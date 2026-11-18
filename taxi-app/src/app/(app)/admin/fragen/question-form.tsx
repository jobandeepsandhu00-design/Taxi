"use client";

import Link from "next/link";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { QuestionInput } from "@/lib/validation";
import { saveQuestionAction, uploadImageAction } from "@/server/actions/admin";
import { useAction } from "../use-action";

interface Props {
  id: string | null;
  initial: QuestionInput;
  categories: { id: string; name: string; topics: { id: string; name: string }[] }[];
  sources: { id: string; title: string; verified: boolean }[];
}

const LABELS = ["A", "B", "C", "D"] as const;

export function QuestionForm({ id, initial, categories, sources }: Props) {
  const { run, pending, error, message, fieldErrors } = useAction();
  const [q, setQ] = useState<QuestionInput>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Nach dem Speichern per vollständiger Seitennavigation wechseln: zuverlässig auch dann,
  // wenn die Server-Action gleichzeitig den Router-Cache revalidiert.
  const [navigateTo, setNavigateTo] = useState<{ url: string; replace: boolean } | null>(null);
  useEffect(() => {
    if (!navigateTo) return;
    if (navigateTo.replace) window.location.replace(navigateTo.url);
    else window.location.assign(navigateTo.url);
  }, [navigateTo]);
  const topics = categories.find((c) => c.id === q.categoryId)?.topics ?? [];

  const set = <K extends keyof QuestionInput>(key: K, value: QuestionInput[K]) => setQ((prev) => ({ ...prev, [key]: value }));
  const setOption = (i: number, patch: Partial<QuestionInput["options"][number]>) =>
    setQ((prev) => {
      const options = prev.options.map((o, idx) => {
        if (idx === i) return { ...o, ...patch };
        // Einfachauswahl: nur eine richtige Antwort
        if (patch.isCorrect && !prev.multipleCorrect) return { ...o, isCorrect: false };
        return o;
      });
      return { ...prev, options };
    });

  function save(stay: boolean) {
    const payload: QuestionInput = {
      ...q,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      topicId: q.topicId || null,
      sourceId: q.sourceId || null,
    };
    run(() => saveQuestionAction(id, payload), {
      onSuccess: (data) => {
        if (!stay) setNavigateTo({ url: "/admin/fragen", replace: false });
        else if (!id) setNavigateTo({ url: `/admin/fragen/${data.id}`, replace: true });
      },
    });
  }

  function upload(file: File) {
    setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    startUpload(async () => {
      const res = await uploadImageAction(fd);
      if (res.ok) set("imageUrl", res.data.url);
      else setUploadError(res.error);
    });
  }

  const err = (k: string) => fieldErrors[k];

  return (
    <div className="space-y-5">
      {error && <Alert variant="error" title={error}>{Object.entries(fieldErrors).filter(([k]) => k === "options" || k === "_").flatMap(([, v]) => v).join(" ")}</Alert>}
      {message && !error && <Alert variant="success">{message}</Alert>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Frage</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="text">Fragetext *</Label>
                <Textarea id="text" value={q.text} onChange={(e) => set("text", e.target.value)} rows={3} aria-invalid={Boolean(err("text"))} />
                <FieldError messages={err("text")} />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={q.multipleCorrect}
                  onChange={(e) => set("multipleCorrect", e.target.checked)}
                  className="size-4 accent-blue-700"
                />
                Mehrfachauswahl (mehrere richtige Antworten möglich)
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Antwortmöglichkeiten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {q.options.map((o, i) => (
                <div key={LABELS[i]} className={cn("rounded-xl border-2 p-3.5 transition", o.isCorrect ? "border-emerald-400 bg-emerald-50/50" : "border-border")}>
                  <div className="flex items-start gap-3">
                    <span className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-extrabold text-slate-700">{LABELS[i]}</span>
                    <div className="flex-1 space-y-2">
                      <Input value={o.text} onChange={(e) => setOption(i, { text: e.target.value })} placeholder={`Antwort ${LABELS[i]}`} aria-label={`Antwort ${LABELS[i]}`} />
                      <Textarea
                        value={o.explanation ?? ""}
                        onChange={(e) => setOption(i, { explanation: e.target.value })}
                        rows={2}
                        className="min-h-14 text-xs"
                        placeholder={`Warum ist ${LABELS[i]} ${o.isCorrect ? "richtig" : "falsch"}?`}
                        aria-label={`Erklärung zu Antwort ${LABELS[i]}`}
                      />
                    </div>
                    <label className="mt-2 flex shrink-0 items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <input
                        type={q.multipleCorrect ? "checkbox" : "radio"}
                        name="correct"
                        checked={o.isCorrect}
                        onChange={(e) => setOption(i, { isCorrect: q.multipleCorrect ? e.target.checked : true })}
                        className="size-4 accent-emerald-600"
                      />
                      richtig
                    </label>
                  </div>
                </div>
              ))}
              <FieldError messages={err("options")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Erklärung</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={q.explanation} onChange={(e) => set("explanation", e.target.value)} rows={5} placeholder="Ausführliche Erklärung der richtigen Lösung" aria-label="Erklärung" aria-invalid={Boolean(err("explanation"))} />
              <FieldError messages={err("explanation")} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Einordnung</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="categoryId">Kategorie *</Label>
                <Select id="categoryId" value={q.categoryId} onChange={(e) => setQ((p) => ({ ...p, categoryId: e.target.value, topicId: null }))}>
                  <option value="">Bitte wählen</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <FieldError messages={err("categoryId")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topicId">Thema</Label>
                <Select id="topicId" value={q.topicId ?? ""} onChange={(e) => set("topicId", e.target.value || null)} disabled={topics.length === 0}>
                  <option value="">Kein Thema</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="difficulty">Schwierigkeit</Label>
                  <Select id="difficulty" value={q.difficulty} onChange={(e) => set("difficulty", e.target.value as QuestionInput["difficulty"])}>
                    <option value="EASY">Leicht</option>
                    <option value="MEDIUM">Mittel</option>
                    <option value="HARD">Schwer</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" value={q.status} onChange={(e) => set("status", e.target.value as QuestionInput["status"])}>
                    <option value="DRAFT">Entwurf</option>
                    <option value="PUBLISHED">Veröffentlicht</option>
                    <option value="ARCHIVED">Archiviert</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="z. B. vorrang, kreuzung" />
                <p className="text-xs text-muted-foreground">Durch Komma getrennt</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Herkunft & Quelle</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="origin">Herkunft *</Label>
                <Select id="origin" value={q.origin} onChange={(e) => set("origin", e.target.value as QuestionInput["origin"])}>
                  <option value="PRACTICE">Übungsfrage (eigenständig erstellt)</option>
                  <option value="DEMO">Demo-Frage</option>
                  <option value="OFFICIAL">Offiziell (nur mit verifizierter Quelle)</option>
                </Select>
                {q.origin === "OFFICIAL" && (
                  <p className="text-xs text-amber-700">Nur für nachweislich offizielle Prüfungsfragen verwenden. Eine als verifiziert markierte Quelle ist Pflicht.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sourceId">Quelle / Rechtsgrundlage</Label>
                <Select id="sourceId" value={q.sourceId ?? ""} onChange={(e) => set("sourceId", e.target.value || null)} aria-invalid={Boolean(err("sourceId"))}>
                  <option value="">Keine Quelle</option>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.verified ? "✓ " : ""}{s.title}</option>)}
                </Select>
                <FieldError messages={err("sourceId")} />
                <Link href="/admin/quellen" className="text-xs font-semibold text-primary hover:underline">Quellen verwalten</Link>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sourceDetail">Fundstelle</Label>
                <Input id="sourceDetail" value={q.sourceDetail ?? ""} onChange={(e) => set("sourceDetail", e.target.value)} placeholder="z. B. § 20 Abs. 2 StVO" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Bild (optional)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {q.imageUrl && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.imageUrl} alt="Vorschau" className="max-h-48 w-full rounded-xl border object-contain" />
                  <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 size-8" onClick={() => set("imageUrl", null)} aria-label="Bild entfernen">
                    <Trash2 />
                  </Button>
                </div>
              )}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                Bild hochladen (PNG, JPEG, WebP, max. 3 MB)
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
              <Input value={q.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value || null)} placeholder="oder Bild-URL (https://…)" aria-label="Bild-URL" />
              <FieldError messages={uploadError ? [uploadError] : err("imageUrl")} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-20 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <Button asChild variant="ghost"><Link href="/admin/fragen">Abbrechen</Link></Button>
        <Button variant="outline" onClick={() => save(true)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Speichern
        </Button>
        <Button onClick={() => save(false)} disabled={pending}>Speichern & zur Liste</Button>
      </div>
    </div>
  );
}
