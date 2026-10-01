/**
 * The "Tekst van de dag" share image: a 1080 x 1920 portrait PNG (the 9:16 of
 * a WhatsApp or Instagram status), YouVersion style, drawn client-side on a
 * canvas. Same layout as the app's `daily_verse_share_image.dart`, which lays
 * it out at 360 x 640 and captures at 3x; every measure below is the app's
 * value times three.
 *
 * The reader's background edge to edge (cover-cropped), a dark wash for
 * legibility, the verse centred in a serif at the largest size that fits,
 * the reference with its version under it, the licence notice where the
 * translation needs one, and the app icon with "bijbelstudie.io" at the foot.
 *
 * Browser only: it needs `document` and a 2D canvas.
 */

export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1920;

const SIDE = 102;
const TOP = 216;
const BOTTOM = 120;
const WORDMARK_H = 54;
const WORDMARK_GAP = 84;

const VERSE_MAX = 90;
const VERSE_MIN = 39;
const VERSE_STEP = 3;
const VERSE_LINE = 1.45;
const LABEL_SIZE = 45;
const LABEL_LINE = 1.3;
const NOTICE_SIZE = 28.5;
const NOTICE_LINE = 1.3;
const GAP_LABEL = 66;
const GAP_NOTICE = 30;

const SHADOW = { color: 'rgba(0,0,0,0.4)', blur: 12, y: 3 };

export type ShareImageInput = {
  /** The background, already loaded: the day's photo or the tree's canvas. */
  background: CanvasImageSource | null;
  /** Its intrinsic size, for the cover crop. */
  backgroundWidth: number;
  backgroundHeight: number;
  /** A light wash of its own over the photo, as the card lays over it. */
  photoWash: boolean;
  text: string;
  /** Reference and version, e.g. "Johannes 3:16 SV". */
  label: string;
  /** Verbatim licence notice (NBG51), or null. */
  attribution: string | null;
  /** The loaded app icon, or null to leave it out. */
  logo: HTMLImageElement | null;
  /** Resolved CSS font-family lists (the page's own Lora and Inter). */
  serifFamily: string;
  sansFamily: string;
};

/** Resolves once the image has loaded (and decoded, where the browser can). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(() => resolve(img), () => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = () => reject(new Error(`Image failed to load: ${src}`));
    img.src = src;
  });
}

/** Waits for the web fonts the canvas is about to use; a failure just falls back. */
async function loadFonts(input: ShareImageInput): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`500 ${VERSE_MAX}px ${input.serifFamily}`, input.text),
      document.fonts.load(`700 ${LABEL_SIZE}px ${input.sansFamily}`, input.label),
      document.fonts.load(`600 39px ${input.sansFamily}`, 'bijbelstudie.io'),
    ]);
  } catch {
    // The fallback serif and sans still draw a readable image.
  }
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // Chrome 99+, Safari 17+, Firefox 115+; elsewhere the text is just tighter.
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = `${px}px`;
}

/** Word-wraps `text` to `maxWidth` in the context's current font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
      // A single word wider than the column (rare): break it by characters.
      while (ctx.measureText(line).width > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Cuts `lines` to `max`, ending the last one with an ellipsis that fits. */
function clampLines(ctx: CanvasRenderingContext2D, lines: string[], max: number, maxWidth: number): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, Math.max(1, max));
  let last = kept[kept.length - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1).trimEnd();
  }
  kept[kept.length - 1] = `${last}…`;
  return kept;
}

function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number) {
  if (sw <= 0 || sh <= 0) return;
  const scale = Math.max(SHARE_WIDTH / sw, SHARE_HEIGHT / sh);
  const w = sw * scale;
  const h = sh * scale;
  ctx.drawImage(source, (SHARE_WIDTH - w) / 2, (SHARE_HEIGHT - h) / 2, w, h);
}

function withShadow(ctx: CanvasRenderingContext2D, draw: () => void) {
  ctx.save();
  ctx.shadowColor = SHADOW.color;
  ctx.shadowBlur = SHADOW.blur;
  ctx.shadowOffsetY = SHADOW.y;
  draw();
  ctx.restore();
}

/** Draws the share image and encodes it as a PNG. */
export async function renderDailyVerseShareImage(input: ShareImageInput): Promise<Blob> {
  await loadFonts(input);

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas');

  // Ground first, so a background that failed to load still gives a card.
  ctx.fillStyle = '#3B4A52';
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  if (input.background) {
    drawCover(ctx, input.background, input.backgroundWidth, input.backgroundHeight);
  }
  if (input.photoWash) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  }
  const wash = ctx.createLinearGradient(0, 0, 0, SHARE_HEIGHT);
  wash.addColorStop(0, 'rgba(0,0,0,0.35)');
  wash.addColorStop(0.3, 'rgba(0,0,0,0.45)');
  wash.addColorStop(0.7, 'rgba(0,0,0,0.45)');
  wash.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);

  // The verse box: between the top inset and the wordmark.
  const boxW = SHARE_WIDTH - SIDE * 2;
  const boxTop = TOP;
  const boxBottom = SHARE_HEIGHT - BOTTOM - WORDMARK_H - WORDMARK_GAP;
  const boxH = boxBottom - boxTop;
  const cx = SHARE_WIDTH / 2;

  // Reference and notice first: they keep their size, the verse gives way.
  ctx.font = `700 ${LABEL_SIZE}px ${input.sansFamily}`;
  setSpacing(ctx, 0.9);
  const labelLines = wrap(ctx, input.label, boxW);
  setSpacing(ctx, 0);
  ctx.font = `400 ${NOTICE_SIZE}px ${input.sansFamily}`;
  const noticeLines = input.attribution ? wrap(ctx, input.attribution, boxW) : [];
  const labelH = labelLines.length * LABEL_SIZE * LABEL_LINE;
  const noticeH = noticeLines.length ? GAP_NOTICE + noticeLines.length * NOTICE_SIZE * NOTICE_LINE : 0;
  const reserved = GAP_LABEL + labelH + noticeH;

  // The largest verse size that lets all three fit the box.
  let size = VERSE_MIN;
  let verseLines: string[] = [];
  for (let s = VERSE_MAX; s >= VERSE_MIN; s -= VERSE_STEP) {
    ctx.font = `500 ${s}px ${input.serifFamily}`;
    const lines = wrap(ctx, input.text, boxW);
    if (lines.length * s * VERSE_LINE + reserved <= boxH || s - VERSE_STEP < VERSE_MIN) {
      size = s;
      verseLines = lines;
      break;
    }
  }
  ctx.font = `500 ${size}px ${input.serifFamily}`;
  // Past the smallest size the verse is cut off rather than pushing the
  // reference out of the box.
  const maxLines = Math.max(1, Math.floor((boxH - reserved) / (size * VERSE_LINE)));
  verseLines = clampLines(ctx, verseLines, maxLines, boxW);
  const verseH = verseLines.length * size * VERSE_LINE;

  const blockH = verseH + reserved;
  let y = boxTop + Math.max(0, (boxH - blockH) / 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';

  withShadow(ctx, () => {
    ctx.font = `500 ${size}px ${input.serifFamily}`;
    for (const line of verseLines) {
      ctx.fillText(line, cx, y + (size * VERSE_LINE) / 2);
      y += size * VERSE_LINE;
    }
    y += GAP_LABEL;
    ctx.font = `700 ${LABEL_SIZE}px ${input.sansFamily}`;
    setSpacing(ctx, 0.9);
    for (const line of labelLines) {
      ctx.fillText(line, cx, y + (LABEL_SIZE * LABEL_LINE) / 2);
      y += LABEL_SIZE * LABEL_LINE;
    }
    setSpacing(ctx, 0);
  });

  if (noticeLines.length) {
    y += GAP_NOTICE;
    ctx.font = `400 ${NOTICE_SIZE}px ${input.sansFamily}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const line of noticeLines) {
      ctx.fillText(line, cx, y + (NOTICE_SIZE * NOTICE_LINE) / 2);
      y += NOTICE_SIZE * NOTICE_LINE;
    }
  }

  // The wordmark: app icon and domain, centred as one row, at 85 %.
  const markY = SHARE_HEIGHT - BOTTOM - WORDMARK_H;
  const word = 'bijbelstudie.io';
  ctx.font = `600 39px ${input.sansFamily}`;
  setSpacing(ctx, 1.2);
  const wordW = ctx.measureText(word).width;
  const icon = input.logo ? WORDMARK_H : 0;
  const gap = input.logo ? 21 : 0;
  const rowX = cx - (icon + gap + wordW) / 2;
  ctx.save();
  ctx.globalAlpha = 0.85;
  if (input.logo) {
    ctx.save();
    ctx.beginPath();
    const r = 15;
    const x0 = rowX;
    const y0 = markY;
    ctx.moveTo(x0 + r, y0);
    ctx.arcTo(x0 + icon, y0, x0 + icon, y0 + icon, r);
    ctx.arcTo(x0 + icon, y0 + icon, x0, y0 + icon, r);
    ctx.arcTo(x0, y0 + icon, x0, y0, r);
    ctx.arcTo(x0, y0, x0 + icon, y0, r);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(input.logo, x0, y0, icon, icon);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  withShadow(ctx, () => {
    ctx.fillText(word, rowX + icon + gap, markY + WORDMARK_H / 2);
  });
  ctx.restore();
  setSpacing(ctx, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png');
  });
}

/** `tekst-van-de-dag-20260930.png`, from the local calendar day. */
export function shareFileName(date = new Date()): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `tekst-van-de-dag-${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}.png`;
}

/**
 * Shares the PNG through the Web Share sheet where the browser can share
 * files (mostly phones), else downloads it. Returns what happened; a share
 * the reader cancels is "cancelled", not a failure. "blocked" means the
 * browser refused the share because the tap's activation ran out while the
 * image was drawn - the caller can ask for a second tap.
 */
export async function shareOrDownload(
  blob: Blob,
  fileName: string,
  title: string,
): Promise<'shared' | 'cancelled' | 'blocked' | 'downloaded'> {
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (error) {
      const name = (error as { name?: string } | null)?.name;
      if (name === 'AbortError') return 'cancelled';
      if (name === 'NotAllowedError') return 'blocked';
      // Anything else: fall through to the download.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return 'downloaded';
}
