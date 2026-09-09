'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { buildPalette } from '../../lib/levensboom/palette';
import { SCENE_BG } from '../scene/tokens';

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
 * `SCENE_BG` (#0B1220) as rgba, so the washes over the tree fade to exactly the
 * ground the immersive shell paints. Written out rather than derived, because
 * these are CSS gradient strings.
 */
const GROUND = 'rgba(11,18,32,';

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
      <div className="absolute inset-y-0" style={{ left: '14%', right: '-12%' }}>
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
      {/* The left wash, which carries the copy - the same shape as SCRIM_LEFT. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, ${GROUND}1) 0%, ${GROUND}0.9) 30%, ${GROUND}0.45) 62%, ${GROUND}0.12) 100%)`,
        }}
      />
      {/* The bottom wash, and a band of dark under the top edge. */}
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{ background: `linear-gradient(180deg, ${GROUND}0) 0%, ${GROUND}0.92) 100%)` }}
      />
      <div
        className="absolute inset-x-0 top-0 h-32"
        style={{ background: `linear-gradient(180deg, ${GROUND}0.6) 0%, ${GROUND}0) 100%)` }}
      />
    </div>
  );
}
