import { describe, expect, it } from "vitest";
import { buildThemeCss } from "@/lib/theme/css";
import { THEMES, THEME_IDS } from "@/lib/theme/themes";

type RGBA = [number, number, number, number];

function parse(c: string): RGBA {
  if (c.startsWith("#")) {
    const h = c.slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`Farbe nicht lesbar: ${c}`);
  const [r, g, b, a = "1"] = m[1].split(",").map((s) => s.trim());
  return [Number(r), Number(g), Number(b), Number(a)];
}

/** Halbtransparente Farbe auf deckenden Untergrund mischen. */
function over(top: string, bottom: string): RGBA {
  const [r1, g1, b1, a] = parse(top);
  const [r2, g2, b2] = parse(bottom);
  return [r1 * a + r2 * (1 - a), g1 * a + g2 * (1 - a), b1 * a + b2 * (1 - a), 1];
}

function lum([r, g, b]: RGBA): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a: RGBA, b: RGBA): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const AA = 4.5;

describe("Themes: WCAG-AA-Kontrast in allen 5 Designs × Hell/Dunkel", () => {
  for (const id of THEME_IDS) {
    for (const mode of ["light", "dark"] as const) {
      const p = THEMES[id][mode];
      const bg = parse(p.background);
      const card = over(p.card, p.background);
      const muted = over(p.muted, p.background);
      const pairs: [string, RGBA, RGBA][] = [
        ["Text/Hintergrund", parse(p.foreground), bg],
        ["Text/Karte", parse(p.foreground), card],
        ["Überschrift/Hintergrund", parse(p.heading), bg],
        ["Nebentext/Hintergrund", parse(p.mutedForeground), bg],
        ["Nebentext/Karte", parse(p.mutedForeground), card],
        ["Nebentext/Fläche", parse(p.mutedForeground), muted],
        ["Button-Text/Primär", parse(p.primaryForeground), parse(p.primary)],
        ["Link/Hintergrund", parse(p.link), bg],
        ["Link/Karte", parse(p.link), card],
        ["Sekundär-Text/Sekundär", parse(p.secondaryForeground), over(p.secondary, p.background)],
        ["Fehler/Hintergrund", parse(p.destructive), bg],
        ["Erfolg/Hintergrund", parse(p.success), bg],
        ["Warnung/Hintergrund", parse(p.warning), bg],
        ["Info/Hintergrund", parse(p.info), bg],
        ["Weiß/Bühne", parse("#ffffff"), parse(p.stage)],
      ];
      it(`${THEMES[id].name} (${mode === "light" ? "hell" : "dunkel"})`, () => {
        const fails = pairs.map(([n, a, b]) => [n, ratio(a, b)] as const).filter(([, r]) => r < AA);
        expect(fails.map(([n, r]) => `${n}: ${r.toFixed(2)}`)).toEqual([]);
      });
    }
  }

  it("Button-Verlauf (Neon) trägt weiße Schrift an beiden Enden", () => {
    const g = THEMES.neon.buttonGradient!;
    const stops = g.match(/#[0-9a-f]{6}/gi)!;
    for (const s of stops) expect(ratio(parse("#ffffff"), parse(s))).toBeGreaterThanOrEqual(AA);
  });

  it("erzeugt CSS für alle Themes inkl. Dunkel-Variante", () => {
    const css = buildThemeCss();
    for (const id of THEME_IDS) {
      expect(css).toContain(`[data-theme="${id}"]{`);
      expect(css).toContain(`.dark[data-theme="${id}"]`);
    }
  });
});
