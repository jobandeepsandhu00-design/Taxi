"use client";

import { AnimatePresence, motion } from "motion/react";

export type CoachMood = "idle" | "thinking" | "happy" | "sad";

/** Freundliche Taxi-Figur als Coach – reagiert mit Stimmung (idle, nachdenklich, fröhlich, traurig). */
export function CoachAvatar({ mood = "idle", size = 56, className }: { mood?: CoachMood; size?: number; className?: string }) {
  const mouth = {
    idle: "M24 41 Q32 45 40 41",
    thinking: "M26 42 Q32 42 38 42",
    happy: "M22 39 Q32 50 42 39",
    sad: "M24 45 Q32 39 40 45",
  }[mood];
  const eyeY = mood === "thinking" ? -2 : mood === "sad" ? 1.5 : 0;
  const eyeX = mood === "thinking" ? 2 : 0;
  return (
    <motion.div
      className={className}
      style={{ width: size, height: size, position: "relative" }}
      animate={
        mood === "happy"
          ? { y: [0, -8, 0, -4, 0], rotate: [0, -4, 4, 0] }
          : mood === "sad"
            ? { y: 2, rotate: -6 }
            : mood === "thinking"
              ? { y: [0, -2, 0], rotate: [0, 2, 0] }
              : { y: [0, -3, 0] }
      }
      transition={mood === "happy" ? { duration: 0.8 } : mood === "sad" ? { type: "spring", stiffness: 120, damping: 12 } : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
        {/* Dachschild */}
        <rect x={23} y={4} width={18} height={8} rx={2.5} fill="#fff4c2" />
        <text x={32} y={10.4} textAnchor="middle" fontSize={5.5} fontWeight={800} fill="#0b0f1a" fontFamily="var(--font-grotesk), sans-serif">
          TAXI
        </text>
        {/* Karosserie */}
        <rect x={6} y={12} width={52} height={44} rx={16} fill="#ffc400" />
        <rect x={6} y={46} width={52} height={10} rx={5} fill="#f2b300" />
        {/* Schachbrett */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={12 + i * 7} y={i % 2 ? 50 : 48} width={4} height={3} fill="#0b0f1a" />
        ))}
        {/* Windschutzscheibe = Gesicht */}
        <rect x={12} y={18} width={40} height={26} rx={10} fill="#0e1427" />
        {/* Augen */}
        {[24, 40].map((cx) => (
          <motion.ellipse
            key={cx}
            cx={cx}
            cy={29}
            rx={3.4}
            ry={4}
            fill="#fff"
            animate={{ x: eyeX, y: eyeY, scaleY: mood === "happy" ? 0.45 : [1, 1, 0.1, 1] }}
            transition={mood === "happy" ? { duration: 0.2 } : { duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
            style={{ originX: `${cx}px`, originY: "29px" }}
          />
        ))}
        {mood === "sad" && (
          <motion.circle cx={42} cy={35} r={1.6} fill="#7dd3fc" initial={{ y: 0, opacity: 0 }} animate={{ y: [0, 8], opacity: [0, 1, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
        )}
        {/* Mund */}
        <motion.path d={mouth} stroke="#ffc400" strokeWidth={2.6} strokeLinecap="round" fill="none" initial={false} animate={{ d: mouth }} transition={{ duration: 0.3 }} />
        {/* Scheinwerfer */}
        <circle cx={14} cy={48} r={3} fill="#fffbe6" />
        <circle cx={50} cy={48} r={3} fill="#fffbe6" />
      </svg>
      <AnimatePresence>
        {mood === "thinking" && (
          <motion.span className="absolute -top-2 -right-3 flex gap-0.5 rounded-full bg-card-solid px-1.5 py-1 shadow" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="size-1 rounded-full bg-primary" animate={{ y: [0, -2, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </motion.span>
        )}
        {mood === "happy" && (
          <motion.span className="absolute -top-1 -right-1 text-sm" initial={{ scale: 0, rotate: -30 }} animate={{ scale: [0, 1.3, 1], rotate: 0 }} exit={{ scale: 0 }}>
            ✨
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
