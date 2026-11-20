"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion, Reorder, useAnimationControls, useDragControls, type LegacyAnimationControls } from "motion/react";
import { ArrowDown, ArrowUp, Check, ChevronLeft, Crown, Eye, GripVertical, Lock, MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { haptic, spring } from "@/lib/motion";
import { gapIndexes, isMastered, LEVELS, routeUnits, type Unit } from "@/lib/route-stages";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { completeRouteLevelAction } from "@/server/actions/routes";
import type { RouteProgressView } from "@/server/routes";

const MapView = dynamic(() => import("@/components/map/map-view"), { ssr: false, loading: () => <div className="skeleton h-full w-full" aria-label="Karte wird geladen" /> });

interface RouteData {
  id: string;
  slug: string;
  fromName: string;
  toName: string;
  streets: string[];
  path: [number, number][][];
  verified: boolean;
}

function shuffle<T>(a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

function bbox(path: [number, number][][]): [[number, number], [number, number]] {
  const pts = path.flat();
  const lng = pts.map((p) => p[0]);
  const lat = pts.map((p) => p[1]);
  const pad = 0.004;
  return [
    [Math.min(...lng) - pad, Math.min(...lat) - pad],
    [Math.max(...lng) + pad, Math.max(...lat) + pad],
  ];
}

/** Straßen-Chip mit Wackeln bei falscher Position */
function useShake() {
  const c = useAnimationControls();
  return { controls: c, shake: () => void c.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } }) };
}

export function RouteTrainer({ route, initialProgress, otherStreets }: { route: RouteData; initialProgress: RouteProgressView[]; otherStreets: string[] }) {
  const units = useMemo(() => routeUnits(route.streets), [route.streets]);
  const [progress, setProgress] = useState<Record<number, RouteProgressView>>(() => Object.fromEntries(initialProgress.map((p) => [p.stageIndex, p])));
  const lvl = (k: number) => progress[k]?.level ?? 0;
  const unitUnlocked = (k: number) => k === 0 || lvl(k - 1) >= 4;
  const levelUnlocked = (k: number, L: number) => unitUnlocked(k) && lvl(k) >= L - 1;
  const firstOpen = (() => {
    for (const u of units) for (const L of [1, 2, 3, 4]) if (levelUnlocked(u.stageIndex, L) && lvl(u.stageIndex) < L) return { k: u.stageIndex, L };
    return { k: units.length - 1, L: 4 };
  })();
  const [active, setActive] = useState(firstOpen);
  const [round, setRound] = useState(0);
  const [success, setSuccess] = useState<{ xp: number; mastered: boolean } | null>(null);
  const [filled, setFilled] = useState(0);
  const unit = units[active.k];
  const full = units[units.length - 1];
  const fullMastered = isMastered(progress[full.stageIndex]?.fullCorrectDays ?? []);

  const segs = route.path.slice(unit.start, unit.end);
  const mapRoute = useMemo(() => {
    const n = active.L === 1 || success ? segs.length : filled;
    const pts = segs.slice(0, n).flat();
    return pts.length >= 2 ? (pts as [number, number][]) : null;
  }, [segs, filled, active.L, success]);

  async function complete() {
    const res = await completeRouteLevelAction({ routeId: route.id, stageIndex: active.k, level: active.L }).catch(() => null);
    playSound(active.L === 4 ? "levelUp" : "correct");
    if (unit.full && active.L === 4) void fireConfetti({ particleCount: 130, spread: 100 });
    if (res?.ok) {
      setProgress((p) => ({
        ...p,
        [active.k]: {
          stageIndex: active.k,
          level: res.level,
          mastered: res.mastered,
          fullCorrectDays: unit.full && active.L === 4 ? Array.from(new Set([...(p[active.k]?.fullCorrectDays ?? []), new Date().toISOString().slice(0, 10)])) : (p[active.k]?.fullCorrectDays ?? []),
        },
      }));
    }
    setSuccess({ xp: res?.xp ?? 0, mastered: res?.mastered ?? false });
  }

  function go(k: number, L: number) {
    if (!levelUnlocked(k, L)) return;
    haptic();
    setActive({ k, L });
    setSuccess(null);
    setFilled(0);
    setRound((r) => r + 1);
  }

  function nextStep() {
    const order = units.flatMap((u) => [1, 2, 3, 4].map((L) => ({ k: u.stageIndex, L })));
    const idx = order.findIndex((o) => o.k === active.k && o.L === active.L);
    const nxt = order[idx + 1];
    if (nxt) go(nxt.k, nxt.L);
    else {
      setSuccess(null);
      setFilled(0);
      setRound((r) => r + 1);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/ortskunde/routen" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-navy">
        <ChevronLeft className="size-4" /> Alle Routen
      </Link>

      {/* Start und Ziel – immer sichtbar */}
      <div className="glass sticky top-16 z-20 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm lg:top-4">
        <MapPin className="size-4 shrink-0 text-link" />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-muted-foreground">Von:</span> <strong className="text-navy">{route.fromName}</strong> <span className="text-muted-foreground">→ Nach:</span> <strong className="text-navy">{route.toName}</strong>
        </span>
        {!route.verified && <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[10px] font-bold text-warning">Ungeprüft</span>}
        {fullMastered && <Crown className="size-4 text-success" aria-label="Route gemeistert" />}
      </div>

      {/* Einheiten + Stufen */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {units.map((u) => (
          <div key={u.stageIndex} className={cn("glass shrink-0 rounded-2xl p-2", active.k === u.stageIndex && "ring-2 ring-primary")}>
            <p className="px-1 pb-1.5 text-xs font-bold text-navy">
              {u.label}
              <span className="font-normal text-muted-foreground"> · {u.streets.length} Straßen</span>
            </p>
            <div className="flex gap-1">
              {LEVELS.map((l) => {
                const open = levelUnlocked(u.stageIndex, l.level);
                const done = lvl(u.stageIndex) >= l.level;
                const isActive = active.k === u.stageIndex && active.L === l.level;
                return (
                  <button
                    key={l.level}
                    type="button"
                    disabled={!open}
                    onClick={() => go(u.stageIndex, l.level)}
                    aria-label={`${u.label}, Stufe ${l.level}: ${l.name}${done ? " – erledigt" : open ? "" : " – gesperrt"}`}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl text-sm font-bold transition",
                      isActive ? "bg-primary text-primary-foreground" : done ? "bg-success/15 text-success" : open ? "bg-muted text-navy" : "bg-muted text-muted-foreground opacity-60",
                    )}
                  >
                    {done && !isActive ? <Check className="size-4" /> : !open ? <Lock className="size-3.5" /> : l.level}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl p-4 sm:p-5">
        <p className="text-xs font-bold tracking-wider text-link uppercase">
          {unit.label} · Stufe {active.L} „{LEVELS[active.L - 1].name}“
        </p>
        <p className="mb-4 text-sm text-muted-foreground">{LEVELS[active.L - 1].desc}</p>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="ok" className="space-y-3 py-4 text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={spring} aria-live="polite" data-testid="route-success">
              <motion.span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success text-white" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                {success.mastered ? <Crown className="size-8" /> : <Check className="size-8" />}
              </motion.span>
              <p className="font-display text-xl font-bold text-navy">{success.mastered ? "Route gemeistert! 👑" : unit.full && active.L === 4 ? "Ganze Route geschafft! 🎉" : "Geschafft!"}</p>
              {unit.full && active.L === 4 && !success.mastered && <p className="text-sm text-muted-foreground">Schaff die ganze Route an einem zweiten Tag, dann gilt sie als gemeistert.</p>}
              {success.xp > 0 && (
                <p className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">
                  <Sparkles className="size-4" /> +{success.xp} XP
                </p>
              )}
              <div className="flex justify-center">
                <Button size="lg" onClick={nextStep}>
                  {unit.full && active.L === 4 ? "Nochmal üben" : "Weiter"}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key={`${active.k}-${active.L}-${round}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={spring}>
              {active.L === 1 && <ViewLevel unit={unit} onDone={() => void complete()} />}
              {active.L === 2 && <OneGapLevel unit={unit} distractorPool={[...otherStreets, ...route.streets.filter((s) => !unit.streets.includes(s))]} onFilled={setFilled} onDone={() => void complete()} />}
              {active.L === 3 && <MultiGapLevel unit={unit} onFilled={setFilled} onDone={() => void complete()} />}
              {active.L === 4 && <OrderLevel unit={unit} onFilled={setFilled} onDone={() => void complete()} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="glass h-64 overflow-hidden rounded-3xl sm:h-80">
        <MapView
          fitTo={bbox(segs)}
          route={mapRoute}
          routeKey={`${active.k}-${active.L}-${round}-${mapRoute?.length ?? 0}`}
          markers={[
            { coord: segs[0][0], color: "#2563eb", label: unit.start === 0 ? route.fromName : unit.streets[0] },
            { coord: segs[segs.length - 1][segs[segs.length - 1].length - 1], color: "#16a34a", label: unit.end === route.streets.length ? route.toName : unit.streets[unit.streets.length - 1] },
          ]}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

function StreetList({ streets, render }: { streets: string[]; render: (s: string, i: number) => React.ReactNode }) {
  return (
    <ol className="relative space-y-2 pl-7">
      <span className="absolute top-3 bottom-3 left-[11px] w-0.5 rounded-full bg-gradient-to-b from-primary to-success" aria-hidden />
      {streets.map((s, i) => (
        <li key={`${s}-${i}`} className="relative">
          <span className="absolute top-1/2 -left-7 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-card text-[11px] font-bold text-navy ring-2 ring-primary">{i + 1}</span>
          {render(s, i)}
        </li>
      ))}
    </ol>
  );
}

function ViewLevel({ unit, onDone }: { unit: Unit; onDone: () => void }) {
  return (
    <div className="space-y-4">
      <StreetList
        streets={unit.streets}
        render={(s, i) => (
          <motion.div className="rounded-xl bg-muted px-3 py-2.5 font-semibold text-navy" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: i * 0.12 }}>
            {s}
          </motion.div>
        )}
      />
      <Button size="lg" className="w-full" onClick={onDone}>
        <Eye /> Angeschaut – weiter
      </Button>
    </div>
  );
}

function OneGapLevel({ unit, distractorPool, onFilled, onDone }: { unit: Unit; distractorPool: string[]; onFilled: (n: number) => void; onDone: () => void }) {
  const [gap] = useState(() => Math.floor(Math.random() * unit.streets.length));
  const answer = unit.streets[gap];
  const [chips] = useState(() => shuffle([answer, ...shuffle(Array.from(new Set(distractorPool.filter((s) => !unit.streets.includes(s))))).slice(0, 3)]));
  const [placed, setPlaced] = useState(false);
  const [glow, setGlow] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  useEffect(() => onFilled(gap), [gap, onFilled]);

  function pick(c: string) {
    if (placed) return;
    if (c === answer) {
      haptic();
      setPlaced(true);
      onFilled(unit.streets.length);
      window.setTimeout(onDone, 700);
    } else {
      haptic(30);
      playSound("wrong");
      setWrong(c);
      setGlow(true);
      window.setTimeout(() => setGlow(false), 900);
      window.setTimeout(() => setWrong(null), 450);
    }
  }

  return (
    <div className="space-y-4">
      <StreetList
        streets={unit.streets}
        render={(s, i) =>
          i === gap ? (
            <motion.div
              className={cn("flex min-h-11 items-center rounded-xl border-2 border-dashed px-3 py-2 font-semibold", placed ? "border-success bg-success/12 text-success" : "border-primary/60 text-muted-foreground", glow && "shadow-[0_0_0_4px_var(--glow)]")}
              animate={glow ? { scale: [1, 1.03, 1] } : {}}
            >
              {placed ? (
                <motion.span layoutId={`chip-${answer}`} transition={spring}>
                  {answer}
                </motion.span>
              ) : (
                "?"
              )}
            </motion.div>
          ) : (
            <div className="rounded-xl bg-muted px-3 py-2.5 font-semibold text-navy">{s}</div>
          )
        }
      />
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Welche Straße fehlt?">
        {chips.map((c) =>
          placed && c === answer ? (
            <span key={c} className="min-h-12" />
          ) : (
            <motion.button
              key={c}
              layoutId={`chip-${c}`}
              type="button"
              onClick={() => pick(c)}
              animate={wrong === c ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
              transition={wrong === c ? { duration: 0.4 } : spring}
              whileTap={{ scale: 0.95 }}
              className="min-h-12 rounded-xl border-2 border-border bg-card px-3 text-sm font-semibold text-navy"
            >
              {c}
            </motion.button>
          ),
        )}
      </div>
    </div>
  );
}

function MultiGapLevel({ unit, onFilled, onDone }: { unit: Unit; onFilled: (n: number) => void; onDone: () => void }) {
  const [gaps] = useState(() => gapIndexes(unit.streets.length));
  const [filledSlots, setFilledSlots] = useState<Record<number, string>>({});
  const [pool, setPool] = useState(() => shuffle(gaps.map((g) => unit.streets[g])));
  const [selected, setSelected] = useState<string | null>(null);
  const [glowSlot, setGlowSlot] = useState<number | null>(null);
  const [shaking, setShaking] = useState<string | null>(null);

  const contiguous = (() => {
    let n = 0;
    while (n < unit.streets.length && (!gaps.includes(n) || filledSlots[n])) n++;
    return n;
  })();
  useEffect(() => onFilled(contiguous), [contiguous, onFilled]);

  function place(chip: string, slot: number) {
    if (unit.streets[slot] === chip && !filledSlots[slot]) {
      haptic();
      const next = { ...filledSlots, [slot]: chip };
      setFilledSlots(next);
      setPool((p) => p.filter((x) => x !== chip));
      setSelected(null);
      if (Object.keys(next).length === gaps.length) window.setTimeout(onDone, 700);
    } else {
      haptic(30);
      playSound("wrong");
      setShaking(chip);
      const correct = unit.streets.findIndex((s, i) => s === chip && gaps.includes(i) && !filledSlots[i]);
      setGlowSlot(correct);
      window.setTimeout(() => setShaking(null), 450);
      window.setTimeout(() => setGlowSlot(null), 1000);
    }
  }

  function dropAt(chip: string, x: number, y: number) {
    const el = document.elementsFromPoint(x, y).find((e) => (e as HTMLElement).dataset?.gap !== undefined) as HTMLElement | undefined;
    if (el) place(chip, Number(el.dataset.gap));
  }

  return (
    <div className="space-y-4">
      <StreetList
        streets={unit.streets}
        render={(s, i) =>
          gaps.includes(i) ? (
            <motion.button
              type="button"
              data-gap={i}
              onClick={() => selected && place(selected, i)}
              aria-label={filledSlots[i] ? `Lücke ${i + 1}: ${filledSlots[i]}` : `Lücke ${i + 1}${selected ? ` – „${selected}“ hier einsetzen` : ""}`}
              className={cn(
                "flex min-h-11 w-full items-center rounded-xl border-2 border-dashed px-3 py-2 text-left font-semibold transition-shadow",
                filledSlots[i] ? "border-success bg-success/12 text-success" : selected ? "border-primary bg-primary/8 text-muted-foreground" : "border-primary/50 text-muted-foreground",
                glowSlot === i && "shadow-[0_0_0_4px_var(--glow)]",
              )}
              animate={glowSlot === i ? { scale: [1, 1.03, 1] } : {}}
            >
              {filledSlots[i] ? (
                <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                  {filledSlots[i]}
                </motion.span>
              ) : (
                "Lücke"
              )}
            </motion.button>
          ) : (
            <div className="rounded-xl bg-muted px-3 py-2.5 font-semibold text-navy">{s}</div>
          )
        }
      />
      <p className="text-xs text-muted-foreground">Ziehe eine Straße in ihre Lücke – oder tippe erst die Straße, dann die Lücke.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Fehlende Straßen">
        {pool.map((c) => (
          <motion.button
            key={c}
            type="button"
            drag
            dragSnapToOrigin
            dragElastic={0.6}
            whileDrag={{ scale: 1.06, zIndex: 40, boxShadow: "0 12px 30px -10px var(--glow)" }}
            onDragEnd={(e) => {
              const pe = e as PointerEvent;
              dropAt(c, pe.clientX, pe.clientY);
            }}
            onClick={() => setSelected(selected === c ? null : c)}
            aria-pressed={selected === c}
            animate={shaking === c ? { x: [0, -10, 9, -6, 4, 0] } : {}}
            transition={shaking === c ? { duration: 0.4 } : spring}
            className={cn("min-h-12 touch-none rounded-xl border-2 bg-card px-3 text-sm font-semibold text-navy", selected === c ? "border-primary" : "border-border")}
          >
            {c}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function OrderLevel({ unit, onFilled, onDone }: { unit: Unit; onFilled: (n: number) => void; onDone: () => void }) {
  const [items, setItems] = useState(() => {
    let s = shuffle(unit.streets);
    for (let t = 0; t < 5 && s.every((x, i) => x === unit.streets[i]); t++) s = shuffle(unit.streets);
    return s;
  });
  const [checked, setChecked] = useState<boolean[] | null>(null);
  const shakeKey = useRef(0);
  const { controls, shake } = useShake();

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    setItems(n);
    setChecked(null);
  }

  function check() {
    const res = items.map((s, i) => s === unit.streets[i]);
    setChecked(res);
    let n = 0;
    while (n < res.length && res[n]) n++;
    onFilled(n);
    if (res.every(Boolean)) {
      haptic();
      window.setTimeout(onDone, 800);
    } else {
      haptic(30);
      playSound("wrong");
      shakeKey.current++;
      shake();
    }
  }

  return (
    <div className="space-y-4">
      <Reorder.Group axis="y" values={items} onReorder={(v) => { setItems(v); setChecked(null); }} className="space-y-2" aria-label="Straßen in die richtige Reihenfolge bringen">
        {items.map((s, i) => (
          <OrderItem key={s} street={s} index={i} count={items.length} state={checked ? (checked[i] ? "ok" : "bad") : null} shake={controls} onMove={move} />
        ))}
      </Reorder.Group>
      <p className="sr-only" aria-live="polite">
        {checked ? (checked.every(Boolean) ? "Alles richtig." : `${checked.filter((x) => !x).length} Straßen an falscher Position.`) : ""}
      </p>
      <Button size="lg" className="w-full" onClick={check}>
        <Check /> Reihenfolge prüfen
      </Button>
    </div>
  );
}

/** Ein Eintrag der Reihenfolge: Ziehen nur am Griff, Pfeil-Buttons für Tastatur/Screenreader. */
function OrderItem({ street, index, count, state, shake, onMove }: { street: string; index: number; count: number; state: "ok" | "bad" | null; shake: LegacyAnimationControls; onMove: (i: number, d: -1 | 1) => void }) {
  const drag = useDragControls();
  return (
    <Reorder.Item value={street} dragListener={false} dragControls={drag}>
      <motion.div
        animate={state === "bad" ? shake : undefined}
        className={cn(
          "flex min-h-12 items-center gap-2 rounded-xl border-2 bg-card pr-1 font-semibold",
          state === "ok" ? "border-success bg-success/12 text-success" : state === "bad" ? "border-destructive bg-destructive/8 text-destructive" : "border-border text-navy",
        )}
      >
        <span
          onPointerDown={(e) => drag.start(e)}
          className="flex h-12 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
          aria-hidden
        >
          <GripVertical className="size-4" />
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{index + 1}</span>
        <span className="flex-1">{street}</span>
        <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="flex size-10 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-30" aria-label={`${street} nach oben`}>
          <ArrowUp className="size-4" />
        </button>
        <button type="button" onClick={() => onMove(index, 1)} disabled={index === count - 1} className="flex size-10 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-30" aria-label={`${street} nach unten`}>
          <ArrowDown className="size-4" />
        </button>
      </motion.div>
    </Reorder.Item>
  );
}
