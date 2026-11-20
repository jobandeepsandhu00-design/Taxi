"use client";

import { motion } from "motion/react";
import { useId } from "react";

const YELLOW = "#FFC400";
const BLACK = "#0A0A0A";
const SIGN = "M168 132 H344 L392 326 H120 Z";
const CHECK = "M194 236 L238 280 L320 194";

/** TaxiFit-App-Icon: Dachschild mit Häkchen auf Taxigelb, unten karierter Streifen. Feste Markenfarben. */
export function TaxiFitMark({ size = 36, className, animated = false, title }: { size?: number; className?: string; animated?: boolean; title?: string }) {
  const clip = `tf-${useId().replace(/:/g, "")}`;
  const cells = [];
  for (let row = 0; row < 2; row++) for (let col = 0; col < 32; col++) if ((row + col) % 2 === 0) cells.push(<rect key={`${row}-${col}`} x={col * 16} y={404 + row * 16} width={16} height={16} />);
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <clipPath id={clip}>
          <rect width={512} height={512} rx={112} />
        </clipPath>
      </defs>
      <rect width={512} height={512} rx={112} fill={YELLOW} />
      <g clipPath={`url(#${clip})`} fill={BLACK}>
        {cells}
      </g>
      {animated ? (
        <>
          <motion.path d={SIGN} fill={BLACK} stroke={BLACK} strokeWidth={28} strokeLinejoin="round" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.3 }} style={{ originX: "256px", originY: "230px" }} />
          <motion.path d={CHECK} fill="none" stroke={YELLOW} strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.75, ease: "easeOut" }} />
        </>
      ) : (
        <>
          <path d={SIGN} fill={BLACK} stroke={BLACK} strokeWidth={28} strokeLinejoin="round" />
          <path d={CHECK} fill="none" stroke={YELLOW} strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}
