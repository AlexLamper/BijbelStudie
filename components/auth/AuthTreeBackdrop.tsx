'use client';

import { useMemo } from 'react';
import TreeCanvas from '../levensboom/TreeCanvas';
import { buildPalette } from '../../lib/levensboom/palette';

/**
 * The dark panel's backdrop on the sign-in and sign-up pages: a levensboom at
 * night, fireflies in its crown, fading into the slate the copy sits on. Fixed
 * seed and palette, so the page looks the same for everyone and at any hour.
 */
export default function AuthTreeBackdrop() {
  const palette = useMemo(() => buildPalette('summer', 'night', 1, { scene: 'waterbeken', species: 'eik' }), []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
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
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #1F2937 0%, rgba(31,41,55,0.9) 30%, rgba(31,41,55,0.45) 62%, rgba(31,41,55,0.12) 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{ background: 'linear-gradient(180deg, rgba(31,41,55,0) 0%, rgba(31,41,55,0.92) 100%)' }}
      />
      <div
        className="absolute inset-x-0 top-0 h-32"
        style={{ background: 'linear-gradient(180deg, rgba(31,41,55,0.6) 0%, rgba(31,41,55,0) 100%)' }}
      />
    </div>
  );
}
