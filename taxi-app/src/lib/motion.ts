import type { Transition, Variants } from "motion/react";
import { THEMES, type ThemeId } from "./theme/themes";

/**
 * Globale Feder-Einstellung für alle Animationen.
 * Wird beim Theme-Wechsel *an Ort und Stelle* auf die Motion-Persönlichkeit des Themes gesetzt
 * (applyMotionPersonality), damit alle bestehenden Komponenten automatisch mitziehen.
 */
export const spring: Transition = { type: "spring", stiffness: 300, damping: 26 };
export const softSpring: Transition = { type: "spring", stiffness: 170, damping: 26 };

export function personalityTransition(id: ThemeId): Transition {
  const m = THEMES[id].motion;
  return m.type === "tween" ? { type: "tween", duration: m.duration, ease: m.ease } : { type: "spring", stiffness: m.stiffness, damping: m.damping };
}

export function applyMotionPersonality(id: ThemeId) {
  const t = personalityTransition(id) as Record<string, unknown>;
  const target = spring as Record<string, unknown>;
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, t);
  const m = THEMES[id].motion;
  const soft = softSpring as Record<string, unknown>;
  for (const k of Object.keys(soft)) delete soft[k];
  Object.assign(soft, m.type === "tween" ? { type: "tween", duration: m.duration * 1.3, ease: m.ease } : { type: "spring", stiffness: Math.round(m.stiffness * 0.6), damping: m.damping + 4 });
}

export const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: spring },
};

/** Kurzes haptisches Feedback, sofern unterstützt und nicht deaktiviert. */
export function haptic(ms = 10) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    if (localStorage.getItem("tp-haptics") === "off") return;
    navigator.vibrate(ms);
  } catch {
    /* ignorieren */
  }
}
