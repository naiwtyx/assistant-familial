// Génère les icônes PWA (PNG) à partir d'un logo SVG, via sharp.
// Usage : node scripts/generate-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

/** Logo : carré arrondi dégradé indigo + panier stylisé. `pad` = marge (zone de sécurité maskable). */
const logoSvg = (pad = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${512 - pad * 2}" height="${512 - pad * 2}" rx="${112 - pad / 2}" fill="url(#g)"/>
  <g fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
    <path d="M150 184 h212 l-26 150 h-160 z"/>
    <path d="M196 184 l24 -58 m120 58 l-24 -58"/>
  </g>
  <circle cx="212" cy="380" r="18" fill="#ffffff"/>
  <circle cx="312" cy="380" r="18" fill="#ffffff"/>
</svg>`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const targets = [
    { name: "icon-192.png", size: 192, pad: 0 },
    { name: "icon-512.png", size: 512, pad: 0 },
    { name: "icon-maskable-512.png", size: 512, pad: 48 },
  ];

  for (const { name, size, pad } of targets) {
    const png = await sharp(Buffer.from(logoSvg(pad))).resize(size, size).png().toBuffer();
    await writeFile(path.join(OUT_DIR, name), png);
    console.log(`✓ ${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
