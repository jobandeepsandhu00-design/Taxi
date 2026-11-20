const THEME_CONFETTI: Record<string, string[]> = {
  weiss: ["#ffc400", "#111111", "#ffffff", "#16a34a"],
  donau: ["#0ea5e9", "#22d3ee", "#0f766e", "#ffc400", "#ffffff"],
  prater: ["#ff4d4d", "#2dd4bf", "#8b5cf6", "#ffc400", "#38bdf8"],
  gold: ["#b8860b", "#f3dc8a", "#1f4d3a", "#fffdf7"],
  neon: ["#ff3cac", "#784ba0", "#2b86c5", "#ffc400"],
};

/** Konfetti in Theme-Farben (lazy geladen, respektiert „Bewegung reduzieren"). */
export async function fireConfetti(opts: { particleCount?: number; spread?: number; origin?: { x?: number; y?: number } } = {}) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion")) return;
  const { default: confetti } = await import("canvas-confetti");
  void confetti({
    particleCount: opts.particleCount ?? 80,
    spread: opts.spread ?? 70,
    origin: opts.origin ?? { y: 0.6 },
    colors: THEME_CONFETTI[document.documentElement.dataset.theme ?? "weiss"] ?? THEME_CONFETTI.weiss,
    disableForReducedMotion: true,
    zIndex: 9999,
  });
}
