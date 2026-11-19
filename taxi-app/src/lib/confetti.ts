/** Konfetti (lazy geladen, respektiert „Bewegung reduzieren"). */
export async function fireConfetti(opts: { particleCount?: number; spread?: number; origin?: { x?: number; y?: number } } = {}) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  void confetti({
    particleCount: opts.particleCount ?? 80,
    spread: opts.spread ?? 70,
    origin: opts.origin ?? { y: 0.6 },
    colors: ["#ffc400", "#ffffff", "#22c55e", "#e3000f"],
    disableForReducedMotion: true,
    zIndex: 9999,
  });
}
