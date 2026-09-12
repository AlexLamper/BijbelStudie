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
  /*
   * `goud` is cut from the same metal as the Pro badge (--grad-pro-badge in
   * app/globals.css): a lit gold falling to one deep gold edge.
   *
   * `stroke` carries a constraint the other fields do not. Four components -
   * NavTreeAvatar, MiniTreeAvatar, ProgressTree and levensboom/TreeAvatar -
   * reuse it as the FILL under the white level number, so it is not only a rim
   * colour, it is a text background. The old #D4A017 put white on gold at
   * 2.38:1, worse than the 2.6:1 the design system explicitly bans. #926C10 is
   * the lightest gold that still clears 4.5:1 against white (4.80:1), and it
   * doubles as a stronger rim: 4.80:1 against a white card and 3.09:1 against
   * the avatar's own pale sky, where #D4A017 all but disappeared.
   *
   * `from`/`to` are the XP arc. The old #F6D77A start was 1.4:1 on a white
   * card - a 4 px stroke nobody could see at low XP. #D8A92E holds 2.18:1 on
   * white and 5.42:1 on the dark scene, so the same arc works on both grounds.
   */
  goud: {
    stroke: '#926C10',
    from: '#D8A92E',
    to: '#926C10',
    halo: 'rgba(202,154,22,0.42)',
    track: 'rgba(202,154,22,0.22)',
  },
};

export function ringColors(ring: string | null | undefined): RingColors {
  return RINGS[ring ?? 'teal'] ?? RINGS.teal;
}
