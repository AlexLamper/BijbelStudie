/**
 * Colour for the tree. Pure function of season, clock and health - no RNG,
 * which is why the parity fixtures can ignore it and stay clock-independent.
 *
 * Contract: docs/levensboom-spec.md §7.
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export type Palette = {
  /** Carried through so a renderer can draw the seasonal events of §6's
   *  `seasons` trait without re-deriving the month it already resolved. */
  season: Season;
  skyTop: string;
  skyBottom: string;
  glow: string;
  light: string;
  bark: string;
  barkLit: string;
  leaf: string;
  leafAlt: string;
  blossom: string | null;
  fruit: string;
  ground: string;
  night: boolean;
};

const SKY: Record<TimeOfDay, { top: string; bottom: string; glow: string; light: string }> = {
  dawn: { top: '#2E3A59', bottom: '#F7C6A0', glow: '#FFD9A0', light: '#FFE8CC' },
  day: { top: '#7EC8E3', bottom: '#DFF3F7', glow: '#FFF4D6', light: '#FFFFFF' },
  dusk: { top: '#4B3B6B', bottom: '#E9906B', glow: '#FFC38A', light: '#FFD9B3' },
  night: { top: '#0B1027', bottom: '#232C4D', glow: '#3E4E80', light: '#C9D6FF' },
};

const FOLIAGE: Record<Season, { leaf: string; leafAlt: string; blossom: string | null; fruit: string; ground: string }> = {
  spring: { leaf: '#6FBF73', leafAlt: '#8FD694', blossom: '#F7B8CE', fruit: '#E4572E', ground: '#4E7C43' },
  summer: { leaf: '#3F8F4F', leafAlt: '#57A862', blossom: '#F2A2C0', fruit: '#E0483B', ground: '#43703C' },
  autumn: { leaf: '#C9772E', leafAlt: '#E0A03C', blossom: null, fruit: '#B8442B', ground: '#6B5A32' },
  winter: { leaf: '#7D8B7A', leafAlt: '#9AA79A', blossom: null, fruit: '#A3452E', ground: '#5B6660' },
};

const BARK = '#4A3A2E';
const BARK_LIT = '#6B5442';
const NIGHT_MIX = '#1B2340';
const WILT_MIX = '#8A8F7A';

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
}

/** `amount` of `b` mixed into `a`. */
export function mix(a: string, b: string, amount: number): string {
  const from = parseHex(a);
  const to = parseHex(b);
  const t = Math.min(1, Math.max(0, amount));
  return toHex([
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ]);
}

export function seasonForMonth(month: number): Season {
  // `month` is 0-based, as `Date#getMonth` gives it.
  if (month <= 1 || month === 11) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}

export function timeOfDayForHour(hour: number): TimeOfDay {
  if (hour < 6 || hour >= 21) return 'night';
  if (hour < 9) return 'dawn';
  if (hour < 18) return 'day';
  return 'dusk';
}

export function buildPalette(season: Season, timeOfDay: TimeOfDay, health = 1): Palette {
  const sky = SKY[timeOfDay];
  const foliage = FOLIAGE[season];
  const night = timeOfDay === 'night';

  const desaturate = (color: string) => (night ? mix(color, NIGHT_MIX, 0.25) : color);
  const wilt = (color: string) => mix(color, WILT_MIX, (1 - health) * 0.4);

  return {
    season,
    skyTop: sky.top,
    skyBottom: sky.bottom,
    glow: sky.glow,
    light: sky.light,
    bark: desaturate(BARK),
    barkLit: desaturate(BARK_LIT),
    leaf: desaturate(wilt(foliage.leaf)),
    leafAlt: desaturate(wilt(foliage.leafAlt)),
    blossom: foliage.blossom ? desaturate(foliage.blossom) : null,
    fruit: desaturate(foliage.fruit),
    ground: desaturate(foliage.ground),
    night,
  };
}

/** The palette for "now" on whatever device is asking. */
export function paletteForNow(health = 1, now: Date = new Date()): Palette {
  return buildPalette(seasonForMonth(now.getMonth()), timeOfDayForHour(now.getHours()), health);
}
