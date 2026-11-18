// Erzeugt PWA-Icons aus einem SVG (node scripts/generate-icons.mjs)
import sharp from "sharp";
import { mkdirSync } from "fs";

const svg = (padding) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#0b1f4b"/></linearGradient></defs>
  <rect width="512" height="512" rx="${padding ? 0 : 112}" fill="url(#g)"/>
  <g transform="translate(${padding ? 106 : 76} ${padding ? 106 : 76}) scale(${padding ? 12.5 : 15})" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 17h14M6 17l1.2-5.2A2 2 0 0 1 9.15 10h5.7a2 2 0 0 1 1.95 1.8L18 17"/>
    <path d="M10 7h4l.5 3h-5z" fill="#facc15" stroke="#facc15"/>
    <circle cx="8" cy="17.5" r="1.5"/><circle cx="16" cy="17.5" r="1.5"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const jobs = [
  ["public/icons/icon-192.png", 192, false],
  ["public/icons/icon-512.png", 512, false],
  ["public/icons/apple-touch-icon.png", 180, true],
  ["public/icons/icon-maskable-512.png", 512, true],
];
for (const [file, size, padded] of jobs) {
  await sharp(Buffer.from(svg(padded))).resize(size, size).png().toFile(file);
}
console.log("Icons erzeugt.");
