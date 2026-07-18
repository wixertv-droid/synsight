import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const srcDir = "/opt/cursor/artifacts/assets";
const outDir = path.join(process.cwd(), "public/biometric");
mkdirSync(outDir, { recursive: true });

async function processHead(input, output, flip = false) {
  let pipeline = sharp(input).ensureAlpha();
  if (flip) pipeline = pipeline.flop();

  const { data, info } = await pipeline
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = (r + g + b) / 3;
    if (lum < 18) {
      data[i + 3] = 0;
    } else if (lum < 40) {
      data[i + 3] = Math.round(((lum - 18) / 22) * 255);
    }
  }

  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * 4 + 3];
      if (a > 20) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const pad = 14;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(info.width - 1, maxX + pad);
  maxY = Math.min(info.height - 1, maxY + pad);

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract({
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    })
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(output);

  console.log("wrote", output);
}

await processHead(`${srcDir}/ref-front.png`, `${outDir}/front.png`);
await processHead(`${srcDir}/ref-right.png`, `${outDir}/right_profile.png`);
await processHead(
  `${srcDir}/ref-right.png`,
  `${outDir}/left_profile.png`,
  true
);
await processHead(`${srcDir}/ref-angled.png`, `${outDir}/angled.png`);
console.log("done");
