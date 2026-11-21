"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, CloudDownload, Loader2, Trash2, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { haptic, spring } from "@/lib/motion";
import { deletePack, listPacks, savePack, type OfflinePack, type OfflineQuestion } from "@/lib/offline-store";
import { shuffle } from "@/lib/quiz-logic";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

function Practice({ pack, onExit }: { pack: OfflinePack; onExit: () => void }) {
  const [questions] = useState<OfflineQuestion[]>(() => shuffle(pack.questions).slice(0, 20));
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const q = questions[i];

  if (!q) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-4xl">🏁</p>
        <p className="mt-2 font-display text-xl font-bold text-navy">
          {correct} von {questions.length} richtig
        </p>
        <Button className="mt-4" onClick={onExit}>
          Zurück zu den Paketen
        </Button>
      </div>
    );
  }
  const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
  const isRight = revealed && correctIds.length === selected.length && correctIds.every((id) => selected.includes(id));

  return (
    <AnimatePresence mode="wait">
      <motion.div key={i} className="glass space-y-4 rounded-2xl p-5" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={spring}>
        <div className="flex items-center justify-between text-xs font-bold text-link uppercase">
          <span>
            {pack.name} · {i + 1}/{questions.length}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <WifiOff className="size-3.5" /> offline
          </span>
        </div>
        <h2 className="text-lg leading-relaxed font-bold text-navy">{q.text}</h2>
        <div className="space-y-2">
          {q.options.map((o) => {
            const sel = selected.includes(o.id);
            const state = !revealed ? (sel ? "sel" : "idle") : o.isCorrect ? "ok" : sel ? "bad" : "dim";
            return (
              <button
                key={o.id}
                type="button"
                disabled={revealed}
                onClick={() => {
                  haptic(8);
                  setSelected((p) => (q.multipleCorrect ? (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]) : [o.id]));
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left text-sm transition-colors",
                  state === "idle" && "border-border",
                  state === "sel" && "border-primary bg-primary/10",
                  state === "ok" && "border-success bg-success/12",
                  state === "bad" && "border-destructive bg-destructive/12",
                  state === "dim" && "border-border opacity-50",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/8 font-display text-xs font-bold">
                  {state === "ok" ? <Check className="size-3.5 text-success" /> : state === "bad" ? <X className="size-3.5 text-destructive" /> : o.label}
                </span>
                <span className="flex-1 whitespace-pre-line">{o.text}</span>
              </button>
            );
          })}
        </div>
        {revealed ? (
          <div className="space-y-3">
            <p className={cn("font-bold", isRight ? "text-success" : "text-destructive")}>{isRight ? "Richtig!" : "Leider falsch"}</p>
            <p className="text-sm whitespace-pre-line text-foreground/80">{q.explanation}</p>
            <Button
              className="w-full"
              onClick={() => {
                setI((n) => n + 1);
                setSelected([]);
                setRevealed(false);
              }}
            >
              Nächste Frage <ArrowRight />
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            disabled={selected.length === 0}
            onClick={() => {
              const ok = correctIds.length === selected.length && correctIds.every((id) => selected.includes(id));
              if (ok) setCorrect((c) => c + 1);
              playSound(ok ? "correct" : "wrong");
              setRevealed(true);
            }}
          >
            Antwort prüfen
          </Button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function OfflinePractice({ categories }: { categories: { slug: string; name: string }[] }) {
  const [packs, setPacks] = useState<OfflinePack[] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [active, setActive] = useState<OfflinePack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    listPacks()
      .then(setPacks)
      .catch(() => setPacks([]));
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function download(slug: string) {
    setLoading(slug);
    setError(null);
    try {
      const res = await fetch(`/api/offline-pack?kategorie=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error();
      const pack = (await res.json()) as OfflinePack;
      await savePack(pack);
      setPacks(await listPacks());
      // Diese Seite für die Offline-Nutzung zwischenspeichern
      navigator.serviceWorker?.controller?.postMessage({ type: "cache-urls", urls: ["/offline-lernen"] });
      playSound("correct");
    } catch {
      setError("Download fehlgeschlagen – bitte mit Internet erneut versuchen.");
    } finally {
      setLoading(null);
    }
  }

  if (active) return <Practice pack={active} onExit={() => setActive(null)} />;

  return (
    <div className="space-y-5">
      {!online && (
        <p className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <WifiOff className="size-4 text-warning" /> Du bist offline – heruntergeladene Pakete funktionieren trotzdem.
        </p>
      )}
      <section>
        <h2 className="mb-2 font-bold text-navy">Auf diesem Gerät</h2>
        {packs === null ? (
          <div className="skeleton h-16" />
        ) : packs.length === 0 ? (
          <p className="glass rounded-2xl p-4 text-sm text-muted-foreground">Noch keine Pakete – lade unten eine Kategorie herunter.</p>
        ) : (
          <ul className="space-y-2">
            {packs.map((p) => (
              <motion.li key={p.slug} layout className="glass flex items-center gap-3 rounded-2xl p-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-success/15 text-success">
                  <Check className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.questions.length} Fragen · {new Date(p.downloadedAt).toLocaleDateString("de-AT")}
                  </p>
                </div>
                <Button size="sm" onClick={() => setActive(p)}>
                  Üben
                </Button>
                <button type="button" onClick={async () => { await deletePack(p.slug); setPacks(await listPacks()); }} aria-label={`${p.name} löschen`} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-bold text-navy">Pakete herunterladen</h2>
        {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => {
            const has = packs?.some((p) => p.slug === c.slug);
            return (
              <li key={c.slug}>
                <button
                  type="button"
                  disabled={!online || loading !== null}
                  onClick={() => void download(c.slug)}
                  className="glass glow-hover flex w-full items-center gap-3 rounded-2xl p-3 text-left text-sm disabled:opacity-50"
                >
                  {loading === c.slug ? <Loader2 className="size-5 animate-spin text-link" /> : <CloudDownload className="size-5 text-link" />}
                  <span className="flex-1 font-semibold text-navy">{c.name}</span>
                  {has && <span className="text-xs text-success">aktualisieren</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
