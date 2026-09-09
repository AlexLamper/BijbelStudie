'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { buildPalette } from '../../lib/levensboom/palette';
import { SCENE_BG, SCENE_BG_RGB } from '../scene/tokens';

/**
 * Deferred, because it cannot paint any sooner than this anyway: the canvas is
 * blank until its effect runs, so server-rendering the element bought nothing
 * while its module - the generator, the species table and the scene painter -
 * sat in the sign-in and sign-up bundles ahead of the form. The ground and the
 * gradients over it are still in the served HTML.
 *
 * Do not turn this into an SSR import. /inloggen measured an LCP of 9.33s in
 * production and the form has to reach the visitor with nothing in front of it.
 */
const TreeCanvas = dynamic(() => import('../levensboom/TreeCanvas'), { ssr: false });

/**
 * `SCENE_BG` as rgba, so the washes over the tree fade to exactly the ground
 * the immersive shell paints. Built from the token's own channels rather than
 * written out, so the two can never drift.
 */
const GROUND = `rgba(${SCENE_BG_RGB},`;

/*
 * The falloff.
 *
 * The picture has to reach the form's edge as nothing at all, and it has to get
 * there without ever showing where it went. A two- or three-stop ramp does not:
 * the eye reads the change of slope at each stop as a line (Mach banding), and
 * on a near-black ground over half a monitor that line is exactly the "cut" the
 * picture is supposed to not have. So every wash below is an eased ramp -
 * smoothstep, written out as stops, because these are CSS gradient strings -
 * run over a distance long enough that no stop is a landmark.
 *
 * Alpha is over `SCENE_BG` itself, so wherever a wash reaches 1 the panel IS
 * the page: the seam at the form's edge is the same colour on both sides, and
 * the picture has already dissolved well before it.
 */

/**
 * Toward the form: full ground for the first fifth, then eased away over the
 * remaining four fifths. Deeper than it was through the middle - that is the
 * "more faded" - and clearer at the far edge, so the tree keeps the light it
 * had.
 */
const WASH_FORM_SIDE =
  `linear-gradient(90deg, ${GROUND}1) 0%, ${GROUND}1) 18%, ${GROUND}0.96) 28%, ${GROUND}0.85) 37%,` +
  ` ${GROUND}0.7) 47%, ${GROUND}0.53) 56%, ${GROUND}0.36) 66%, ${GROUND}0.21) 76%,` +
  ` ${GROUND}0.1) 85%, ${GROUND}0.05) 95%, ${GROUND}0.04) 100%)`;

/**
 * The same ground pooled around the form's corner rather than ruled down it. A
 * straight vertical ramp still reads as a band with two sides; a radial one
 * reads as light running out, which is what it is meant to look like.
 */
const WASH_POOL =
  `radial-gradient(140% 110% at 8% 50%, ${GROUND}0.5) 0%, ${GROUND}0.34) 34%,` +
  ` ${GROUND}0.14) 62%, ${GROUND}0) 88%)`;

/**
 * The bottom, over roughly a third of the height instead of a fixed 12rem: the
 * earth band ends up about as dark as it always was, but the darkening now
 * starts far above it instead of switching on at a line.
 */
const WASH_BOTTOM =
  `linear-gradient(180deg, ${GROUND}0) 0%, ${GROUND}0.02) 20%, ${GROUND}0.08) 38%,` +
  ` ${GROUND}0.2) 54%, ${GROUND}0.38) 68%, ${GROUND}0.58) 80%, ${GROUND}0.76) 90%,` +
  ` ${GROUND}0.9) 100%)`;

/** The band under the top edge, on the same eased ramp and twice as tall. */
const WASH_TOP =
  `linear-gradient(180deg, ${GROUND}0.6) 0%, ${GROUND}0.56) 14%, ${GROUND}0.45) 32%,` +
  ` ${GROUND}0.29) 52%, ${GROUND}0.14) 72%, ${GROUND}0.05) 88%, ${GROUND}0) 100%)`;

/**
 * The canvas is a rectangle and the washes are not, so its own outer edge is
 * softened here as well - the corners go before the middle does. Purely a
 * safety net for the top-left of the frame, where the washes overlap least.
 */
const CANVAS_MASK =
  'radial-gradient(120% 135% at 66% 46%, #000 0%, #000 44%,' +
  ' rgba(0,0,0,0.74) 68%, rgba(0,0,0,0.32) 86%, transparent 100%)';

/**
 * The night behind the sign-in, sign-up and password screens: a tree at night
 * with fireflies in its crown, fading into the deep navy the copy sits on.
 * Fixed seed and palette, so the page looks the same for everyone and at any
 * hour.
 *
 * This predates `components/scene/` and is the same idea: one landscape, the
 * page travelling over it. It is aligned to the shell's ground rather than
 * replaced - the shell's own backdrop needs a session or a server-rendered SVG,
 * and neither belongs in front of a sign-in form.
 */
export default function AuthTreeBackdrop() {
  const palette = useMemo(() => buildPalette('summer', 'night', 1, { scene: 'waterbeken', species: 'eik' }), []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ backgroundColor: SCENE_BG }}>
      {/* Anchored right, wider than the panel, so the crown sits under the
          empty right half and the copy keeps the left. */}
      <div
        className="absolute inset-y-0"
        style={{ left: '14%', right: '-12%', WebkitMaskImage: CANVAS_MASK, maskImage: CANVAS_MASK }}
      >
        <TreeCanvas
          seed="bijbelstudie-auth"
          level={14}
          frac={0.7}
          species="eik"
          scene="waterbeken"
          animal="vuurvliegjes"
          framing="scene"
          palette={palette}
          className="block h-full w-full"
          ariaLabel=""
        />
      </div>
      {/* The wash toward the form, which also carries the copy - the same shape
          as SCRIM_LEFT, run long. */}
      <div className="absolute inset-0" style={{ background: WASH_FORM_SIDE }} />
      <div className="absolute inset-0" style={{ background: WASH_POOL }} />
      {/* The bottom wash, and a band of dark under the top edge. Both are a
          share of the height rather than a fixed one, so the falloff stays a
          falloff on a 2xl monitor instead of shrinking into an edge. */}
      <div className="absolute inset-x-0 bottom-0 h-[32%]" style={{ background: WASH_BOTTOM }} />
      <div className="absolute inset-x-0 top-0 h-[26%]" style={{ background: WASH_TOP }} />
    </div>
  );
}
