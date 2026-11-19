"use client";

import { MotionConfig } from "motion/react";
import { spring } from "@/lib/motion";

/** Globale Motion-Einstellungen: Feder-Standard und Rücksicht auf „Bewegung reduzieren". */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig transition={spring} reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
