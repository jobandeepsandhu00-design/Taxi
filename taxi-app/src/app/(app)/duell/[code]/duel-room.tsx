"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Share2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { haptic, spring } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { cancelDuelAction, getDuelStateAction, joinDuelAction, submitDuelAnswerAction, type DuelPlayer, type DuelState } from "@/server/actions/duel";

function PlayerBar({ p, total, side, live }: { p: DuelPlayer; total: number; side: "left" | "right"; live?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", side === "right" && "flex-row-reverse text-right")}>
      <span className="text-2xl">{p.avatar}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-navy">
          {p.name} {live && <span className="text-[10px] text-link">● live</span>}
        </p>
        <div className="mt-1 flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <motion.span key={i} className={cn("h-1.5 flex-1 rounded-full", i < p.answered ? "bg-primary" : "bg-foreground/10")} animate={i < p.answered ? { scaleY: [1, 1.8, 1] } : undefined} transition={{ duration: 0.4 }} />
          ))}
        </div>
      </div>
      <span className="font-display text-lg font-bold text-navy tabular-nums">{p.correct}</span>
    </div>
  );
}

/** VS-Intro: Avatare gleiten von beiden Seiten herein, „VS“ ploppt auf, Countdown. */
function VsIntro({ host, guest, seconds }: { host: DuelPlayer; guest: DuelPlayer; seconds: number }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-night/95 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-primary/25 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-tram/25 to-transparent" />
      <div className="relative flex w-full max-w-lg items-center justify-between px-6">
        <motion.div className="flex flex-col items-center gap-2" initial={{ x: -200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}>
          <span className="flex size-24 items-center justify-center rounded-full bg-primary/20 text-6xl ring-4 ring-primary">{host.avatar}</span>
          <span className="font-display text-lg font-bold text-white">{host.name}</span>
        </motion.div>
        <motion.span className="font-display text-6xl font-black text-primary [text-shadow:0_0_40px_var(--glow)]" initial={{ scale: 0, rotate: -30 }} animate={{ scale: [0, 1.4, 1], rotate: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
          VS
        </motion.span>
        <motion.div className="flex flex-col items-center gap-2" initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}>
          <span className="flex size-24 items-center justify-center rounded-full bg-tram/20 text-6xl ring-4 ring-tram">{guest.avatar}</span>
          <span className="font-display text-lg font-bold text-white">{guest.name}</span>
        </motion.div>
      </div>
      <AnimatePresence mode="popLayout">
        <motion.p key={seconds} className="relative mt-12 font-display text-7xl font-bold text-white" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
          {seconds > 0 ? seconds : "Los!"}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

export function DuelRoom({ initial }: { initial: DuelState }) {
  const [state, setState] = useState<DuelState>(initial);
  const [index, setIndex] = useState(initial.myAnswers.length);
  const [selected, setSelected] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ isCorrect: boolean; correctOptionIds: string[] } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const startsAt = useRef<number | null>(initial.startsInMs !== null ? Date.now() + initial.startsInMs : null);
  const questionStart = useRef(Date.now());
  const celebrated = useRef(false);

  // Polling (ca. alle 1,5 s) – hält Gegner-Fortschritt und Status aktuell
  const poll = useCallback(async () => {
    const s = await getDuelStateAction(initial.code);
    if (!s) return;
    if (s.startsInMs !== null && startsAt.current === null) startsAt.current = Date.now() + s.startsInMs;
    setState(s);
  }, [initial.code]);

  useEffect(() => {
    if (state.status === "FINISHED" || state.status === "CANCELLED") return;
    const id = window.setInterval(poll, 1500);
    return () => window.clearInterval(id);
  }, [poll, state.status]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const msLeft = startsAt.current ? startsAt.current - now : 0;
  const inIntro = state.status === "ACTIVE" && msLeft > 0;
  const introSeconds = Math.ceil(msLeft / 1000) - 1;

  useEffect(() => {
    if (!inIntro) questionStart.current = Date.now();
  }, [inIntro, index]);

  const myPlayer = state.me === "guest" ? state.guest : state.host;
  const opponent = state.me === "guest" ? state.host : state.guest;
  const iWon = state.winner && state.winner !== "draw" && state.winner === state.me;

  useEffect(() => {
    if (state.status === "FINISHED" && !celebrated.current) {
      celebrated.current = true;
      if (iWon) {
        playSound("levelUp");
        void fireConfetti({ particleCount: 160, spread: 110 });
      } else playSound("streak");
    }
  }, [state.status, iWon]);

  const answer = async (optionId: string) => {
    if (selected || !state.questions) return;
    haptic();
    setSelected(optionId);
    const res = await submitDuelAnswerAction({ code: state.code, index, selectedOptionIds: [optionId], timeMs: Date.now() - questionStart.current });
    if ("error" in res) {
      setSelected(null);
      return;
    }
    setReveal(res);
    playSound(res.isCorrect ? "correct" : "wrong");
    window.setTimeout(() => {
      setReveal(null);
      setSelected(null);
      setIndex((i) => i + 1);
      void poll();
    }, 1100);
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/duell/${state.code}` : "";

  /* ── Zuschauer / noch nicht beigetreten ── */
  if (!state.me) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <p className="text-5xl">⚔️</p>
        <h1 className="text-2xl font-bold text-navy">Duell {state.code}</h1>
        {state.status === "WAITING" ? (
          <>
            <p className="text-muted-foreground">{state.host.name} fordert dich heraus!</p>
            <form action={joinDuelAction}>
              <input type="hidden" name="code" value={state.code} />
              <Button type="submit" size="lg">
                Herausforderung annehmen
              </Button>
            </form>
          </>
        ) : (
          <p className="text-muted-foreground">Dieses Duell ist bereits voll oder beendet.</p>
        )}
      </div>
    );
  }

  /* ── Warten auf Gegner ── */
  if (state.status === "WAITING") {
    return (
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="relative mx-auto flex size-40 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="absolute inset-0 rounded-full border-2 border-primary" animate={{ scale: [0.4, 1.4], opacity: [0.8, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }} />
          ))}
          <span className="text-6xl">{state.host.avatar}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-navy">Warte auf deinen Gegner …</h1>
          <p className="mt-1 text-sm text-muted-foreground">Teile den Code oder Link. Das Duell startet automatisch.</p>
        </div>
        <p className="font-display text-5xl font-bold tracking-[0.25em] text-primary">{state.code}</p>
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard?.writeText(shareUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? "Kopiert" : "Link kopieren"}
          </Button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button onClick={() => navigator.share({ title: "TaxiFit-Duell", text: `Duell mich! Code: ${state.code}`, url: shareUrl }).catch(() => {})}>
              <Share2 /> Teilen
            </Button>
          )}
        </div>
        <form action={() => cancelDuelAction(state.code)}>
          <Button type="submit" variant="ghost" size="sm">
            Duell abbrechen
          </Button>
        </form>
      </div>
    );
  }

  /* ── Ergebnis ── */
  if (state.status === "FINISHED" && state.guest) {
    return (
      <div className="mx-auto max-w-md space-y-6 text-center">
        <motion.p className="text-7xl" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 12 }}>
          {state.winner === "draw" ? "🤝" : iWon ? "🏆" : "🚕💨"}
        </motion.p>
        <h1 className="text-3xl font-bold text-navy">{state.winner === "draw" ? "Unentschieden!" : iWon ? "Du hast gewonnen!" : "Knapp verloren"}</h1>
        <div className="glass grid grid-cols-2 gap-3 rounded-2xl p-4">
          {[state.host, state.guest].map((p, i) => (
            <div key={i} className={cn("rounded-xl p-3", state.winner === (i === 0 ? "host" : "guest") && "bg-primary/12 ring-1 ring-primary/40")}>
              <p className="text-3xl">{p.avatar}</p>
              <p className="truncate text-sm font-bold text-navy">{p.name}</p>
              <p className="font-display text-3xl font-bold text-navy">
                {p.correct}/{state.total}
              </p>
              <p className="text-xs text-muted-foreground">{(p.timeMs / 1000).toFixed(1)} s</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">+{iWon ? 30 : 15} XP</p>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link href="/duell">Neues Duell</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Zur Übersicht</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── Spiel ── */
  const q = state.questions?.[index];
  const finishedMine = index >= state.total;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <AnimatePresence>{inIntro && state.guest && <VsIntro host={state.host} guest={state.guest} seconds={introSeconds} />}</AnimatePresence>
      <div className="glass grid grid-cols-2 gap-4 rounded-2xl p-3">
        {myPlayer && <PlayerBar p={myPlayer} total={state.total} side="left" />}
        {opponent && <PlayerBar p={opponent} total={state.total} side="right" live />}
      </div>
      {finishedMine ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-4xl">⏳</p>
          <p className="mt-2 font-bold text-navy">Fertig! Warte auf {opponent?.name} …</p>
          <p className="text-sm text-muted-foreground">
            {opponent?.answered ?? 0} von {state.total} beantwortet
          </p>
        </div>
      ) : q ? (
        <AnimatePresence mode="wait">
          <motion.div key={index} className="glass rounded-2xl p-5 sm:p-6" initial={{ opacity: 0, x: 60, rotateY: 15 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} exit={{ opacity: 0, x: -60 }} transition={spring} style={{ transformPerspective: 1200 }}>
            <p className="text-xs font-bold tracking-wider text-link uppercase">
              Frage {index + 1} von {state.total}
            </p>
            <h2 className="mt-2 text-lg leading-relaxed font-bold text-navy">{q.text}</h2>
            {q.multipleCorrect && <p className="mt-1 text-xs text-muted-foreground">Im Duell zählt eine Antwort – wähle die beste.</p>}
            <div className="mt-4 space-y-2.5">
              {q.options.map((o, i) => {
                const isSel = selected === o.id;
                const isRight = reveal?.correctOptionIds.includes(o.id);
                return (
                  <motion.button
                    key={o.id}
                    type="button"
                    disabled={Boolean(selected)}
                    onClick={() => void answer(o.id)}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: 0.08 + i * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left text-[15px] transition-colors",
                      !reveal && !isSel && "border-border bg-white/[0.02] hover:border-primary/50",
                      !reveal && isSel && "border-primary bg-primary/10",
                      reveal && isRight && "border-success bg-success/12",
                      reveal && isSel && !isRight && "border-destructive bg-destructive/12",
                      reveal && !isSel && !isRight && "border-border opacity-50",
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/8 font-display text-sm font-bold">
                      {reveal && isRight ? <Check className="size-4 text-success" /> : reveal && isSel ? <X className="size-4 text-destructive" /> : o.label}
                    </span>
                    <span className="flex-1 pt-0.5 whitespace-pre-line">{o.text}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      ) : null}
    </div>
  );
}
