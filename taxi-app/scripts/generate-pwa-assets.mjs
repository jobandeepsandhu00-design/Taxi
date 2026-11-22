/**
 * Erzeugt PWA-Icons und iPhone-Startbildschirme aus dem TaxiFit-Logo.
 * Aufruf: node scripts/generate-pwa-assets.mjs
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const Y = "#FFC400";
const B = "#0A0A0A";
const SIGN = "M168 132 H344 L392 326 H120 Z";
const CHECK = "M194 236 L238 280 L320 194";

function checker(y0) {
  let r = "";
  for (let row = 0; row < 2; row++) for (let col = 0; col < 32; col++) if ((row + col) % 2 === 0) r += `<rect x="${col * 16}" y="${y0 + row * 16}" width="16" height="16"/>`;
  return r;
}
const mark = (rounded) => `
  ${rounded ? `<defs><clipPath id="c"><rect width="512" height="512" rx="112"/></clipPath></defs>` : ""}
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ""} fill="${Y}"/>
  <g ${rounded ? 'clip-path="url(#c)"' : ""} fill="${B}">${checker(404)}</g>
  <path d="${SIGN}" fill="${B}" stroke="${B}" stroke-width="28" stroke-linejoin="round"/>
  <path d="${CHECK}" fill="none" stroke="${Y}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>`;

const svg = (inner, size = 512) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${inner}</svg>`);

// „any“: abgerundetes Quadrat mit Transparenz
const anyIcon = svg(mark(true));
// „maskable“: vollflächig gelb, Logo in der sicheren Zone (~72 %)
const maskable = svg(`<rect width="512" height="512" fill="${Y}"/><g transform="translate(72 72) scale(0.72)">${mark(false)}</g>`);
// Apple: vollflächig, ohne Transparenz
const apple = svg(mark(false));
// Badge: einfarbig weiß auf transparent (Android nutzt nur den Alphakanal)
const badge = svg(`<path d="${SIGN}" fill="#fff" stroke="#fff" stroke-width="28" stroke-linejoin="round" transform="translate(0 30)"/><path d="${CHECK}" fill="none" stroke="#000" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 30)" style="mix-blend-mode:destination-out"/>`);

mkdirSync("public/icons", { recursive: true });
mkdirSync("public/splash", { recursive: true });
const out = async (buf, size, file, flatten) => {
  let s = sharp(buf, { density: 300 }).resize(size, size);
  if (flatten) s = s.flatten({ background: Y });
  await s.png({ compressionLevel: 9 }).toFile(file);
};
await out(anyIcon, 192, "public/icons/icon-192.png");
await out(anyIcon, 512, "public/icons/icon-512.png");
await out(maskable, 192, "public/icons/icon-maskable-192.png");
await out(maskable, 512, "public/icons/icon-maskable-512.png");
await out(apple, 180, "public/icons/apple-touch-icon.png", true);
// Badge: Silhouette des Dachschilds mit ausgestanztem Häkchen
const badgeSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 100 312 312" width="96" height="96"><defs><mask id="m"><rect x="0" y="0" width="512" height="512" fill="#fff"/><path d="${CHECK}" fill="none" stroke="#000" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/></mask></defs><path d="${SIGN}" fill="#fff" stroke="#fff" stroke-width="28" stroke-linejoin="round" mask="url(#m)"/></svg>`);
void badge;
await sharp(badgeSvg, { density: 300 }).resize(96, 96).png().toFile("public/icons/badge-96.png");

// iPhone-Startbildschirme: weiß, Logo mittig, Schriftzug darunter
export const SPLASH = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
];
const list = [];
for (const [w, h, dpr] of SPLASH) {
  const W = w * dpr, H = h * dpr, L = Math.round(W * 0.28);
  const logo = await sharp(anyIcon, { density: 300 }).resize(L, L).png().toBuffer();
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Math.round(L * 0.5)}"><text x="50%" y="60%" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${Math.round(L * 0.26)}" fill="#111">TaxiFit</text></svg>`);
  const file = `apple-splash-${W}x${H}.png`;
  await sharp({ create: { width: W, height: H, channels: 3, background: "#FFFFFF" } })
    .composite([
      { input: logo, top: Math.round(H / 2 - L * 0.7), left: Math.round((W - L) / 2) },
      { input: text, top: Math.round(H / 2 + L * 0.38), left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(`public/splash/${file}`);
  list.push({ url: `/splash/${file}`, media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)` });
}
writeFileSync("src/lib/pwa-splash.json", JSON.stringify(list, null, 2) + "\n");
console.log("Icons + %d Startbildschirme erzeugt", list.length);
