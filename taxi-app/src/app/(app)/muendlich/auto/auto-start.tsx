"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, CloudDownload, Headphones, History, Loader2, Play, Settings2, Shuffle, Sparkles, WifiOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { estimateDrillSeconds, type DrillSettings } from "@/lib/audio/drill";
import { cacheAudioUrls, cachedCount, formatMb } from "@/lib/audio/offline";
import { audioEngine } from "@/lib/audio/player";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { saveDrillSettingsAction, startDrillAction } from "@/server/actions/audio-drill";

export type StartChapter = { id: string; slug: string; title: string; order: number; total: number; qMs: number; aMs: number; withAudio: number; urls: string[]; last: { known: number; total: number } | null };
type Topic = { id: string; title: string; chapters: StartChapter[] };

const fmtMin = (sec: number) => (sec < 90 ? `${sec} s` : `${Math.round(sec / 60)} Min.`);

export function AutoStart({ settings: initial, topics, open, againCount, preselect }: { settings: DrillSettings; topics: Topic[]; open: { title: string; position: number; total: number } | null; againCount: number; preselect: string | null }) {
  const [s, setS] = useState(initial);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [openTopic, setOpenTopic] = useState<string | null>(() => (preselect ? (topics.find((t) => t.chapters.some((c) => c.slug === preselect || c.id === preselect))?.id ?? topics[0]?.id) : topics[0]?.id) ?? null);

  const update = (patch: Partial<DrillSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    void saveDrillSettingsAction(next).catch(() => undefined);
  };

  const go = (input: Parameters<typeof startDrillAction>[0]) => {
    haptic();
    // Dieser Tap entsperrt die Audiowiedergabe auf iOS
    void audioEngine().unlock();
    setError(null);
    start(async () => {
      const r = await startDrillAction(input);
      if (r && !r.ok) setError(r.error);
    });
  };

  const allUrls = topics.flatMap((t) => t.chapters.flatMap((c) => c.urls));

  return (
    <div className="space-y-6 pb-6">
      <Link href="/muendlich" className="inline-flex items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft className="size-4" /> Mündliche Prüfung
      </Link>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-link uppercase">Mündlich</p>
          <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">Auto-Modus</h1>
          <p className="mt-1 text-sm text-muted-foreground">Die Frage wird vorgelesen, du antwortest laut – wie in der echten mündlichen Prüfung. Danach hörst du die richtige Antwort.</p>
        </div>
        <button type="button" onClick={() => setShowSettings((v) => !v)} className="glass flex size-11 shrink-0 items-center justify-center rounded-xl" aria-label="Einstellungen" aria-expanded={showSettings} data-testid="drill-settings-toggle">
          <Settings2 className="size-5" />
        </button>
      </header>

      <AnimatePresence initial={false}>{showSettings && <SettingsPanel s={s} update={update} />}</AnimatePresence>

      {error && <p className="rounded-xl bg-warning/10 p-3 text-sm font-semibold text-warning" role="alert">{error}</p>}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Schnellstart">
        <QuickStart icon={<Headphones className="size-5" />} label="Alle Kapitel" onClick={() => go({ mode: "all" })} disabled={pending} testid="drill-all" />
        <QuickStart icon={<Sparkles className="size-5" />} label="Nur nicht gewusste" hint={`${againCount}`} onClick={() => go({ mode: "unknown" })} disabled={pending || againCount === 0} testid="drill-unknown" />
        <QuickStart icon={<Shuffle className="size-5" />} label="Zufällig 10" onClick={() => go({ mode: "random10" })} disabled={pending} testid="drill-random" />
        <QuickStart icon={<History className="size-5" />} label="Weiter wo ich war" hint={open ? `${open.position}/${open.total}` : undefined} onClick={() => go({ mode: "resume" })} disabled={pending || !open} testid="drill-resume" />
      </section>

      <DownloadAll urls={allUrls} />

      <section className="space-y-3" aria-label="Kapitel">
        {topics.map((t) => {
          const isOpen = openTopic === t.id;
          return (
            <div key={t.id} className="glass overflow-hidden rounded-2xl">
              <button type="button" onClick={() => setOpenTopic(isOpen ? null : t.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={isOpen}>
                <span>
                  <span className="block font-extrabold text-navy">{t.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.chapters.length} Kapitel · {t.chapters.reduce((x, c) => x + c.total, 0)} Fragen
                  </span>
                </span>
                <ChevronDown className={cn("size-5 transition", isOpen && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="divide-y divide-border border-t border-border">
                    {t.chapters.map((c) => (
                      <ChapterRow key={c.id} c={c} s={s} highlight={c.slug === preselect || c.id === preselect} onStart={() => go({ mode: "chapter", id: c.id })} disabled={pending} />
                    ))}
                    <li className="p-3">
                      <button type="button" onClick={() => go({ mode: "topic", id: t.id })} disabled={pending} className="w-full rounded-xl border border-border py-2 text-sm font-bold text-navy">
                        Ganzes Thema abfragen
                      </button>
                    </li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </section>
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" aria-live="polite">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}

function QuickStart({ icon, label, hint, onClick, disabled, testid }: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void; disabled?: boolean; testid?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testid} className="glass glow-hover flex flex-col items-start gap-2 rounded-2xl p-4 text-left disabled:opacity-50">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">{icon}</span>
      <span className="font-bold text-navy">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}

function ChapterRow({ c, s, onStart, disabled, highlight }: { c: StartChapter; s: DrillSettings; onStart: () => void; disabled: boolean; highlight: boolean }) {
  const [cached, setCached] = useState<number | null>(null);
  const [dl, setDl] = useState<{ done: number; total: number } | null>(null);
  useEffect(() => {
    if (c.urls.length) void cachedCount(c.urls).then(setCached);
  }, [c.urls]);
  const offline = cached !== null && c.urls.length > 0 && cached >= c.urls.length;
  const avgQ = c.withAudio ? c.qMs / c.withAudio : 0;
  const avgA = c.withAudio ? c.aMs / c.withAudio : 0;
  const est = estimateDrillSeconds(avgQ, avgA, c.total, s);
  return (
    <li className={cn("flex items-center gap-3 p-3", highlight && "bg-primary/8")} data-testid={`drill-chapter-${c.slug}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-navy">
          <span className="mr-1 text-muted-foreground">{c.order}.</span>
          {c.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {c.total} Fragen · ca. {fmtMin(est)}
          {c.last && <> · zuletzt {c.last.known}/{c.last.total} gewusst</>}
          {c.withAudio < c.total && <> · {c.withAudio === 0 ? "Ersatzstimme" : `${c.withAudio}/${c.total} mit Studio-Audio`}</>}
        </p>
      </div>
      {c.urls.length > 0 && (
        <button
          type="button"
          aria-label={offline ? "Offline verfügbar" : "Kapitel herunterladen"}
          title={offline ? "Offline verfügbar" : "Kapitel herunterladen"}
          onClick={async () => {
            if (offline) return;
            setDl({ done: 0, total: c.urls.length });
            await cacheAudioUrls(c.urls, (done, total) => setDl({ done, total }));
            setDl(null);
            setCached(await cachedCount(c.urls));
          }}
          className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent"
        >
          {dl ? <span className="text-[10px] font-bold">{Math.round((dl.done / dl.total) * 100)}%</span> : offline ? <span aria-hidden>✅</span> : <CloudDownload className="size-5" />}
        </button>
      )}
      <button type="button" onClick={onStart} disabled={disabled} className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95" aria-label={`${c.title} starten`} data-testid={`drill-start-${c.slug}`}>
        <Play className="size-5 translate-x-0.5" />
      </button>
    </li>
  );
}

function DownloadAll({ urls }: { urls: string[] }) {
  const [state, setState] = useState<{ done: number; total: number } | null>(null);
  const [bytes, setBytes] = useState<number | null>(null);
  if (urls.length === 0)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-foreground/5 p-3 text-xs text-muted-foreground">
        <WifiOff className="size-4" /> Studio-Audios werden gerade vorbereitet – bis dahin liest die Gerätestimme vor („Ersatzstimme“).
      </p>
    );
  return (
    <button
      type="button"
      onClick={async () => {
        setState({ done: 0, total: urls.length });
        const b = await cacheAudioUrls(urls, (done, total) => setState({ done, total }));
        setBytes(b);
        setState(null);
      }}
      disabled={Boolean(state)}
      className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left text-sm"
    >
      <CloudDownload className="size-5 text-primary" />
      <span className="flex-1 font-semibold text-navy">{state ? `Lade … ${state.done}/${state.total}` : bytes !== null ? `Alles offline verfügbar (${formatMb(bytes)})` : "Alles herunterladen (offline üben)"}</span>
    </button>
  );
}

function SettingsPanel({ s, update }: { s: DrillSettings; update: (p: Partial<DrillSettings>) => void }) {
  const Seg = <T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) => (
    <div>
      <p className="mb-1.5 text-sm font-bold text-navy">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={String(o.v)} type="button" onClick={() => onChange(o.v)} aria-pressed={value === o.v} className={cn("rounded-xl px-3 py-1.5 text-sm font-semibold", value === o.v ? "bg-primary text-primary-foreground" : "bg-foreground/5")}>
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-navy">{label}</span>
      <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
  return (
    <motion.section initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden" data-testid="drill-settings">
      <div className="glass space-y-4 rounded-2xl p-4">
        <Seg label="Antwortzeit" value={s.answerSec} options={[10, 15, 30, 45, 60].map((v) => ({ v: v as DrillSettings["answerSec"], l: `${v} s` }))} onChange={(v) => update({ answerSec: v })} />
        <Seg label="Nach Ablauf" value={s.afterTimeout} options={[{ v: "next", l: "Nächste Frage" }, { v: "readAnswer", l: "Antwort vorlesen, dann weiter" }, { v: "stop", l: "Stoppen" }]} onChange={(v) => update({ afterTimeout: v as DrillSettings["afterTimeout"] })} />
        <Seg label="Antwortkarte" value={s.answerCard} options={[{ v: "hidden", l: "Versteckt" }, { v: "autoReveal", l: "Am Ende automatisch aufdecken" }]} onChange={(v) => update({ answerCard: v as DrillSettings["answerCard"] })} />
        <Seg label="Reihenfolge" value={s.order} options={[{ v: "chapter", l: "Kapitel" }, { v: "random", l: "Zufällig" }, { v: "unknown", l: "Nur nicht gewusst" }]} onChange={(v) => update({ order: v as DrillSettings["order"] })} />
        <Seg label="Stimme" value={s.voice} options={[{ v: "female", l: "weiblich" }, { v: "male", l: "männlich" }]} onChange={(v) => update({ voice: v as DrillSettings["voice"] })} />
        <div>
          <p className="mb-1.5 text-sm font-bold text-navy">Tempo {s.rate.toFixed(2).replace(".", ",")}×</p>
          <input type="range" min={0.8} max={1.3} step={0.05} value={s.rate} onChange={(e) => update({ rate: Number(e.target.value) })} className="w-full accent-[var(--primary)]" aria-label="Tempo" />
        </div>
        <Toggle label="Text anzeigen" checked={s.showText} onChange={(v) => update({ showText: v })} />
        <Toggle label="Frage zweimal vorlesen" checked={s.repeatQuestion} onChange={(v) => update({ repeatQuestion: v })} />
        <Toggle label="Timer pausiert beim Aufdecken" checked={s.pauseOnReveal} onChange={(v) => update({ pauseOnReveal: v })} />
        <Toggle label="Antwort aufnehmen (zum Selbst-Check)" checked={s.record} onChange={(v) => update({ record: v })} />
      </div>
    </motion.section>
  );
}
