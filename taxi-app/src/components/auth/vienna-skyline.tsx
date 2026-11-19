"use client";

import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, useMemo } from "react";

/** Deterministischer Pseudo-Zufall, damit Server- und Client-Rendering übereinstimmen. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Block = { x: number; w: number; h: number };

function blocks(seed: number, minH: number, maxH: number, gap = 4): Block[] {
  const rnd = seeded(seed);
  const out: Block[] = [];
  let x = -20;
  while (x < 1460) {
    const w = 40 + Math.round(rnd() * 70);
    out.push({ x, w, h: Math.round(minH + rnd() * (maxH - minH)) });
    x += w + gap;
  }
  return out;
}

function Windows({ list, seed, color = "#ffc400", density = 0.22 }: { list: Block[]; seed: number; color?: string; density?: number }) {
  const rects = useMemo(() => {
    const rnd = seeded(seed);
    const out: { x: number; y: number; twinkle: boolean }[] = [];
    for (const b of list) {
      for (let wy = 520 - b.h + 14; wy < 505; wy += 16) {
        for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 12) {
          const r = rnd();
          if (r < density) out.push({ x: wx, y: wy, twinkle: r < density * 0.15 });
        }
      }
    }
    return out;
  }, [list, seed, density]);
  return (
    <g>
      {rects.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width={5} height={7} rx={1} fill={color} className={w.twinkle ? "window-twinkle" : undefined} opacity={0.75} />
      ))}
    </g>
  );
}

/** Parallax aus Maus- bzw. Geräteneigung (-1 … 1, gefedert). */
function useParallax() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 60, damping: 18 });
  const sy = useSpring(y, { stiffness: 60, damping: 18 });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMouse = (e: MouseEvent) => {
      x.set((e.clientX / window.innerWidth) * 2 - 1);
      y.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      x.set(Math.max(-1, Math.min(1, e.gamma / 30)));
      y.set(Math.max(-1, Math.min(1, (e.beta - 45) / 30)));
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, [x, y]);
  return { sx, sy };
}

function Layer({ depth, sx, sy, children }: { depth: number; sx: MotionValue<number>; sy: MotionValue<number>; children: React.ReactNode }) {
  const tx = useTransform(sx, (v) => v * -depth);
  const ty = useTransform(sy, (v) => v * -depth * 0.35);
  return (
    <motion.svg
      viewBox="0 0 1440 520"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-[-4%] bottom-0 h-full w-[108%]"
      style={{ x: tx, y: ty }}
      aria-hidden
    >
      {children}
    </motion.svg>
  );
}

/** Wiener Skyline bei Nacht in drei Tiefenebenen: Donauturm, Riesenrad, Karlskirche, Stephansdom. */
export function ViennaSkyline() {
  const { sx, sy } = useParallax();
  const far = useMemo(() => blocks(7, 70, 170), []);
  const mid = useMemo(() => blocks(42, 50, 120, 10), []);
  const near = useMemo(() => blocks(99, 30, 95, 6), []);
  const stars = useMemo(() => {
    const rnd = seeded(3);
    return Array.from({ length: 46 }, () => ({ x: rnd() * 1440, y: rnd() * 260, r: 0.6 + rnd() * 1.2, d: rnd() * 4 }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* Himmel, Mond und Sterne */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_0%,#1b2547_0%,#0e1424_55%,#0b0f1a_100%)]" />
      <Layer depth={4} sx={sx} sy={sy}>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" className="star-twinkle" style={{ animationDelay: `${s.d}s` }} />
        ))}
        <circle cx={1180} cy={92} r={70} fill="#ffe7a3" opacity={0.08} />
        <circle cx={1180} cy={92} r={30} fill="#fff4d1" />
        <circle cx={1192} cy={84} r={26} fill="#121a33" opacity={0.92} />
      </Layer>

      {/* Hinten: Häuser + Donauturm */}
      <Layer depth={8} sx={sx} sy={sy}>
        <g fill="#222c52">
          {far.map((b, i) => (
            <rect key={i} x={b.x} y={520 - b.h} width={b.w} height={b.h} />
          ))}
          {/* Donauturm */}
          <rect x={1036} y={190} width={12} height={330} />
          <ellipse cx={1042} cy={210} rx={30} ry={10} />
          <rect x={1022} y={196} width={40} height={16} rx={6} />
          <rect x={1040} y={120} width={4} height={76} />
        </g>
        <circle cx={1042} cy={118} r={3} fill="#e3000f" className="beacon-blink" />
        <Windows list={far} seed={11} color="#ffd666" density={0.12} />
      </Layer>

      {/* Mitte: Riesenrad + Karlskirche */}
      <Layer depth={16} sx={sx} sy={sy}>
        <g fill="#1a2343">
          {mid.map((b, i) => (
            <rect key={i} x={b.x} y={520 - b.h} width={b.w} height={b.h} />
          ))}
          {/* Karlskirche */}
          <rect x={760} y={410} width={150} height={110} />
          <path d="M790 412 A45 52 0 0 1 880 412 Z" />
          <rect x={828} y={340} width={14} height={24} />
          <path d="M835 318 L842 340 L828 340 Z" />
          <rect x={742} y={350} width={18} height={170} rx={3} />
          <rect x={910} y={350} width={18} height={170} rx={3} />
          <path d="M790 432 L835 404 L880 432 Z" />
        </g>
        {/* Riesenrad – Stützen */}
        <g stroke="#2a3866" strokeWidth={6} strokeLinecap="round">
          <line x1={300} y1={330} x2={248} y2={520} />
          <line x1={300} y1={330} x2={352} y2={520} />
        </g>
        <motion.g
          style={{ originX: "300px", originY: "330px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 90, ease: "linear", repeat: Infinity }}
        >
          <circle cx={300} cy={330} r={112} fill="none" stroke="#3a4c86" strokeWidth={4} />
          <circle cx={300} cy={330} r={100} fill="none" stroke="#2d3d6e" strokeWidth={2} />
          {Array.from({ length: 15 }, (_, i) => {
            const a = (i / 15) * Math.PI * 2;
            const gx = 300 + Math.cos(a) * 112;
            const gy = 330 + Math.sin(a) * 112;
            return (
              <g key={i}>
                <line x1={300} y1={330} x2={gx} y2={gy} stroke="#2d3d6e" strokeWidth={1.5} />
                <rect x={gx - 7} y={gy - 5} width={14} height={11} rx={3} fill="#e3000f" opacity={0.85} />
                <rect x={gx - 4} y={gy - 2} width={8} height={4} rx={1} fill="#ffd666" opacity={0.8} />
              </g>
            );
          })}
          <circle cx={300} cy={330} r={9} fill="#2a3866" />
        </motion.g>
        <Windows list={mid} seed={23} density={0.16} />
      </Layer>

      {/* Vorne: Stephansdom + Häuserzeile */}
      <Layer depth={28} sx={sx} sy={sy}>
        <g fill="#111831">
          {near.map((b, i) => (
            <rect key={i} x={b.x} y={520 - b.h} width={b.w} height={b.h} />
          ))}
          {/* Stephansdom: Langhaus mit Steildach + Südturm */}
          <path d="M470 520 L470 440 L512 368 L650 368 L692 440 L692 520 Z" />
          <path d="M596 520 L596 300 L604 300 L604 252 L611 252 L620 96 L629 252 L636 252 L636 300 L644 300 L644 520 Z" />
          <path d="M530 368 L530 330 L540 312 L550 330 L550 368 Z" />
        </g>
        {/* Dachmuster (Zickzack in Gelb/Grün, dezent) */}
        <g fill="none" strokeWidth={2} opacity={0.35}>
          <path d="M520 400 L540 384 L560 400 L580 384 L600 400 L620 384 L640 400 L660 384 L680 400" stroke="#ffc400" />
          <path d="M508 420 L528 404 L548 420 L568 404 L588 420 L608 404 L628 420 L648 404 L668 420 L688 420" stroke="#22c55e" />
        </g>
        <Windows list={near} seed={57} density={0.28} />
      </Layer>

      {/* Bodennebel */}
      <div className="absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-[#0b0f1a] via-[#0b0f1a]/50 to-transparent" />
    </div>
  );
}
