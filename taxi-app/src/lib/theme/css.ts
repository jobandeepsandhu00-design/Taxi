import { THEMES, type Palette, type ThemeDef } from "./themes";

function vars(p: Palette, dark: boolean, id = "weiss"): string {
  return [
    // Dunkles Dock (untere Navigation): Wiener Weiß fast schwarz, andere Themes ihre tiefe Überschriftfarbe
    `--dock:${dark ? "#1c1c1e" : id === "weiss" ? "#111111" : p.heading}`,
    `--dock-border:${dark ? "rgba(255,255,255,0.1)" : "transparent"}`,
    `--dock-icon:#8a8f98`,
    `--background:${p.background}`,
    `--foreground:${p.foreground}`,
    `--card:${p.card}`,
    `--card-solid:${p.card}`,
    `--card-foreground:${p.foreground}`,
    `--card-border:${p.cardBorder}`,
    `--card-shadow:${p.cardShadow}`,
    `--card-blur:${dark ? "blur(20px) saturate(140%)" : "none"}`,
    `--muted:${p.muted}`,
    `--muted-foreground:${p.mutedForeground}`,
    `--primary:${p.primary}`,
    `--primary-foreground:${p.primaryForeground}`,
    `--link:${p.link}`,
    `--navy:${p.heading}`,
    `--secondary:${p.secondary}`,
    `--secondary-foreground:${p.secondaryForeground}`,
    `--accent:${p.accent}`,
    `--accent-foreground:${p.foreground}`,
    `--destructive:${p.destructive}`,
    `--success:${p.success}`,
    `--warning:${p.warning}`,
    `--info:${p.info}`,
    `--border:${p.border}`,
    `--input:${p.input}`,
    `--ring:${p.ring}`,
    `--glow:${p.glow}`,
    `--orb-a:${p.orbA}`,
    `--orb-b:${p.orbB}`,
    `--orb-c:${p.orbC}`,
    `--stage:${p.stage}`,
    `--stage-glow:${p.stageGlow}`,
    `--grain-opacity:${dark ? 0.06 : 0.03}`,
    `color-scheme:${dark ? "dark" : "light"}`,
  ].join(";");
}

function shared(t: ThemeDef): string {
  return [
    `--radius:${t.radius}`,
    `--theme-sans:${t.fontSans}`,
    `--theme-display:${t.fontDisplay}`,
    `--theme-gradient:${t.gradient}`,
    `--button-gradient:${t.buttonGradient ?? "none"}`,
    `--ease:${t.motion.cssEase}`,
    `--dur:${t.motion.cssDuration}`,
  ].join(";");
}

/** Erzeugt das komplette Theme-CSS. Hell: [data-theme=x]; dunkel: .dark[data-theme=x] bzw. .dark [data-theme=x]. */
export function buildThemeCss(): string {
  return Object.values(THEMES)
    .map(
      (t) =>
        `[data-theme="${t.id}"]{${shared(t)};${vars(t.light, false, t.id)}}` +
        `.dark[data-theme="${t.id}"],.dark [data-theme="${t.id}"]{${vars(t.dark, true, t.id)}}` +
        `[data-theme="${t.id}"].light-scope,.dark [data-theme="${t.id}"].light-scope{${vars(t.light, false, t.id)}}`,
    )
    .join("\n");
}
