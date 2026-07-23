#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');

const SOURCE_LOGOMARK_WHITE = path.join(
  workspaceRoot,
  'presentations/design-system/assets/logos/within-logomark-white.png'
);

const OUTPUT_DIR = path.join(projectRoot, 'public/icons');

const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };

/**
 * Composite the white WITHIN logomark, scaled to fit inside a padded box,
 * centered on an opaque black square canvas. Both maskable home-screen icons
 * and the iOS apple-touch-icon need a fully opaque background (no alpha) and
 * safe padding so an OS-applied mask never clips the mark.
 */
async function renderIcon(size, paddingRatio, outFile) {
  const innerSize = Math.round(size * (1 - paddingRatio * 2));
  const mark = await sharp(SOURCE_LOGOMARK_WHITE)
    .resize({ width: innerSize, height: innerSize, fit: 'inside' })
    .toBuffer();
  const markMeta = await sharp(mark).metadata();
  const markWidth = markMeta.width ?? innerSize;
  const markHeight = markMeta.height ?? innerSize;

  await sharp({
    create: { width: size, height: size, channels: 4, background: BLACK },
  })
    .composite([{ input: mark, left: Math.round((size - markWidth) / 2), top: Math.round((size - markHeight) / 2) }])
    .flatten({ background: BLACK })
    .removeAlpha()
    .png()
    .toFile(outFile);
}

async function main() {
  if (!fs.existsSync(SOURCE_LOGOMARK_WHITE)) {
    throw new Error(`Source logomark not found: ${SOURCE_LOGOMARK_WHITE}`);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await renderIcon(192, 0.2, path.join(OUTPUT_DIR, 'icon-192.png'));
  await renderIcon(512, 0.2, path.join(OUTPUT_DIR, 'icon-512.png'));
  await renderIcon(180, 0.2, path.join(OUTPUT_DIR, 'apple-touch-icon.png'));

  console.log(`Generated icons in ${path.relative(projectRoot, OUTPUT_DIR)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
