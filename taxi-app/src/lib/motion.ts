import type { Transition, Variants } from "motion/react";

/** Globale Feder-Einstellung für alle Animationen. */
export const spring: Transition = { type: "spring", stiffness: 260, damping: 24 };
export const softSpring: Transition = { type: "spring", stiffness: 170, damping: 26 };

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
