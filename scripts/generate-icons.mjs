/**
 * Renders the PWA icon set from one vector source so every size stays identical.
 *
 * WHY THIS EXISTS
 * The manifest points at PNGs in `public/icons/`. A missing or wrong-sized icon
 * is *the* classic reason a browser silently never offers "Install app" — there
 * is no error message, the prompt just never appears. So the icons are
 * generated here rather than hand-drawn four times, and the round-trip suite
 * (section 24) verifies each declared icon really exists at its declared size.
 *
 * Rasterisation uses `sharp`, which Next.js already vendors as a dependency.
 * The PNGs are committed, so nothing at build time or runtime needs sharp.
 *
 * Usage: npm run icons
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

/** Every icon is authored on one square canvas and then scaled. */
const CANVAS = 512;
const CX = CANVAS / 2;

/** Warm cream for the grain, so it reads as wheat rather than pure white. */
const CREAM = "#f9ebc4";

/** The mill's terracotta brand ramp — matches `clay-500` → `clay-700` in globals.css. */
const ROSE_FROM = "#bd5c37";
const ROSE_TO = "#8c3a22";

/**
 * The wheat ear. Pairs of grains hang off a central stem, tapering toward the
 * tip; each grain is a tall ellipse rotated so its top leans away from the stem.
 *
 * The stem is emitted FIRST so the grains paint over it — a stem drawn on top
 * would cut a visible seam straight down the middle of the ear.
 */
function wheatEar() {
  const parts = [];

  parts.push(
    `<line x1="${CX}" y1="420" x2="${CX}" y2="150" stroke="${CREAM}" stroke-width="15" stroke-linecap="round"/>`,
  );

  const grains = [
    { y: 352, rx: 23, ry: 40, d: 38, angle: 26 },
    { y: 302, rx: 23, ry: 40, d: 38, angle: 28 },
    { y: 252, rx: 22, ry: 38, d: 36, angle: 30 },
    { y: 204, rx: 20, ry: 34, d: 33, angle: 32 },
    { y: 160, rx: 17, ry: 28, d: 28, angle: 34 },
  ];

  for (const g of grains) {
    for (const side of [-1, 1]) {
      // SVG rotation is clockwise-positive, so the left grain takes the negative.
      const angle = side * -g.angle;
      parts.push(
        `<ellipse cx="${CX + side * g.d}" cy="${g.y}" rx="${g.rx}" ry="${g.ry}" ` +
          `transform="rotate(${angle} ${CX + side * g.d} ${g.y})"/>`,
      );
    }
  }

  parts.push(`<ellipse cx="${CX}" cy="118" rx="16" ry="30"/>`);

  // Awns — the fine bristles at the tip. Only on the crown, where a real ear has
  // them; running them down the body turns the glyph into visual mush at 48px.
  const awns = [
    { x1: CX - 14, y1: 130, x2: CX - 46, y2: 74 },
    { x1: CX, y1: 108, x2: CX, y2: 62 },
    { x1: CX + 14, y1: 130, x2: CX + 46, y2: 74 },
  ];
  for (const a of awns) {
    parts.push(
      `<line x1="${a.x1}" y1="${a.y1}" x2="${a.x2}" y2="${a.y2}" ` +
        `stroke="${CREAM}" stroke-width="8" stroke-linecap="round"/>`,
    );
  }

  return parts.join("");
}

/**
 * @param glyphScale 1 for a full-size glyph; lower for maskable, whose safe zone
 * is only the centre ~80% of the canvas (Android crops to a circle/squircle).
 */
function svg(glyphScale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${ROSE_FROM}"/>
      <stop offset="100%" stop-color="${ROSE_TO}"/>
    </linearGradient>
  </defs>
  <rect width="${CANVAS}" height="${CANVAS}" fill="url(#brand)"/>
  <g fill="${CREAM}" transform="translate(${CX} ${CX}) scale(${glyphScale}) translate(${-CX} ${-CX})">
    ${wheatEar()}
  </g>
</svg>`;
}

/**
 * `purpose: "any"` and `purpose: "maskable"` both ship a full-bleed square with
 * no rounded corners and no transparency. Android applies its own mask, so
 * pre-rounding here just produces a double-rounded edge.
 */
const TARGETS = [
  { file: "icon-192.png", size: 192, glyphScale: 1 },
  { file: "icon-512.png", size: 512, glyphScale: 1 },
  { file: "apple-touch-icon.png", size: 180, glyphScale: 1 },
  // 0.66 keeps the ear inside the centre safe circle Android masks against.
  { file: "icon-maskable-512.png", size: 512, glyphScale: 0.66 },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const t of TARGETS) {
    const out = path.join(OUT_DIR, t.file);
    await sharp(Buffer.from(svg(t.glyphScale)))
      .resize(t.size, t.size)
      .png({ compressionLevel: 9 })
      .toFile(out);

    const meta = await sharp(out).metadata();
    if (meta.width !== t.size || meta.height !== t.size || meta.format !== "png") {
      throw new Error(`${t.file}: expected a ${t.size}x${t.size} png, got ${meta.format} ${meta.width}x${meta.height}`);
    }
    console.log(`  ${t.file.padEnd(24)} ${meta.width}x${meta.height}  ${meta.format}`);
  }

  console.log(`\nWrote ${TARGETS.length} icons to public/icons/`);
}

main().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
