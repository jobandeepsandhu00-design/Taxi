/**
 * Theme-Engine: 5 Designs × Hell/Dunkel – einzige Quelle für Farben, Radien, Schriften und Bewegung.
 * Daraus wird das CSS erzeugt (siehe css.ts); der Kontrast-Test prüft dieselben Werte.
 */

export type ThemeId = "weiss" | "donau" | "prater" | "gold" | "neon";
export type ThemeMode = "light" | "dark" | "system";

export interface Palette {
  background: string;
  foreground: string;
  card: string;
  cardBorder: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  link: string;
  heading: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  destructive: string;
  success: string;
  warning: string;
  info: string;
  border: string;
  input: string;
  ring: string;
  glow: string;
  orbA: string;
  orbB: string;
  orbC: string;
  /** „Bühne“ – farbige Hero-Fläche mit heller Schrift */
  stage: string;
  stageGlow: string;
  cardShadow: string;
}

export interface MotionPersonality {
  /** Federwerte für motion; bei `tween` gelten duration/ease */
  type: "spring" | "tween";
  stiffness: number;
  damping: number;
  duration: number;
  ease: [number, number, number, number];
  /** CSS-Gegenstück */
  cssEase: string;
  cssDuration: string;
}

export interface ThemeDef {
  id: ThemeId;
  name: string;
  tagline: string;
  emoji: string;
  radius: string;
  fontSans: string;
  fontDisplay: string;
  motion: MotionPersonality;
  /** Verlauf für Akzente (Ringe, Ränder, Hero) */
  gradient: string;
  /** dunklerer Verlauf, auf dem weiße Schrift AA erfüllt */
  buttonGradient?: string;
  light: Palette;
  dark: Palette;
}

const shadowLight = "0 8px 30px rgba(0, 0, 0, 0.06)";
const shadowDark = "0 8px 30px rgba(0, 0, 0, 0.35)";

export const THEMES: Record<ThemeId, ThemeDef> = {
  weiss: {
    id: "weiss",
    name: "Wiener Weiß",
    tagline: "Klar, modern, premium – Weiß, Taxigelb und Schwarz.",
    emoji: "🚕",
    radius: "1.5rem",
    fontSans: "var(--font-inter)",
    fontDisplay: "var(--font-grotesk)",
    motion: { type: "spring", stiffness: 300, damping: 26, duration: 0.35, ease: [0.2, 0.8, 0.2, 1], cssEase: "cubic-bezier(0.2, 0.8, 0.2, 1)", cssDuration: "0.3s" },
    gradient: "linear-gradient(135deg, #ffc400 0%, #ffdb4d 50%, #ffb000 100%)",
    light: {
      background: "#ffffff",
      foreground: "#0a0a0a",
      card: "#ffffff",
      cardBorder: "#eeeeee",
      muted: "#f7f7f5",
      mutedForeground: "#5f6672",
      primary: "#ffc400",
      primaryForeground: "#0a0a0a",
      link: "#8a5a00",
      heading: "#0a0a0a",
      secondary: "#fff4cc",
      secondaryForeground: "#6b4a00",
      accent: "#f3f3f1",
      destructive: "#dc2626",
      success: "#15803d",
      warning: "#b45309",
      info: "#2563eb",
      border: "#eeeeee",
      input: "#d4d4d4",
      ring: "#e0a800",
      glow: "rgba(255, 196, 0, 0.45)",
      orbA: "rgba(255, 196, 0, 0.07)",
      orbB: "rgba(17, 17, 17, 0.03)",
      orbC: "rgba(37, 99, 235, 0.06)",
      stage: "#111111",
      stageGlow: "rgba(255, 196, 0, 0.32)",
      cardShadow: shadowLight,
    },
    dark: {
      background: "#0a0a0a",
      foreground: "#f5f5f4",
      card: "#161616",
      cardBorder: "#262626",
      muted: "#1c1c1c",
      mutedForeground: "#a3a3a3",
      primary: "#ffc400",
      primaryForeground: "#0a0a0a",
      link: "#ffc400",
      heading: "#ffffff",
      secondary: "rgba(255, 196, 0, 0.14)",
      secondaryForeground: "#ffd54a",
      accent: "#222222",
      destructive: "#f87171",
      success: "#4ade80",
      warning: "#fbbf24",
      info: "#60a5fa",
      border: "#262626",
      input: "#3a3a3a",
      ring: "#ffc400",
      glow: "rgba(255, 196, 0, 0.3)",
      orbA: "rgba(255, 196, 0, 0.12)",
      orbB: "rgba(255, 255, 255, 0.03)",
      orbC: "rgba(37, 99, 235, 0.08)",
      stage: "#151515",
      stageGlow: "rgba(255, 196, 0, 0.25)",
      cardShadow: shadowDark,
    },
  },
  donau: {
    id: "donau",
    name: "Donau Blau",
    tagline: "Ruhig, frisch, fokussiert – Weiß mit Fluss-Blau und Türkis.",
    emoji: "🌊",
    radius: "1.25rem",
    fontSans: "var(--font-jakarta)",
    fontDisplay: "var(--font-jakarta)",
    motion: { type: "spring", stiffness: 180, damping: 22, duration: 0.5, ease: [0.37, 0, 0.18, 1], cssEase: "cubic-bezier(0.37, 0, 0.18, 1)", cssDuration: "0.45s" },
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 50%, #0f766e 100%)",
    light: {
      background: "#ffffff",
      foreground: "#0b1324",
      card: "#ffffff",
      cardBorder: "#dcebfa",
      muted: "#f0f7ff",
      mutedForeground: "#4f6079",
      primary: "#0ea5e9",
      primaryForeground: "#06121f",
      link: "#0369a1",
      heading: "#0b1324",
      secondary: "#e0f2fe",
      secondaryForeground: "#075985",
      accent: "#eaf4ff",
      destructive: "#dc2626",
      success: "#0f766e",
      warning: "#b45309",
      info: "#0369a1",
      border: "#dcebfa",
      input: "#b9d3ec",
      ring: "#0ea5e9",
      glow: "rgba(14, 165, 233, 0.35)",
      orbA: "rgba(14, 165, 233, 0.14)",
      orbB: "rgba(15, 118, 110, 0.08)",
      orbC: "rgba(255, 196, 0, 0.08)",
      stage: "#0b3a55",
      stageGlow: "rgba(34, 211, 238, 0.35)",
      cardShadow: "0 8px 30px rgba(14, 116, 180, 0.08)",
    },
    dark: {
      background: "#07131f",
      foreground: "#e6f1fb",
      card: "#0d1f30",
      cardBorder: "#1a3550",
      muted: "#10263a",
      mutedForeground: "#91abc4",
      primary: "#38bdf8",
      primaryForeground: "#07131f",
      link: "#7dd3fc",
      heading: "#f0f9ff",
      secondary: "rgba(56, 189, 248, 0.14)",
      secondaryForeground: "#7dd3fc",
      accent: "#12293f",
      destructive: "#f87171",
      success: "#2dd4bf",
      warning: "#fbbf24",
      info: "#7dd3fc",
      border: "#1a3550",
      input: "#24425f",
      ring: "#38bdf8",
      glow: "rgba(56, 189, 248, 0.28)",
      orbA: "rgba(56, 189, 248, 0.14)",
      orbB: "rgba(45, 212, 191, 0.08)",
      orbC: "rgba(255, 196, 0, 0.05)",
      stage: "#0b3049",
      stageGlow: "rgba(34, 211, 238, 0.3)",
      cardShadow: shadowDark,
    },
  },
  prater: {
    id: "prater",
    name: "Prater Pop",
    tagline: "Verspielt, bunt, voller Energie – wie ein Tag im Prater.",
    emoji: "🎡",
    radius: "1.75rem",
    fontSans: "var(--font-nunito)",
    fontDisplay: "var(--font-nunito)",
    motion: { type: "spring", stiffness: 400, damping: 14, duration: 0.4, ease: [0.34, 1.56, 0.64, 1], cssEase: "cubic-bezier(0.34, 1.56, 0.64, 1)", cssDuration: "0.35s" },
    gradient: "linear-gradient(135deg, #ff4d4d 0%, #ffc400 35%, #2dd4bf 65%, #8b5cf6 100%)",
    light: {
      background: "#ffffff",
      foreground: "#1f1235",
      card: "#ffffff",
      cardBorder: "#efe3d6",
      muted: "#fff8f0",
      mutedForeground: "#675879",
      primary: "#7c3aed",
      primaryForeground: "#ffffff",
      link: "#6d28d9",
      heading: "#1f1235",
      secondary: "#ffe8e8",
      secondaryForeground: "#b91c1c",
      accent: "#fff1e6",
      destructive: "#dc2626",
      success: "#0f766e",
      warning: "#b45309",
      info: "#0369a1",
      border: "#efe3d6",
      input: "#dccbb8",
      ring: "#8b5cf6",
      glow: "rgba(139, 92, 246, 0.35)",
      orbA: "rgba(255, 77, 77, 0.1)",
      orbB: "rgba(45, 212, 191, 0.1)",
      orbC: "rgba(255, 196, 0, 0.12)",
      stage: "#4c1d95",
      stageGlow: "rgba(255, 77, 77, 0.4)",
      cardShadow: "0 8px 30px rgba(124, 58, 237, 0.07)",
    },
    dark: {
      background: "#1a1028",
      foreground: "#fbf7ff",
      card: "#24173a",
      cardBorder: "#3a2a55",
      muted: "#2c1e45",
      mutedForeground: "#bcabd3",
      primary: "#a78bfa",
      primaryForeground: "#1a1028",
      link: "#c4b5fd",
      heading: "#ffffff",
      secondary: "rgba(255, 77, 77, 0.16)",
      secondaryForeground: "#ff9a9a",
      accent: "#2f2049",
      destructive: "#ff7a7a",
      success: "#5eead4",
      warning: "#fcd34d",
      info: "#7dd3fc",
      border: "#3a2a55",
      input: "#4a3870",
      ring: "#a78bfa",
      glow: "rgba(167, 139, 250, 0.32)",
      orbA: "rgba(255, 77, 77, 0.12)",
      orbB: "rgba(45, 212, 191, 0.1)",
      orbC: "rgba(255, 196, 0, 0.08)",
      stage: "#3b1673",
      stageGlow: "rgba(255, 77, 77, 0.35)",
      cardShadow: shadowDark,
    },
  },
  gold: {
    id: "gold",
    name: "Schönbrunn Gold",
    tagline: "Elegant und kaiserlich – Elfenbein, Gold und Schlossgrün.",
    emoji: "👑",
    radius: "1rem",
    fontSans: "var(--font-inter)",
    fontDisplay: "var(--font-playfair)",
    motion: { type: "tween", stiffness: 120, damping: 26, duration: 0.75, ease: [0.22, 1, 0.36, 1], cssEase: "cubic-bezier(0.22, 1, 0.36, 1)", cssDuration: "0.7s" },
    gradient: "linear-gradient(135deg, #8a6408 0%, #d4a62a 45%, #f3dc8a 60%, #b8860b 100%)",
    light: {
      background: "#fffdf7",
      foreground: "#1c1917",
      card: "#fffefa",
      cardBorder: "#e8d9b5",
      muted: "#fbf6ea",
      mutedForeground: "#675d52",
      primary: "#b8860b",
      primaryForeground: "#1c1917",
      link: "#7d5a06",
      heading: "#1f4d3a",
      secondary: "#f3ead3",
      secondaryForeground: "#6b4f07",
      accent: "#f6efdf",
      destructive: "#b91c1c",
      success: "#1f6b45",
      warning: "#a16207",
      info: "#1d4ed8",
      border: "#e8d9b5",
      input: "#d6c294",
      ring: "#b8860b",
      glow: "rgba(184, 134, 11, 0.3)",
      orbA: "rgba(184, 134, 11, 0.1)",
      orbB: "rgba(31, 77, 58, 0.06)",
      orbC: "rgba(255, 196, 0, 0.06)",
      stage: "#1f4d3a",
      stageGlow: "rgba(212, 166, 42, 0.35)",
      cardShadow: "0 8px 30px rgba(120, 90, 20, 0.07)",
    },
    dark: {
      background: "#0f1a15",
      foreground: "#f5efe0",
      card: "#16241d",
      cardBorder: "#34452f",
      muted: "#1b2c23",
      mutedForeground: "#b8ae99",
      primary: "#d4a62a",
      primaryForeground: "#10140f",
      link: "#e6c35c",
      heading: "#f3e3b5",
      secondary: "rgba(212, 166, 42, 0.14)",
      secondaryForeground: "#e6c35c",
      accent: "#1e3127",
      destructive: "#f87171",
      success: "#4ade80",
      warning: "#fbbf24",
      info: "#93c5fd",
      border: "#2c3d31",
      input: "#3a4f40",
      ring: "#d4a62a",
      glow: "rgba(212, 166, 42, 0.25)",
      orbA: "rgba(212, 166, 42, 0.1)",
      orbB: "rgba(74, 222, 128, 0.05)",
      orbC: "rgba(255, 196, 0, 0.04)",
      stage: "#173a2c",
      stageGlow: "rgba(212, 166, 42, 0.3)",
      cardShadow: shadowDark,
    },
  },
  neon: {
    id: "neon",
    name: "Neon Straße",
    tagline: "Mutig, schnell, digital – Weiß mit elektrischen Verläufen.",
    emoji: "⚡",
    radius: "1.375rem",
    fontSans: "var(--font-sora)",
    fontDisplay: "var(--font-sora)",
    motion: { type: "spring", stiffness: 350, damping: 20, duration: 0.3, ease: [0.16, 1, 0.3, 1], cssEase: "cubic-bezier(0.16, 1, 0.3, 1)", cssDuration: "0.25s" },
    gradient: "linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)",
    buttonGradient: "linear-gradient(135deg, #c2187f 0%, #784ba0 50%, #2366a0 100%)",
    light: {
      background: "#ffffff",
      foreground: "#0f0f1a",
      card: "#ffffff",
      cardBorder: "#e6e4f7",
      muted: "#f5f5ff",
      mutedForeground: "#575773",
      primary: "#784ba0",
      primaryForeground: "#ffffff",
      link: "#6a3d96",
      heading: "#0f0f1a",
      secondary: "#f3e8ff",
      secondaryForeground: "#6a3d96",
      accent: "#efeffc",
      destructive: "#dc2626",
      success: "#15803d",
      warning: "#b45309",
      info: "#2563eb",
      border: "#e6e4f7",
      input: "#cfcbef",
      ring: "#784ba0",
      glow: "rgba(255, 60, 172, 0.3)",
      orbA: "rgba(255, 60, 172, 0.16)",
      orbB: "rgba(120, 75, 160, 0.14)",
      orbC: "rgba(43, 134, 197, 0.16)",
      stage: "#24104a",
      stageGlow: "rgba(255, 60, 172, 0.45)",
      cardShadow: "0 8px 30px rgba(120, 75, 160, 0.08)",
    },
    dark: {
      background: "#0b0b16",
      foreground: "#f1f0ff",
      card: "#14142a",
      cardBorder: "#2a2a4a",
      muted: "#1a1a33",
      mutedForeground: "#a6a6c4",
      primary: "#c084fc",
      primaryForeground: "#0b0b16",
      link: "#f0abfc",
      heading: "#ffffff",
      secondary: "rgba(255, 60, 172, 0.16)",
      secondaryForeground: "#f9a8d4",
      accent: "#1e1e3a",
      destructive: "#f87171",
      success: "#4ade80",
      warning: "#fbbf24",
      info: "#7dd3fc",
      border: "#2a2a4a",
      input: "#36365c",
      ring: "#c084fc",
      glow: "rgba(255, 60, 172, 0.3)",
      orbA: "rgba(255, 60, 172, 0.16)",
      orbB: "rgba(120, 75, 160, 0.18)",
      orbC: "rgba(43, 134, 197, 0.18)",
      stage: "#1a0b38",
      stageGlow: "rgba(255, 60, 172, 0.4)",
      cardShadow: shadowDark,
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const DEFAULT_THEME: ThemeId = "weiss";
export const DEFAULT_MODE: ThemeMode = "light";

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && v in THEMES;
}
export function isThemeMode(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark" || v === "system";
}
