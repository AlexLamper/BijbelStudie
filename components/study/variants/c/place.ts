import type { Palette } from '../../../../lib/levensboom/palette';
import { readableInk, studyHorizon, type StudyArt, type StudyHorizon } from '../../../../lib/studyArt';

/**
 * Ontwerp C - "Doorlopend": one place, seen from four distances.
 *
 * The other options draw a study's horizon three times and let the three
 * pictures be siblings. This one draws it ONCE - `studyHorizon(art, 200, 125)`,
 * the world - and every screen is a window onto those same coordinates. The
 * catalogue looks at the whole world from far off; the study's band steps in
 * toward the ridge; a lesson thumbnail is one stop along the walk; the lesson
 * screen itself stands on the ground with only a sliver of sky left above.
 *
 * Because the sky and ground gradients are painted across the WORLD and then
 * cropped, moving closer shows the lower, warmer part of the same ramp rather
 * than a new sky - which is the whole argument: you went somewhere, and it is
 * still the same somewhere.
 *
 * No art is generated here. Everything comes out of `lib/studyArt.ts`; this
 * module only decides which part of it you are looking at, and how the page
 * underneath is tinted.
 */

export const TEAL = '#0D9488';

/** The world, composed once. Every view below is a window onto these units. */
export const WORLD = { w: 200, h: 125 } as const;

/** How far into the study you are standing. */
export type Distance = 'ver' | 'nabij' | 'pad' | 'binnen';

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The four windows.
 *
 * `studyHorizon` puts the ground line at 74% of the composed height, so at
 * WORLD.h = 125 the ridge sits at y = 92.5. Each window is placed against that
 * number: `ver` keeps it low in a wide frame, `nabij` magnifies it without
 * moving it, `pad` is a single stop along the ridge, and `binnen` drops below
 * it so the ground owns the frame and the sky is a band at the top.
 */
export const VIEW: Record<Distance, View> = {
  /** The catalogue: the whole world, small. 1.60:1 - the card ratio. */
  ver: { x: 0, y: 0, w: 200, h: 125 },
  /** The study band: the same ridge, nearer, in a slim frame. 2.90:1. */
  nabij: { x: 16, y: 50, w: 168, h: 58 },
  /** One lesson, one stop along the walk. 1.61:1 - the thumbnail ratio. */
  pad: { x: 20, y: 49, w: 100, h: 62 },
  /** Standing in it: ground below, a band of sky above. 3.50:1. */
  binnen: { x: 62, y: 86, w: 84, h: 24 },
};

/** Two decimals, as a number. Keeps the serialized SVG short and stable. */
const f = (n: number) => Math.round(n * 100) / 100;

export interface Place {
  horizon: StudyHorizon;
  view: View;
  /**
   * Sun or moon, in world coordinates, derived from the seeded phase - so the
   * light hangs in the same spot at every distance and simply leaves the frame
   * once you are standing under the ridge.
   */
  light: { cx: number; cy: number; r: number };
}

/**
 * One window onto one study.
 *
 * `pan` (0..1) slides the window along whatever room the view leaves in the
 * world, which is how twelve lessons become twelve points along one walk
 * instead of twelve unrelated pictures. It is a caller-supplied fraction, never
 * a random draw.
 */
export function placeAt(art: StudyArt, distance: Distance, pan?: number): Place {
  const horizon = studyHorizon(art, WORLD.w, WORLD.h);
  const frame = VIEW[distance];
  const room = Math.max(0, WORLD.w - frame.w);
  const x = pan == null ? frame.x : f(room * Math.min(1, Math.max(0, pan)));

  return {
    horizon,
    view: { ...frame, x },
    light: {
      cx: f((art.shape.phase / (Math.PI * 2)) * WORLD.w),
      cy: f(horizon.groundTop * 0.34),
      r: f(WORLD.h * (art.palette.night ? 0.1 : 0.24)),
    },
  };
}

/**
 * Where along the walk one lesson stands.
 *
 * Spread over a fixed stride rather than over the lesson count, so lesson 3 of
 * a three-lesson study and lesson 3 of Psalmen stand in the same spot: the
 * study is one landscape, and a short study is a short stretch of it rather
 * than a compressed copy of the whole thing.
 */
export function panForDay(day: number): number {
  return ((day - 1) % 12) / 12;
}

/**
 * The scrims.
 *
 * Literal slate-950 alphas, never a theme token: a window keeps its own palette
 * in both themes, so whatever guarantees white text has to be theme-independent
 * too. Anything sitting in the bottom third of a card window is over at least
 * 0.78 alpha, which clears 10:1 against white even on the brightest sky the
 * palette can produce (the summer noon dune).
 */
export const SCRIM_CARD =
  'linear-gradient(to top, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.80) 38%, rgba(2,6,23,0.40) 66%, rgba(2,6,23,0) 100%)';
/**
 * For the wide bands, where text runs the whole width so the floor has to hold
 * everywhere. 0.72 is the thinnest point: over the brightest sky in the set
 * that is still about 9:1 for white text, and the two ends where the label and
 * the back link actually sit are darker again.
 */
export const SCRIM_BAND =
  'linear-gradient(to right, rgba(2,6,23,0.88) 0%, rgba(2,6,23,0.72) 48%, rgba(2,6,23,0.82) 100%)';
export const SCRIM_SLIVER =
  'linear-gradient(to right, rgba(2,6,23,0.90) 0%, rgba(2,6,23,0.80) 55%, rgba(2,6,23,0.88) 100%)';

/** White on a scrim. Literal, for the same reason the scrim is. */
export const ON_ART = '#ffffff';
export const ON_ART_MUTED = 'rgba(255,255,255,0.86)';
export const ON_ART_FAINT = 'rgba(255,255,255,0.68)';

export function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The page tint: custom properties derived from one study's palette, plus the
 * hover, focus and rule states that use them.
 *
 * Scoped to an element id, so two tinted regions can never leak into each
 * other, and split light/dark because `darkMode: ["class"]` puts `.dark` on
 * <html>. The brand teal is never replaced - it keeps the one primary action;
 * the study's own colour takes the eyebrows, the rules and the hover.
 *
 * `readableInk` is what makes that safe: a starfield accents at a pale yellow
 * that would vanish on white, and a summer meadow at a green that would vanish
 * on slate-950, so both are pushed until they clear 4.5:1 on the ground they
 * will actually sit on.
 */
export function placeCss(scopeId: string, palette: Palette): string {
  const light = readableInk(palette.accent, false);
  const dark = readableInk(palette.accent, true);

  /**
   * `--pc-solid` is the LIGHT ink in both themes: it is the only variable that
   * ever sits under white text (the primary button's hover), and the dark-mode
   * ink is deliberately bright so it can be read as text on a dark ground -
   * which makes it exactly the wrong thing to put behind a white label.
   */
  const vars = (ink: string) =>
    [
      `--pc-ink:${ink}`,
      `--pc-rule:${rgba(ink, 0.26)}`,
      `--pc-wash:${rgba(ink, 0.06)}`,
      `--pc-wash-strong:${rgba(ink, 0.12)}`,
      `--pc-edge:${rgba(ink, 0.16)}`,
      `--pc-solid:${light}`,
    ].join(';');

  return [
    `#${scopeId}{${vars(light)}}`,
    `.dark #${scopeId}{${vars(dark)}}`,

    // The reading ground: the theme's own background, and NOTHING else.
    //
    // It used to carry the study's colour over it at 6%. That is the one place
    // an accent must never go - it made every C lesson a faintly blue-green (or
    // amber, or violet) screen depending on which study you had opened, where
    // ontwerpen A and B stand on the plain `bg-background` the rest of the app
    // stands on. The study's ink still owns the eyebrow, the rules, the row
    // hover and the focus ring; it no longer owns the ground under the
    // scripture.
    `#${scopeId}.pc-ground,#${scopeId} .pc-ground{background-color:hsl(var(--background))}`,

    `#${scopeId} .pc-ink{color:var(--pc-ink)}`,
    `#${scopeId} .pc-rule{background-color:var(--pc-rule)}`,
    `#${scopeId} .pc-wash{background-color:var(--pc-wash)}`,
    `#${scopeId} .pc-wash-strong{background-color:var(--pc-wash-strong)}`,
    `#${scopeId} .pc-edge{border-color:var(--pc-edge)}`,
    `#${scopeId} .pc-edge-hover:hover{border-color:var(--pc-ink)}`,
    `#${scopeId} .pc-hover:hover{color:var(--pc-ink)}`,
    `#${scopeId} .pc-row:hover{background-color:var(--pc-wash)}`,
    `#${scopeId} .pc-primary{background-color:${TEAL}}`,
    `#${scopeId} .pc-primary:hover{background-color:var(--pc-solid)}`,
    `#${scopeId} .pc-focus:focus-visible{outline:2px solid var(--pc-ink);outline-offset:2px;border-radius:0.5rem}`,
    // A control standing ON the picture cannot take the study's ink - half the
    // palettes would put a dark ring on a dark sky. White is the one colour
    // guaranteed against every scrim, which is why the text on glass is white.
    `#${scopeId} .pc-focus-art:focus-visible{outline:2px solid #ffffff;outline-offset:2px;border-radius:0.5rem}`,

    // Arriving. Transform only, never opacity: a band is frequently the LCP
    // element and has to be fully painted in the first frame, so the movement
    // is a settle rather than a fade-in. Everything sits inside the
    // reduced-motion guard, and nothing here loops.
    '@media (prefers-reduced-motion: no-preference){',
    '@keyframes pc-approach{from{transform:scale(1.055)}to{transform:none}}',
    `#${scopeId} .pc-approach{animation:pc-approach 620ms cubic-bezier(0.16,1,0.3,1) both}`,
    '@keyframes pc-arrive{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}',
    `#${scopeId} .pc-arrive{animation:pc-arrive 240ms cubic-bezier(0.16,1,0.3,1) both}`,
    '}',
  ].join('');
}

export type { StudyArt, StudyHorizon };
