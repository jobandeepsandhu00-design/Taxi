"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { CoachAvatar } from "@/components/coach/coach-avatar";
import { haptic, spring } from "@/lib/motion";
import { COACH_FAB_PATHS } from "./nav-items";

/** Schwebender Coach-Knopf (Toni) – auf Start, Lernbuch und Üben. */
export function CoachFab() {
  const pathname = usePathname();
  const [launcherOpen, setLauncherOpen] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setLauncherOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener("tp-launcher", on);
    return () => window.removeEventListener("tp-launcher", on);
  }, []);
  const show = COACH_FAB_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!show || launcherOpen) return null;
  return (
    <motion.div className="fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-30 lg:right-8 lg:bottom-8" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}>
      <Link
        href="/coach"
        onClick={() => haptic()}
        aria-label="Coach Toni fragen"
        data-testid="coach-fab"
        className="glass flex size-[52px] items-center justify-center rounded-full shadow-[0_10px_30px_-10px_var(--glow)] ring-2 ring-primary/50 transition active:scale-95"
      >
        <CoachAvatar size={40} />
      </Link>
    </motion.div>
  );
}
