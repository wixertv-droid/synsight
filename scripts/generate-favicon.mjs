/**
 * Generates SynSight favicon assets from the brand mark SVG.
 * Run: node scripts/generate-favicon.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(root, "src", "app");
const publicDir = join(root, "public");

/** Brand mark: radar / sight reticle — readable at 16×16 */
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#70E7FF" stop-opacity="0.35"/>
      <stop offset="55%" stop-color="#29B6F6" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#04070C" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ring" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
      <stop stop-color="#70E7FF"/>
      <stop offset="1" stop-color="#29B6F6"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="8" fill="#04070C"/>
  <circle cx="16" cy="16" r="13" fill="url(#glow)"/>
  <circle cx="16" cy="16" r="11.25" stroke="url(#ring)" stroke-width="1.75"/>
  <circle cx="16" cy="16" r="7.25" stroke="#29B6F6" stroke-opacity="0.45" stroke-width="1"/>
  <path d="M16 5.25V8.1M16 23.9V26.75M5.25 16H8.1M23.9 16H26.75" stroke="#70E7FF" stroke-opacity="0.55" stroke-width="1.25" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="3.4" fill="#70E7FF"/>
  <circle cx="16" cy="16" r="1.35" fill="#04070C" fill-opacity="0.55"/>
</svg>`;

function pngToIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = 0; // 256px marker / unused for 32
  entry[1] = 0;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

async function renderPng(size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

mkdirSync(appDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

writeFileSync(join(appDir, "icon.svg"), svg);
writeFileSync(join(publicDir, "favicon.svg"), svg);

const png32 = await renderPng(32);
const png180 = await renderPng(180);
const png192 = await renderPng(192);
const ico = pngToIco(png32);

writeFileSync(join(appDir, "icon.png"), png32);
writeFileSync(join(appDir, "apple-icon.png"), png180);
writeFileSync(join(appDir, "favicon.ico"), ico);
writeFileSync(join(publicDir, "favicon.ico"), ico);
writeFileSync(join(publicDir, "apple-icon.png"), png180);
writeFileSync(join(publicDir, "icon-192.png"), png192);

console.log("Generated:");
console.log("  src/app/icon.svg, icon.png, apple-icon.png, favicon.ico");
console.log("  public/favicon.ico, favicon.svg, apple-icon.png, icon-192.png");
