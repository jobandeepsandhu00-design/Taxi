"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CoachAvatar } from "@/components/coach/coach-avatar";
import { haptic, spring } from "@/lib/motion";
import { COACH_FAB_PATHS } from "./nav-items";

/** Schwebender Coach-Knopf (Toni) – auf Start, Lernbuch und Üben. */
export function CoachFab() {
  const pathname = usePathname();
  const show = COACH_FAB_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!show) return null;
  return (
    <motion.div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] z-30 lg:right-8 lg:bottom-8" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}>
      <Link
        href="/coach"
        onClick={() => haptic()}
        aria-label="Coach Toni fragen"
        data-testid="coach-fab"
        className="glass flex size-14 items-center justify-center rounded-full shadow-[0_10px_30px_-10px_var(--glow)] ring-2 ring-primary/50 transition active:scale-95"
      >
        <CoachAvatar size={44} />
      </Link>
    </motion.div>
  );
}
