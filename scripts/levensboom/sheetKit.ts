import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Resvg } from '@resvg/resvg-js';

/**
 * Contact-sheet layout and rasterising for `npm run tree:sheet`.
 *
 * A sheet is a title, then lines. A line is one or more groups side by side;
 * a group is a label column plus cells. A cell is a complete tree `<svg>`
 * (as `renderSceneSvg` returns it) nested at its display size, so resvg
 * rasterises every tree as vectors at the final resolution - no blurry
 * downscaling. Plain SVG out, PNG via resvg, nothing else.
 */

export const SHEET_DIR = path.resolve(__dirname, '../../design/levensboom/sheets');

/** Sheets stay about this wide, so a model reading the PNG sees it at full resolution. */
export const SHEET_WIDTH = 1600;

const PAD = 16;
const GAP = 4;
const GROUP_GAP = 16;
const LINE_GAP = 6;
const LABEL_W = 88;
const BELOW = 15;
const FONT = 'Arial, Helvetica, sans-serif';
const INK = '#0f172a';
const MUTED = '#475569';
const TEAL = '#0D9488';
const BACKGROUND = '#f8fafc';

export type Cell = {
  /** A complete `<svg>` document with `viewBox="0 0 width height"`. */
  svg: string;
  /** The svg's own size. */
  width: number;
  height: number;
  /** Display scale on the sheet; 1 = real size. */
  scale: number;
  label?: string;
  /** Second label, bottom-right inside the cell (counts and the like). */
  note?: string;
  /** Put the label under the cell, for cells too small to hold it. */
  labelBelow?: boolean;
  /** Clip to a disc, as the UI crops a portrait. */
  disc?: boolean;
  /** Teal frame: a whole step, the new state of a level-up. */
  accent?: boolean;
  /** Minimum horizontal advance, so cells of different sizes line up in columns. */
  slot?: number;
};

export type Group = { label?: string; sublabel?: string; cells: Cell[] };
export type Line = { heading?: string; groups: Group[] };
export type SheetSpec = {
  /** File name without `.png`. */
  name: string;
  title: string;
  subtitle?: string[];
  lines: Line[];
  labelWidth?: number;
};

/**
 * The display scale at which `columns` cells of `nativeWidth`, in `groups`
 * labelled groups per line, fill a sheet line. Never above real size.
 */
export function fitScale(nativeWidth: number, columns: number, groups = 1, labelWidth = LABEL_W): number {
  const fixed = 2 * PAD + groups * labelWidth + (groups - 1) * GROUP_GAP + groups * (columns - 1) * GAP;
  const cell = Math.floor((SHEET_WIDTH - fixed) / (groups * columns));
  return Math.min(1, cell / nativeWidth);
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Rough Arial advance; only used to size label pills and the sheet's minimum width. */
function textWidth(value: string, size: number, bold = false): number {
  return value.length * size * (bold ? 0.6 : 0.54);
}

function text(x: number, y: number, value: string, size: number, opts: { bold?: boolean; fill?: string; anchor?: string } = {}): string {
  return (
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${FONT}" font-size="${size}"` +
    `${opts.bold ? ' font-weight="bold"' : ''}${opts.anchor ? ` text-anchor="${opts.anchor}"` : ''} fill="${opts.fill ?? INK}">${esc(value)}</text>`
  );
}

/** Every cell carries the same gradient ids when seed and position repeat; prefix them per cell. */
function uniquifyIds(svg: string, prefix: string): string {
  const ids = new Set<string>();
  for (const match of svg.matchAll(/\bid="([^"]+)"/g)) ids.add(match[1]);
  let out = svg;
  for (const id of ids) {
    out = out.split(`id="${id}"`).join(`id="${prefix}${id}"`).split(`url(#${id})`).join(`url(#${prefix}${id})`);
  }
  return out;
}

function nestCell(cell: Cell, x: number, y: number, index: number): string {
  const w = cell.width * cell.scale;
  const h = cell.height * cell.scale;
  const inner = uniquifyIds(cell.svg, `k${index}_`).replace(
    /^<svg\b[^>]*>/,
    `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" viewBox="0 0 ${cell.width} ${cell.height}">`,
  );
  const parts: string[] = [];
  if (cell.disc) {
    parts.push(
      `<clipPath id="disc${index}"><circle cx="${(x + w / 2).toFixed(2)}" cy="${(y + h / 2).toFixed(2)}" r="${(Math.min(w, h) / 2).toFixed(2)}"/></clipPath>`,
      `<g clip-path="url(#disc${index})">${inner}</g>`,
    );
  } else {
    parts.push(inner);
  }
  if (cell.accent) {
    parts.push(
      `<rect x="${(x + 1).toFixed(2)}" y="${(y + 1).toFixed(2)}" width="${(w - 2).toFixed(2)}" height="${(h - 2).toFixed(2)}" fill="none" stroke="${TEAL}" stroke-width="2"/>`,
    );
  }
  if (cell.label) {
    if (cell.labelBelow) {
      parts.push(text(x, y + h + 11, cell.label, 10, { fill: MUTED }));
    } else {
      const pw = textWidth(cell.label, 11) + 8;
      parts.push(
        `<rect x="${(x + 3).toFixed(2)}" y="${(y + 3).toFixed(2)}" width="${pw.toFixed(1)}" height="15" rx="3" fill="#ffffff" fill-opacity="0.85"/>`,
        text(x + 7, y + 14, cell.label, 11),
      );
    }
  }
  if (cell.note) {
    const nw = textWidth(cell.note, 10) + 8;
    parts.push(
      `<rect x="${(x + w - 3 - nw).toFixed(2)}" y="${(y + h - 17).toFixed(2)}" width="${nw.toFixed(1)}" height="14" rx="3" fill="#ffffff" fill-opacity="0.8"/>`,
      text(x + w - 7, y + h - 6.5, cell.note, 10, { fill: MUTED, anchor: 'end' }),
    );
  }
  return parts.join('');
}

export function composeSheet(spec: SheetSpec): { svg: string; width: number; height: number; cells: number } {
  const labelW = spec.labelWidth ?? LABEL_W;
  const body: string[] = [];
  let y = PAD;
  let right = 0;
  let index = 0;

  body.push(text(PAD, y + 18, spec.title, 20, { bold: true }));
  right = Math.max(right, PAD + textWidth(spec.title, 20, true));
  y += 28;
  for (const sub of spec.subtitle ?? []) {
    body.push(text(PAD, y + 12, sub, 12, { fill: MUTED }));
    right = Math.max(right, PAD + textWidth(sub, 12));
    y += 17;
  }
  y += 10;

  for (const line of spec.lines) {
    if (line.heading) {
      body.push(text(PAD, y + 13, line.heading, 13, { bold: true }));
      right = Math.max(right, PAD + textWidth(line.heading, 13, true));
      y += 20;
    }
    let x = PAD;
    let lineH = 0;
    line.groups.forEach((group, g) => {
      if (g > 0) x += GROUP_GAP - GAP;
      if (group.label !== undefined) {
        body.push(text(x, y + 13, group.label, 12, { bold: true }));
        if (group.sublabel) body.push(text(x, y + 28, group.sublabel, 11, { fill: MUTED }));
        x += labelW;
      }
      for (const cell of group.cells) {
        const w = cell.width * cell.scale;
        const h = cell.height * cell.scale;
        body.push(nestCell(cell, x, y, index));
        index += 1;
        lineH = Math.max(lineH, h + (cell.label && cell.labelBelow ? BELOW : 0));
        x += Math.max(w, cell.slot ?? 0) + GAP;
      }
    });
    right = Math.max(right, x - GAP);
    y += lineH + LINE_GAP;
  }

  const width = Math.ceil(right + PAD);
  const height = Math.ceil(y - LINE_GAP + PAD);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${BACKGROUND}"/>${body.join('')}</svg>`;
  return { svg, width, height, cells: index };
}

/** One regular font file is enough and loads in a millisecond; scanning every system font takes far longer. */
const FONT_FILES = [
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/arialbd.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
].filter((file) => existsSync(file));

export function rasterize(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    background: BACKGROUND,
    font:
      FONT_FILES.length > 0
        ? { loadSystemFonts: false, fontFiles: FONT_FILES, defaultFontFamily: FONT_FILES[0].includes('DejaVu') ? 'DejaVu Sans' : 'Arial' }
        : { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  });
  return resvg.render().asPng();
}

export type SheetResult = { file: string; width: number; height: number; cells: number; ms: number };

/** Build, compose, rasterise and write one sheet; prints one summary line. */
export async function writeSheet(build: () => SheetSpec | Promise<SheetSpec>): Promise<SheetResult> {
  const start = performance.now();
  const spec = await build();
  const { svg, width, height, cells } = composeSheet(spec);
  const png = rasterize(svg);
  mkdirSync(SHEET_DIR, { recursive: true });
  const file = path.join(SHEET_DIR, `${spec.name}.png`);
  writeFileSync(file, png);
  if (process.env.SHEET_SVG) writeFileSync(path.join(SHEET_DIR, `${spec.name}.svg`), svg);
  const ms = Math.round(performance.now() - start);
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  console.log(`${rel}  ${width}x${height}  ${cells} trees  ${(png.length / 1024).toFixed(0)} KB  ${ms} ms`);
  return { file, width, height, cells, ms };
}
