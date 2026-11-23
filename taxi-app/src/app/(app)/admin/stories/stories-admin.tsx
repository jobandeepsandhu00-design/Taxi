"use client";

import { ChevronDown, Eye, Loader2, Plus, RefreshCw, Smartphone, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StoryViewer } from "@/components/stories/story-viewer";
import { STORY_TYPES, type StoryGroupData, type StorySlideData, type StoryType } from "@/lib/stories";
import { cn } from "@/lib/utils";
import { deleteStoryGroupAction, deleteStorySlideAction, regenerateTodayAction, saveStoryGroupAction, saveStorySlideAction } from "@/server/actions/admin-stories";

export type AdminSlide = {
  id: string;
  sort: number;
  titleDe: string;
  bodyDe: string;
  emoji: string;
  bgColor: string;
  durationMs: number;
  ctaLabel: string;
  ctaRoute: string;
  quizQuestionId: string;
  mapLat: string;
  mapLng: string;
  mapLabel: string;
  imageUrl: string | null;
  imageCredit: string;
  verified: boolean;
  views: number;
  preview: StorySlideData;
};
export type AdminGroup = {
  id: string;
  key: string;
  titleDe: string;
  iconImage: string;
  type: string;
  isPersonal: boolean;
  sort: number;
  ringColors: string[];
  activeFrom: string;
  activeTo: string;
  stats: { views: number; viewers: number; completes: number; completionRate: number | null; cta: number; quizTotal: number; quizAccuracy: number | null };
  slides: AdminSlide[];
};

const input = "h-10 w-full rounded-xl border border-input bg-muted px-3 text-sm text-foreground";
const label = "text-xs font-semibold text-muted-foreground";

function useRun() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // ohne useTransition: Formulare schließen sich nach dem Speichern (siehe question-form.tsx)
  const run = async (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    setPending(true);
    try {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: r.message ?? "Gespeichert." } : { ok: false, text: r.error ?? "Fehler" });
      if (r.ok) router.refresh();
    } finally {
      setPending(false);
    }
  };
  return { pending, msg, run };
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={cn("text-xs font-semibold", msg.ok ? "text-success" : "text-destructive")} role="status">{msg.text}</p>;
}

function PhonePreview({ group, slides, onClose }: { group: AdminGroup; slides: StorySlideData[]; onClose: () => void }) {
  const data: StoryGroupData = { key: group.key, title: group.titleDe, icon: group.iconImage && !group.iconImage.includes("/") ? group.iconImage : "🚕", ring: group.ringColors, type: group.type as StoryType, personal: group.isPersonal, createdAt: new Date().toISOString(), slides, seenIds: [] };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-label="Vorschau" onClick={onClose}>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Vorschau schließen" className="absolute -top-3 -right-3 z-10 flex size-9 items-center justify-center rounded-full bg-white text-black shadow">
          <X className="size-5" />
        </button>
        <div className="relative h-[min(640px,86dvh)] w-[min(300px,calc(86dvh*0.47))] overflow-hidden rounded-[36px] border-[10px] border-[#111] bg-black shadow-2xl" data-testid="story-phone-preview">
          {slides.length ? <StoryViewer groups={[data]} startKey={group.key} mode="preview" onClose={onClose} /> : <p className="p-6 text-center text-sm text-white/70">Keine Slides – persönliche Gruppen werden live für jede:n Nutzer:in erzeugt.</p>}
        </div>
      </div>
    </div>
  );
}

function GroupForm({ g, onDone }: { g?: AdminGroup; onDone?: () => void }) {
  const { pending, msg, run } = useRun();
  const [ring, setRing] = useState<string[]>(g?.ringColors ?? ["#FFC400", "#F59E0B", "#2563EB"]);
  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(async () => {
          const r = await saveStoryGroupAction({
            id: g?.id,
            key: String(f.get("key")),
            titleDe: String(f.get("titleDe")),
            iconImage: String(f.get("iconImage") ?? ""),
            type: String(f.get("type")),
            isPersonal: f.get("isPersonal") === "on",
            sort: Number(f.get("sort")),
            ringColors: ring,
            activeFrom: String(f.get("activeFrom") ?? ""),
            activeTo: String(f.get("activeTo") ?? ""),
          });
          if (r.ok) onDone?.();
          return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error };
        });
      }}
    >
      <label className="space-y-1"><span className={label}>Schlüssel</span><input name="key" defaultValue={g?.key} required className={input} placeholder="z. B. saison-advent" /></label>
      <label className="space-y-1"><span className={label}>Titel</span><input name="titleDe" defaultValue={g?.titleDe} required className={input} /></label>
      <label className="space-y-1"><span className={label}>Icon (Emoji oder Bildpfad)</span><input name="iconImage" defaultValue={g?.iconImage} className={input} placeholder="💡" /></label>
      <label className="space-y-1">
        <span className={label}>Typ</span>
        <select name="type" defaultValue={g?.type ?? "news"} className={input}>
          {STORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className="space-y-1"><span className={label}>Reihenfolge</span><input name="sort" type="number" defaultValue={g?.sort ?? 100} className={input} /></label>
      <div className="space-y-1">
        <span className={label}>Ringfarben</span>
        <div className="flex items-center gap-2">
          {ring.map((c, i) => <input key={i} type="color" value={c} onChange={(e) => setRing((r) => r.map((x, j) => (j === i ? e.target.value : x)))} className="h-10 w-12 rounded-lg border border-input" aria-label={`Ringfarbe ${i + 1}`} />)}
          <span className="size-10 rounded-full" style={{ background: `conic-gradient(${[...ring, ring[0]].join(",")})` }} aria-hidden />
        </div>
      </div>
      <label className="space-y-1"><span className={label}>Aktiv ab (optional)</span><input name="activeFrom" type="datetime-local" defaultValue={g?.activeFrom} className={input} /></label>
      <label className="space-y-1"><span className={label}>Aktiv bis (optional)</span><input name="activeTo" type="datetime-local" defaultValue={g?.activeTo} className={input} /></label>
      <label className="flex items-center gap-2 text-sm"><input name="isPersonal" type="checkbox" defaultChecked={g?.isPersonal} className="size-4" /> Persönlich (live aus Nutzerdaten)</label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">{pending && <Loader2 className="size-4 animate-spin" />} Gruppe speichern</button>
        <Msg msg={msg} />
      </div>
    </form>
  );
}

function SlideForm({ groupId, s, nextSort, onDone }: { groupId: string; s?: AdminSlide; nextSort: number; onDone?: () => void }) {
  const { pending, msg, run } = useRun();
  const [own, setOwn] = useState(s?.imageCredit === "Eigenes Bild");
  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(async () => {
          const r = await saveStorySlideAction(f);
          if (r.ok) onDone?.();
          return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error };
        });
      }}
      encType="multipart/form-data"
    >
      <input type="hidden" name="groupId" value={groupId} />
      {s && <input type="hidden" name="id" value={s.id} />}
      <label className="space-y-1 sm:col-span-2"><span className={label}>Titel</span><input name="titleDe" defaultValue={s?.titleDe} required maxLength={120} className={input} /></label>
      <label className="space-y-1 sm:col-span-2"><span className={label}>Text</span><textarea name="bodyDe" defaultValue={s?.bodyDe} rows={3} maxLength={1200} className="w-full rounded-xl border border-input bg-muted p-3 text-sm text-foreground" /></label>
      <label className="space-y-1"><span className={label}>Platzhalter-Emoji</span><input name="emoji" defaultValue={s?.emoji} className={input} placeholder="💡" /></label>
      <label className="space-y-1"><span className={label}>Hintergrund (Farbe/Verlauf)</span><input name="bgColor" defaultValue={s?.bgColor} className={input} placeholder="linear-gradient(160deg,#111,#854d0e)" /></label>
      <label className="space-y-1"><span className={label}>Dauer (ms)</span><input name="durationMs" type="number" min={2000} max={30000} step={500} defaultValue={s?.durationMs ?? 6000} className={input} /></label>
      <label className="space-y-1"><span className={label}>Reihenfolge</span><input name="sort" type="number" defaultValue={s?.sort ?? nextSort} className={input} /></label>
      <label className="space-y-1"><span className={label}>Button-Text (CTA)</span><input name="ctaLabel" defaultValue={s?.ctaLabel} className={input} placeholder="Lektion starten" /></label>
      <label className="space-y-1"><span className={label}>Button-Ziel</span><input name="ctaRoute" defaultValue={s?.ctaRoute} className={input} placeholder="/lernen" /></label>
      <label className="space-y-1"><span className={label}>Quiz: Fragen-ID</span><input name="quizQuestionId" defaultValue={s?.quizQuestionId} className={input} /></label>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1"><span className={label}>Breite</span><input name="mapLat" defaultValue={s?.mapLat} className={input} placeholder="48.21" /></label>
        <label className="space-y-1"><span className={label}>Länge</span><input name="mapLng" defaultValue={s?.mapLng} className={input} placeholder="16.37" /></label>
        <label className="space-y-1"><span className={label}>Ort</span><input name="mapLabel" defaultValue={s?.mapLabel} className={input} /></label>
      </div>
      <label className="space-y-1">
        <span className={label}>Bild (wird zu WebP, max. 1080×1920)</span>
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
      </label>
      <label className="space-y-1">
        <span className={label}>Bildnachweis {own ? "" : "(Pflicht bei fremden Bildern)"}</span>
        <input name="imageCredit" defaultValue={s?.imageCredit === "Eigenes Bild" ? "" : s?.imageCredit} className={input} placeholder="Foto: Name / Lizenz" />
      </label>
      <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input name="ownImage" type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} className="size-4" /> Eigenes Bild</label>
        {s?.imageUrl && <label className="flex items-center gap-2"><input name="removeImage" type="checkbox" className="size-4" /> Bild entfernen</label>}
        <label className="flex items-center gap-2"><input name="verified" type="checkbox" defaultChecked={s?.verified} className="size-4" /> Geprüft</label>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">{pending && <Loader2 className="size-4 animate-spin" />} Slide speichern</button>
        <Msg msg={msg} />
      </div>
    </form>
  );
}

function GroupCard({ g }: { g: AdminGroup }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [slideEdit, setSlideEdit] = useState<string | "new" | null>(null);
  const [preview, setPreview] = useState<StorySlideData[] | null>(null);
  const { pending, msg, run } = useRun();
  const st = g.stats;
  return (
    <section className="glass rounded-2xl p-4" data-testid={`admin-story-${g.key}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full text-2xl" style={{ background: `conic-gradient(${[...g.ringColors, g.ringColors[0]].join(",")})` }}>
          <span className="flex size-10 items-center justify-center rounded-full bg-card-solid">{g.iconImage && !g.iconImage.includes("/") ? g.iconImage : "🖼️"}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-navy">{g.titleDe} <span className="text-xs font-semibold text-muted-foreground">· {g.key} · {g.type}{g.isPersonal ? " · persönlich" : ""}</span></p>
          <p className="text-xs text-muted-foreground">
            7 Tage: {st.views} Aufrufe · {st.viewers} Personen · Abschluss {st.completionRate ?? "–"} % · CTA {st.cta}
            {st.quizTotal ? ` · Quiz ${st.quizAccuracy} % richtig (${st.quizTotal})` : ""}
          </p>
        </div>
        <button type="button" onClick={() => setPreview(g.slides.map((s) => s.preview))} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold"><Smartphone className="size-4" /> Vorschau</button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-link">{g.slides.length} Slides <ChevronDown className={cn("size-4 transition", open && "rotate-180")} /></button>
      </div>
      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEdit((e) => !e)} className="min-h-9 rounded-xl border border-border px-3 text-sm font-semibold">Gruppe bearbeiten</button>
            <button type="button" onClick={() => setSlideEdit("new")} className="flex min-h-9 items-center gap-1 rounded-xl border border-border px-3 text-sm font-semibold"><Plus className="size-4" /> Slide</button>
            <button type="button" disabled={pending} onClick={() => run(() => deleteStoryGroupAction(g.id), `Gruppe „${g.titleDe}“ mit allen Slides löschen?`)} className="flex min-h-9 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-destructive"><Trash2 className="size-4" /> Gruppe löschen</button>
            <Msg msg={msg} />
          </div>
          {edit && <GroupForm g={g} onDone={() => setEdit(false)} />}
          {slideEdit === "new" && <div className="rounded-xl border border-border p-3"><SlideForm groupId={g.id} nextSort={g.slides.length} onDone={() => setSlideEdit(null)} /></div>}
          <ul className="space-y-2">
            {g.slides.map((s) => (
              <li key={s.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md text-lg" style={{ background: s.bgColor || "#111" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau aus dem Story-Bucket */}
                    {s.imageUrl ? <img src={s.imageUrl} alt="" className="h-full w-full object-cover" /> : s.emoji || "🖼️"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-navy">{s.titleDe}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.bodyDe}</p>
                    <p className="text-[11px] text-muted-foreground">{s.durationMs / 1000}s · {s.views} Aufrufe{s.quizQuestionId ? " · Quiz" : ""}{s.mapLat ? " · Karte" : ""}{s.ctaRoute ? ` · ${s.ctaRoute}` : ""} · {s.verified ? "✅ geprüft" : "⏳ ungeprüft"}</p>
                  </div>
                  <button type="button" onClick={() => setPreview([s.preview])} aria-label="Slide-Vorschau" className="flex size-9 items-center justify-center rounded-lg hover:bg-accent"><Eye className="size-4" /></button>
                  <button type="button" onClick={() => setSlideEdit(slideEdit === s.id ? null : s.id)} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-link">Bearbeiten</button>
                  <button type="button" onClick={() => run(() => deleteStorySlideAction(s.id), "Slide löschen?")} aria-label="Slide löschen" className="flex size-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /></button>
                </div>
                {slideEdit === s.id && <div className="mt-3"><SlideForm groupId={g.id} s={s} nextSort={s.sort} onDone={() => setSlideEdit(null)} /></div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {preview && <PhonePreview group={g} slides={preview} onClose={() => setPreview(null)} />}
    </section>
  );
}

export function StoriesAdmin({ groups }: { groups: AdminGroup[] }) {
  const [creating, setCreating] = useState(false);
  const { pending, msg, run } = useRun();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setCreating((c) => !c)} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="size-4" /> Neue Gruppe</button>
        <button type="button" disabled={pending} onClick={() => run(() => regenerateTodayAction(), "Heutige Tagesauswahl neu erzeugen? Alle sehen danach neue Inhalte.")} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Heute neu erzeugen
        </button>
        <Msg msg={msg} />
      </div>
      {creating && <div className="glass rounded-2xl p-4"><GroupForm onDone={() => setCreating(false)} /></div>}
      {groups.map((g) => <GroupCard key={g.id} g={g} />)}
    </div>
  );
}
