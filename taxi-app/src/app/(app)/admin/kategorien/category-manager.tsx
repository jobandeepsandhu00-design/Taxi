"use client";

import { ChevronDown, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { CATEGORY_ICONS, categoryColor, categoryIcon } from "@/components/category-style";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Select, Textarea } from "@/components/ui/input";
import { deleteCategoryAction, deleteTopicAction, saveCategoryAction, saveTopicAction } from "@/server/actions/admin";
import { CATEGORY_COLOR_KEYS } from "@/lib/validation";
import { useAction } from "../use-action";

type Color = (typeof CATEGORY_COLOR_KEYS)[number];
interface Cat {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  introduction: string;
  color: Color;
  icon: string;
  order: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  isActive: boolean;
  syllabusReference: string;
  syllabusVerified: boolean;
  questionCount: number;
  topics: { id: string; name: string; description: string }[];
}

const emptyCat = (order: number): Cat => ({
  id: "",
  name: "",
  slug: "",
  shortDescription: "",
  introduction: "",
  color: "blue",
  icon: "BookOpen",
  order,
  difficulty: "MEDIUM",
  isActive: true,
  syllabusReference: "",
  syllabusVerified: false,
  questionCount: 0,
  topics: [],
});

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { run, pending, error, message } = useAction();

  return (
    <div className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      {message && !error && <Alert variant="success">{message}</Alert>}
      <div className="flex justify-end">
        <Button onClick={() => { setCreating(true); setEditing(null); }}><Plus /> Neue Kategorie</Button>
      </div>
      {creating && <CategoryForm cat={emptyCat(categories.length + 1)} onDone={() => setCreating(false)} />}
      {categories.map((c) => {
        const Icon = categoryIcon(c.icon);
        const color = categoryColor(c.color);
        const open = editing === c.id;
        return (
          <Card key={c.id} className="overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color.soft} ${color.text}`}><Icon className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy">{c.order}. {c.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>/{c.slug}</span>
                  <span>· {c.questionCount} Fragen · {c.topics.length} Themen</span>
                  {!c.isActive && <Badge variant="muted">inaktiv</Badge>}
                  {c.syllabusVerified ? (
                    <Badge variant="success"><ShieldCheck className="size-3" /> Stoff verifiziert</Badge>
                  ) : (
                    <Badge variant="warning"><ShieldAlert className="size-3" /> unverifiziert</Badge>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setEditing(open ? null : c.id); setCreating(false); }}>
                <Pencil /> {open ? "Schließen" : "Bearbeiten"} <ChevronDown className={open ? "rotate-180" : ""} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                aria-label="Kategorie löschen"
                disabled={pending}
                onClick={() => run(() => deleteCategoryAction(c.id), { confirm: `Kategorie „${c.name}“ löschen?` })}
              >
                <Trash2 />
              </Button>
            </div>
            {open && (
              <div className="border-t bg-muted/30 p-4">
                <CategoryForm cat={c} onDone={() => setEditing(null)} />
                <TopicManager categoryId={c.id} topics={c.topics} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function CategoryForm({ cat, onDone }: { cat: Cat; onDone: () => void }) {
  const [c, setC] = useState(cat);
  const { run, pending, error, fieldErrors } = useAction();
  const set = <K extends keyof Cat>(k: K, v: Cat[K]) => setC((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4 rounded-2xl glass p-4">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Name *</span><Input value={c.name} onChange={(e) => set("name", e.target.value)} /><FieldError messages={fieldErrors.name} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Slug (URL) *</span><Input value={c.slug} onChange={(e) => set("slug", e.target.value)} placeholder="z. B. stvo" /><FieldError messages={fieldErrors.slug} /></label>
      </div>
      <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Kurzbeschreibung *</span><Input value={c.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} /><FieldError messages={fieldErrors.shortDescription} /></label>
      <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Einführung *</span><Textarea rows={6} value={c.introduction} onChange={(e) => set("introduction", e.target.value)} /><FieldError messages={fieldErrors.introduction} /></label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Farbe</span><Select value={c.color} onChange={(e) => set("color", e.target.value as Color)}>{CATEGORY_COLOR_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</Select></label>
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Symbol</span><Select value={c.icon} onChange={(e) => set("icon", e.target.value)}>{Object.keys(CATEGORY_ICONS).map((k) => <option key={k} value={k}>{k}</option>)}</Select></label>
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Reihenfolge</span><Input type="number" min={0} value={c.order} onChange={(e) => set("order", Number(e.target.value))} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Schwierigkeit</span><Select value={c.difficulty} onChange={(e) => set("difficulty", e.target.value as Cat["difficulty"])}><option value="EASY">Leicht</option><option value="MEDIUM">Mittel</option><option value="HARD">Schwer</option></Select></label>
      </div>
      <label className="block space-y-1.5"><span className="text-sm font-semibold text-navy">Bezug zum offiziellen Prüfungsstoff</span><Textarea rows={2} value={c.syllabusReference} onChange={(e) => set("syllabusReference", e.target.value)} placeholder="z. B. Verordnung, Paragraph, Stand/Datum der Prüfung" /></label>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-blue-700" checked={c.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Aktiv (für Lernende sichtbar)</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-emerald-600" checked={c.syllabusVerified} onChange={(e) => set("syllabusVerified", e.target.checked)} /> Mit aktuellem offiziellen Prüfungsstoff abgeglichen</label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
        <Button
          disabled={pending}
          onClick={() =>
            run(
              () =>
                saveCategoryAction(c.id || null, {
                  name: c.name,
                  slug: c.slug,
                  shortDescription: c.shortDescription,
                  introduction: c.introduction,
                  color: c.color,
                  icon: c.icon,
                  order: c.order,
                  difficulty: c.difficulty,
                  isActive: c.isActive,
                  syllabusReference: c.syllabusReference,
                  syllabusVerified: c.syllabusVerified,
                }),
              { onSuccess: onDone },
            )
          }
        >
          Kategorie speichern
        </Button>
      </div>
    </div>
  );
}

function TopicManager({ categoryId, topics }: { categoryId: string; topics: Cat["topics"] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [edit, setEdit] = useState<{ id: string; name: string; description: string } | null>(null);
  const { run, pending, error } = useAction();
  return (
    <div className="mt-4 space-y-3 rounded-2xl glass p-4">
      <p className="font-bold text-navy">Themen</p>
      {error && <Alert variant="error">{error}</Alert>}
      <ul className="divide-y">
        {topics.map((t) =>
          edit?.id === t.id ? (
            <li key={t.id} className="grid grid-cols-1 gap-2 py-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} aria-label="Themenname" />
              <Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} aria-label="Beschreibung" />
              <div className="flex gap-1">
                <Button size="sm" disabled={pending} onClick={() => run(() => saveTopicAction(t.id, { categoryId, name: edit.name, description: edit.description }), { onSuccess: () => setEdit(null) })}>Speichern</Button>
                <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Abbrechen</Button>
              </div>
            </li>
          ) : (
            <li key={t.id} className="flex items-center gap-2 py-2 text-sm">
              <span className="flex-1"><strong className="text-navy">{t.name}</strong>{t.description && <span className="text-muted-foreground"> – {t.description}</span>}</span>
              <Button size="icon" variant="ghost" aria-label="Thema bearbeiten" onClick={() => setEdit(t)}><Pencil /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" aria-label="Thema löschen" disabled={pending} onClick={() => run(() => deleteTopicAction(t.id), { confirm: `Thema „${t.name}“ löschen? Fragen bleiben erhalten.` })}><Trash2 /></Button>
            </li>
          ),
        )}
      </ul>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Neues Thema" aria-label="Neues Thema" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beschreibung (optional)" aria-label="Beschreibung" />
        <Button variant="secondary" disabled={pending || name.trim().length < 2} onClick={() => run(() => saveTopicAction(null, { categoryId, name, description }), { onSuccess: () => { setName(""); setDescription(""); } })}>
          <Plus /> Hinzufügen
        </Button>
      </div>
    </div>
  );
}
