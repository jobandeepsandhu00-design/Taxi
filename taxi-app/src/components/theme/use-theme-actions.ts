"use client";

import { useCallback } from "react";
import { getThemeState, switchTheme, type ThemeState } from "@/lib/theme/client";
import { haptic } from "@/lib/motion";
import { setThemeAction } from "@/server/actions/auth";

/** Theme ändern (mit kreisförmiger Enthüllung) und – wenn angemeldet – im Profil speichern. */
export function useThemeActions(persistRemote = true) {
  return useCallback(
    (next: Partial<ThemeState>, origin?: { x: number; y: number }) => {
      haptic();
      // Ziel vorab berechnen: der Wechsel selbst läuft (View Transition) asynchron
      const target = { ...getThemeState(), ...next };
      switchTheme(next, origin);
      if (persistRemote) void setThemeAction(target.theme, target.mode).catch(() => undefined);
    },
    [persistRemote],
  );
}

export function originOf(e: { clientX: number; clientY: number; currentTarget: EventTarget }) {
  if (e.clientX || e.clientY) return { x: e.clientX, y: e.clientY };
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
