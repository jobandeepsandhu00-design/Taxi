"use client";

import { motion } from "motion/react";

/** Gelbes Wiener Taxi (Seitenansicht) mit Scheinwerferkegel und flackerndem „TAXI"-Dachschild. */
export function TaxiCar({ className, broken = false }: { className?: string; broken?: boolean }) {
  return (
    <svg viewBox="0 0 260 90" className={className} aria-hidden>
      <defs>
        <linearGradient id="beam" x1="0" x2="1">
          <stop offset="0" stopColor="#fff6c7" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff6c7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd84a" />
          <stop offset="1" stopColor="#f2b300" />
        </linearGradient>
      </defs>
      {/* Scheinwerferkegel */}
      {!broken && <path d="M168 58 L260 40 L260 82 Z" fill="url(#beam)" className="headlight-beam" />}
      {/* Karosserie */}
      <path d="M8 66 Q8 52 22 50 L46 48 L66 30 Q72 25 82 25 L122 25 Q132 25 138 31 L154 48 L162 50 Q172 52 172 62 L172 68 Q172 72 168 72 L12 72 Q8 72 8 66 Z" fill="url(#body)" />
      {/* Fenster */}
      <path d="M72 46 L84 31 L104 31 L104 46 Z" fill="#0e1427" opacity="0.9" />
      <path d="M110 46 L110 31 L124 31 Q130 31 134 36 L142 46 Z" fill="#0e1427" opacity="0.9" />
      {/* Schachbrett-Streifen */}
      <g fill="#0b0f1a">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <rect key={i} x={30 + i * 12} y={i % 2 ? 56 : 52} width={6} height={4} />
        ))}
      </g>
      {/* Scheinwerfer / Rücklicht */}
      <rect x={164} y={54} width={8} height={6} rx={2} fill="#fffbe6" />
      <rect x={8} y={56} width={6} height={6} rx={2} fill="#e3000f" />
      {/* Dachschild */}
      <g className="neon-flicker">
        <rect x={86} y={13} width={36} height={12} rx={3} fill="#fff4c2" />
        <text x={104} y={22.5} textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="var(--font-grotesk), sans-serif" fill="#0b0f1a">
          TAXI
        </text>
      </g>
      {/* Räder */}
      {[44, 138].map((cx) => (
        <g key={cx} className={broken ? undefined : "wheel-spin"} style={{ transformOrigin: `${cx}px 72px` }}>
          <circle cx={cx} cy={72} r={13} fill="#0b0f1a" />
          <circle cx={cx} cy={72} r={6} fill="#94a3b8" />
          <rect x={cx - 1} y={60} width={2} height={24} fill="#0b0f1a" />
        </g>
      ))}
    </svg>
  );
}

/** Straße mit live gezeichneter, leuchtender Route und fahrendem Taxi (Endlosschleife). */
export function TaxiDrive({ leaving }: { leaving: boolean }) {
  const loop = { duration: 9, ease: "linear" as const, repeat: Infinity, repeatDelay: 0.6 };
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24" aria-hidden>
      {/* Fahrbahn */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-[#0d1220]" />
      <div className="road-dashes absolute inset-x-0 bottom-[18px] h-[3px]" />
      {/* Route */}
      <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[30px] h-6 w-full overflow-visible">
        <motion.path
          d="M0 20 C 240 4, 480 36, 720 20 S 1200 4, 1440 20"
          fill="none"
          stroke="#ffc400"
          strokeWidth={3}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px #ffc400)" }}
          initial={{ pathLength: 0, opacity: 0.9 }}
          animate={leaving ? { pathLength: 1, opacity: 1 } : { pathLength: [0, 1], opacity: [0.9, 0.9, 0] }}
          transition={leaving ? { duration: 0.4 } : { ...loop, times: [0, 0.92, 1] }}
        />
      </svg>
      {/* Taxi */}
      <motion.div
        className="absolute bottom-[10px] left-0 w-[150px] sm:w-[190px]"
        initial={{ x: "-25vw" }}
        animate={leaving ? { x: "130vw", filter: "blur(3px)" } : { x: ["-25vw", "105vw"] }}
        transition={leaving ? { duration: 0.65, ease: [0.55, 0, 0.9, 0.4] } : loop}
      >
        <TaxiCar className="w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]" />
      </motion.div>
    </div>
  );
}
