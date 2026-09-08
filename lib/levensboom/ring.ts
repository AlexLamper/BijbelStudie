/**
 * The ring around the avatar: the XP bar bent into a circle on the profile,
 * a plain rim in the navbar. `teal` is the brand ring; `goud` is the Pro
 * pick from the catalog.
 */

export type RingColors = {
  /** Flat stroke, for places that cannot draw a gradient. */
  stroke: string;
  /** Gradient ends for the SVG ring. */
  from: string;
  to: string;
  /** The rim's shadow at avatar sizes. */
  halo: string;
  /** The empty part of the ring. Null keeps the theme's neutral track. */
  track: string | null;
};

const RINGS: Record<string, RingColors> = {
  teal: {
    stroke: '#0D9488',
    from: '#14B8A6',
    to: '#0D9488',
    halo: 'rgba(13,148,136,0.35)',
    track: null,
  },
  goud: {
    stroke: '#D4A017',
    from: '#F6D77A',
    to: '#B8860B',
    halo: 'rgba(212,160,23,0.45)',
    track: 'rgba(212,160,23,0.18)',
  },
};

export function ringColors(ring: string | null | undefined): RingColors {
  return RINGS[ring ?? 'teal'] ?? RINGS.teal;
}
