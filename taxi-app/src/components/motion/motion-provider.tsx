"use client";

import { MotionConfig } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { applyMotionPersonality, personalityTransition } from "@/lib/motion";
import { useThemeState } from "@/lib/theme/client";

function useReducePref(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setOn(el.classList.contains("reduce-motion"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return on;
}

/**
 * Globale Motion-Einstellungen: Motion-Persönlichkeit des aktiven Themes als Standard-Übergang,
 * Rücksicht auf „Bewegung reduzieren“ (System) und den In-App-Schalter.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeState();
  const reduce = useReducePref();
  // vor dem Rendern der Kinder anwenden, damit importierte `spring`-Werte schon stimmen
  useMemo(() => applyMotionPersonality(theme), [theme]);
  const transition = useMemo(() => personalityTransition(theme), [theme]);
  return (
    <MotionConfig transition={transition} reducedMotion={reduce ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
