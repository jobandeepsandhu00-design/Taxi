"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_MODE, DEFAULT_THEME, isThemeId, isThemeMode, THEMES, type ThemeId, type ThemeMode } from "./themes";

import { THEME_STORAGE_KEY } from "./script";

export { THEME_STORAGE_KEY };

export interface ThemeState {
  theme: ThemeId;
  mode: ThemeMode;
  /** Nutzer, dem die lokale Auswahl gehört (für Abgleich mit dem Profil) */
  uid?: string;
}

const listeners = new Set<() => void>();
let current: ThemeState | null = null;

function systemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolvedDark(mode: ThemeMode): boolean {
  return mode === "dark" || (mode === "system" && systemDark());
}

function read(): ThemeState {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<ThemeState>;
      return { theme: isThemeId(v.theme) ? v.theme : DEFAULT_THEME, mode: isThemeMode(v.mode) ? v.mode : DEFAULT_MODE, uid: v.uid };
    }
  } catch {
    /* ignorieren */
  }
  const el = typeof document !== "undefined" ? document.documentElement : null;
  const t = el?.dataset.theme;
  return { theme: isThemeId(t) ? t : DEFAULT_THEME, mode: DEFAULT_MODE };
}

export function getThemeState(): ThemeState {
  if (!current) current = read();
  return current;
}

/** Setzt data-theme/.dark am <html>, aktualisiert theme-color und speichert lokal. */
export function applyTheme(next: ThemeState, persist = true) {
  current = next;
  const el = document.documentElement;
  el.dataset.theme = next.theme;
  const dark = resolvedDark(next.mode);
  el.classList.toggle("dark", dark);
  const meta = document.querySelector('meta[name="theme-color"]:not([media])') ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
  meta.setAttribute("content", THEMES[next.theme][dark ? "dark" : "light"].background);
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignorieren */
    }
  }
  listeners.forEach((l) => l());
}

function prefersReduced(): boolean {
  try {
    if (localStorage.getItem("tp-reduce-motion") === "on") return true;
  } catch {
    /* ignorieren */
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Theme wechseln mit kreisförmiger Enthüllung ab dem Tippunkt
 * (View Transitions API; ohne Unterstützung sofortiger Wechsel).
 */
export function switchTheme(next: Partial<ThemeState>, origin?: { x: number; y: number }) {
  const target: ThemeState = { ...getThemeState(), ...next };
  // sofort als aktuellen Stand merken – ein zweiter schneller Tipp baut darauf auf
  current = target;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || prefersReduced()) {
    applyTheme(target);
    return;
  }
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  document.documentElement.classList.add("theme-reveal");
  const vt = doc.startViewTransition(() => applyTheme(target));
  vt.ready
    .then(() => {
      const anim = document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
      anim.finished.finally(() => document.documentElement.classList.remove("theme-reveal"));
    })
    .catch(() => document.documentElement.classList.remove("theme-reveal"));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSys = () => {
    const s = getThemeState();
    if (s.mode === "system") applyTheme(s, false);
  };
  mq.addEventListener("change", onSys);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onSys);
  };
}

const serverState: ThemeState = { theme: DEFAULT_THEME, mode: DEFAULT_MODE };

export function useThemeState(): ThemeState {
  return useSyncExternalStore(subscribe, getThemeState, () => serverState);
}

