"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { ArrowRight, Check, GripVertical, MapPin, RotateCcw, Route, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { MapMarker } from "@/components/map/map-view";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { haptic, spring } from "@/lib/motion";
import { DISTRICT_NAMES, PLACES, ROUTES, type RouteTask } from "@/lib/ortskunde";
import { shuffle } from "@/lib/quiz-logic";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { getDistrictMasteryAction, submitDistrictGuessAction, submitPlaceGuessAction, submitRouteAction, type GuessResult } from "@/server/actions/ortskunde";

const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" aria-label="Karte wird geladen" />,
});

type Tab = "quiz" | "bezirke" | "routen";
type Task = { kind: "place"; key: string; label: string; sub: string } | { kind: "district"; no: number; label: string; sub: string };

function makeRound(): Task[] {
  const places = shuffle(PLACES).slice(0, 3).map((p): Task => ({ kind: "place", key: p.key, label: p.name, sub: p.type }));
  const ds = shuffle(Object.keys(DISTRICT_NAMES).map(Number))
    .slice(0, 2)
    .map((no): Task => ({ kind: "district", no, label: `${no}. Bezirk – ${DISTRICT_NAMES[no]}`, sub: "Bezirk" }));
  return shuffle([...places, ...ds]);
}

/* ── „Wo liegt …?“ ───────────────────────────────────────── */
function PlaceQuiz() {
  const [round, setRound] = useState<Task[]>([]);
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<GuessResult | null>(null);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [pending, start] = useTransition();
  useEffect(() => setRound(makeRound()), []);
  const task = round[i];
  const done = round.length > 0 && i >= round.length;

  const onPick = useCallback(
    (coord: [number, number]) => {
      if (!task || result || pending) return;
      haptic();
      setGuess(coord);
      start(async () => {
        const r = task.kind === "place" ? await submitPlaceGuessAction({ key: task.key, lon: coord[0], lat: coord[1] }) : await submitDistrictGuessAction({ no: task.no, lon: coord[0], lat: coord[1] });
        setResult(r);
        setPoints((p) => p + r.score);
        if (r.correct) {
          setCorrectCount((c) => c + 1);
          playSound("correct");
          void fireConfetti({ particleCount: 40, spread: 55 });
        } else playSound("wrong");
      });
    },
    [task, result, pending],
  );

  const next = () => {
    setGuess(null);
    setResult(null);
    setI((n) => n + 1);
  };
  const restart = () => {
    setRound(makeRound());
    setI(0);
    setPoints(0);
    setCorrectCount(0);
    setGuess(null);
    setResult(null);
  };

  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = [];
    if (guess) m.push({ coord: guess, color: result ? (result.correct ? "#22c55e" : "#ef4444") : "#ffc400", label: "Dein Tipp" });
    if (result?.target) m.push({ coord: result.target, color: "#22c55e", label: "Richtiger Ort" });
    return m;
  }, [guess, result]);

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" className="glass rounded-2xl p-5 text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <p className="text-4xl">🗺️</p>
            <p className="mt-2 font-display text-xl font-bold text-navy">
              <AnimatedNumber value={points} /> Punkte
            </p>
            <p className="text-sm text-muted-foreground">
              {correctCount} von {round.length} richtig
            </p>
            <Button className="mt-4" onClick={restart}>
              <RotateCcw /> Neue Runde
            </Button>
          </motion.div>
        ) : task ? (
          <motion.div key={i} className="glass flex items-center gap-3 rounded-2xl p-4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={spring}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-link">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tracking-wider text-link uppercase">
                Wo liegt … · {i + 1}/{round.length}
              </p>
              <p className="truncate font-display text-lg font-bold text-navy">{task.label}?</p>
              <p className="text-xs text-muted-foreground">{result ? (result.correct ? "Richtig!" : "Leider daneben") : `${task.sub} – tippe auf die Karte`}</p>
            </div>
            <span className="font-display text-sm font-bold text-navy tabular-nums">
              <AnimatedNumber value={points} /> P
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative h-[52svh] min-h-[320px] overflow-hidden rounded-2xl border border-border">
        <MapView
          onPick={done ? undefined : onPick}
          markers={markers}
          line={result?.target && guess ? [guess, result.target] : null}
          highlightDistrict={result && task?.kind === "district" ? task.no : null}
          className="h-full w-full"
        />
      </div>

      <AnimatePresence>
        {result && task && (
          <motion.div className={cn("flex items-center gap-3 rounded-2xl p-4 text-white", result.correct ? "bg-success" : "bg-destructive")} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} aria-live="polite">
            {result.correct ? <Check className="size-6 shrink-0" /> : <X className="size-6 shrink-0" />}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold">{result.correct ? `Richtig! +${result.score} Punkte` : "Leider daneben"}</p>
              <p className="text-white/90">
                {result.distance !== null
                  ? `${result.distance.toLocaleString("de-AT")} m vom Ziel entfernt${result.tappedDistrict ? ` · getippt: ${result.tappedDistrict}. Bezirk` : ""}`
                  : result.tappedDistrict
                    ? `Du hast den ${result.tappedDistrict}. Bezirk (${DISTRICT_NAMES[result.tappedDistrict]}) getippt.`
                    : "Das liegt außerhalb von Wien."}
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-white/30 bg-white/15 text-white" onClick={next}>
              Weiter <ArrowRight />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Bezirks-Heatmap ─────────────────────────────────────── */
function DistrictHeatmap() {
  const [heat, setHeat] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    void getDistrictMasteryAction().then(setHeat);
  }, []);
  const mastered = Object.values(heat).filter((v) => v >= 80).length;
  return (
    <div className="space-y-3">
      <div className="glass flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl p-4 text-sm">
        <span className="font-bold text-navy">
          <AnimatedNumber value={mastered} /> von 23 Bezirken gemeistert
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-3 rounded bg-destructive/60" /> schwach
          <span className="ml-2 size-3 rounded bg-primary/70" /> mittel
          <span className="ml-2 size-3 rounded bg-success/70" /> gemeistert
        </span>
      </div>
      <div className="relative h-[55svh] min-h-[320px] overflow-hidden rounded-2xl border border-border">
        <MapView heat={heat} highlightDistrict={selected} onDistrictClick={(no) => setSelected(no)} className="h-full w-full" />
        <AnimatePresence>
          {selected && (
            <motion.div className="glass absolute inset-x-3 bottom-3 rounded-2xl bg-card-solid/90 p-3 text-sm" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
              <p className="font-bold text-navy">
                {selected}. Bezirk – {DISTRICT_NAMES[selected]}
              </p>
              <p className="text-muted-foreground">{heat[selected] === undefined ? "Noch nicht geübt – spiele „Wo liegt …?“" : `Beherrschung: ${heat[selected]} % (letzte 5 Versuche)`}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-xs text-muted-foreground">Bezirke leuchten auf, sobald du ihre Orte und Lage sicher findest.</p>
    </div>
  );
}

/* ── Routen-Trainer ──────────────────────────────────────── */
function RouteTrainer() {
  const [taskIdx, setTaskIdx] = useState(0);
  const task: RouteTask = ROUTES[taskIdx];
  const [order, setOrder] = useState<string[]>([]);
  const [result, setResult] = useState<{ correct: boolean; firstWrong: number; solution: string[] } | null>(null);
  const [drive, setDrive] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    let o = shuffle(task.segments.map((s) => s.name));
    if (o.join() === task.segments.map((s) => s.name).join()) o = [...o].reverse();
    setOrder(o);
    setResult(null);
  }, [task]);

  const path = useMemo(() => task.segments.flatMap((s, i) => (i === 0 ? s.path : s.path.slice(1))), [task]);

  const check = () => {
    start(async () => {
      const r = await submitRouteAction({ id: task.id, order });
      setResult(r);
      if (r.correct) {
        playSound("levelUp");
        void fireConfetti({ particleCount: 60, spread: 70 });
      } else playSound("wrong");
      setDrive((d) => d + 1);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {ROUTES.map((r, idx) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setTaskIdx(idx)}
              className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition", idx === taskIdx ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground/80 hover:border-primary/50")}
            >
              {r.from} → {r.to}
            </button>
          ))}
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-link uppercase">
            <Route className="size-4" /> Routen-Trainer
          </p>
          <h3 className="mt-1 font-display text-lg font-bold text-navy">{task.title}</h3>
          <p className="text-sm text-muted-foreground">Bring die Straßenabschnitte mit dem Auto in die richtige Reihenfolge. Tipp: {task.hint}</p>
          <Reorder.Group axis="y" values={order} onReorder={(o) => !result && setOrder(o)} className="mt-4 space-y-2" aria-label="Straßenabschnitte sortieren">
            {order.map((name, idx) => {
              const state = result ? (result.solution[idx] === name ? "ok" : "bad") : "idle";
              return (
                <Reorder.Item
                  key={name}
                  value={name}
                  dragListener={!result}
                  whileDrag={{ scale: 1.03, boxShadow: "0 12px 30px -10px var(--glow)" }}
                  className={cn(
                    "flex cursor-grab items-center gap-3 rounded-xl border-2 bg-card-solid px-3 py-2.5 text-sm font-semibold active:cursor-grabbing",
                    state === "idle" && "border-border",
                    state === "ok" && "border-success bg-success/12",
                    state === "bad" && "border-destructive bg-destructive/12",
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-bold text-link">{idx + 1}</span>
                  <span className="flex-1 text-navy">{name}</span>
                  {!result && <GripVertical className="size-4 text-muted-foreground" aria-hidden />}
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
          {result ? (
            <div className="mt-4 space-y-2" aria-live="polite">
              <p className={cn("font-bold", result.correct ? "text-success" : "text-destructive")}>{result.correct ? "Perfekte Route! +15 XP" : `Nicht ganz – richtig wäre: ${result.solution.join(" → ")}`}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setOrder(shuffle(task.segments.map((s) => s.name)));
                }}
              >
                <RotateCcw /> Nochmal
              </Button>
            </div>
          ) : (
            <Button className="mt-4 w-full" onClick={check} disabled={pending}>
              Route prüfen
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Übungsrouten zur Ringstraße (Kfz-Verkehr als Einbahn im Uhrzeigersinn). Kartenverlauf schematisch.</p>
      </div>
      <div className="relative h-[46svh] min-h-[300px] overflow-hidden rounded-2xl border border-border lg:h-auto">
        <MapView focus="ring" route={result ? path : null} routeKey={`${task.id}-${drive}`} markers={[{ coord: path[0], color: "#ffc400", label: task.from }, { coord: path[path.length - 1], color: "#22c55e", label: task.to }]} className="h-full w-full" />
      </div>
    </div>
  );
}

export function OrtskundeTrainer() {
  const [tab, setTab] = useState<Tab>("quiz");
  const tabs: { id: Tab; label: string }[] = [
    { id: "quiz", label: "Wo liegt …?" },
    { id: "bezirke", label: "Bezirke" },
    { id: "routen", label: "Routen" },
  ];
  return (
    <div className="space-y-4">
      <div className="glass inline-flex rounded-2xl p-1" role="tablist" aria-label="Ortskunde-Modus">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              haptic();
              setTab(t.id);
            }}
            className={cn("relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors", tab === t.id ? "text-primary-foreground" : "text-foreground/70")}
          >
            {tab === t.id && <motion.span layoutId="ortskunde-tab" className="absolute inset-0 rounded-xl bg-primary" transition={spring} />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>
      {tab === "quiz" && <PlaceQuiz />}
      {tab === "bezirke" && <DistrictHeatmap />}
      {tab === "routen" && <RouteTrainer />}
    </div>
  );
}
