import React from 'react';

import type { StudyArt } from '../../../../lib/studyArt';
import { WORLD, placeAt, type Distance } from './place';

/**
 * One window onto a study's world.
 *
 * No hooks and no 'use client', so the same component renders inside a server
 * component (where it is the LCP element) and inside the client catalogue.
 * Never a canvas: a canvas paints nothing until hydration, and this is the
 * first thing on the screen.
 *
 * The sky, the ground and the ridge are drawn at WORLD coordinates and the
 * `viewBox` does the travelling. That is what makes the catalogue, the study
 * band and the lesson strip read as one place rather than three: the same
 * gradient ramp, the same ridge, the same sun - a different window onto it.
 *
 * `preserveAspectRatio="none"` is deliberate: the window composes to whatever
 * box it is given instead of being centre-cropped, so a 3:1 band and a 16:10
 * card show the same amount of world rather than throwing a third of it away.
 *
 * The picture is `aria-hidden` throughout. A window says nothing a reader
 * needs; the title beside it does, and every caller labels its own link.
 */
export default function Horizon({
  art,
  distance,
  pan,
  className = '',
  style,
  /** Lands on the <svg>, for hover and arrival transforms. */
  artClassName = '',
  artStyle,
  /** Skips the sun and the stars: at thumbnail size they are noise, not detail. */
  quiet = false,
  children,
}: {
  art: StudyArt;
  distance: Distance;
  pan?: number;
  className?: string;
  style?: React.CSSProperties;
  artClassName?: string;
  artStyle?: React.CSSProperties;
  quiet?: boolean;
  children?: React.ReactNode;
}) {
  const { horizon, view, light } = placeAt(art, distance, pan);
  const p = art.palette;

  // Deterministic, so server and client agree. Two windows onto the same study
  // at the same distance would repeat an id, but they would also define exactly
  // the same gradient, so the duplicate is inert.
  const key = `${art.id.replace(/[^a-zA-Z0-9_-]/g, '')}-${distance}${pan == null ? '' : `-${Math.round(pan * 100)}`}`;
  const skyId = `pc-sky-${key}`;
  const groundId = `pc-grd-${key}`;
  const lightId = `pc-lit-${key}`;

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <svg
        aria-hidden
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="none"
        className={`absolute inset-0 h-full w-full ${artClassName}`}
        style={artStyle}
      >
        <defs>
          <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.skyTop} />
            <stop offset="76%" stopColor={p.skyBottom} />
            <stop offset="100%" stopColor={p.skyBottom} />
          </linearGradient>
          <linearGradient id={groundId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={horizon.ground} />
            <stop offset="100%" stopColor={horizon.groundDeep} />
          </linearGradient>
          {!quiet && (
            <radialGradient id={lightId}>
              <stop offset="0%" stopColor={p.light} stopOpacity={p.night ? 0.92 : 1} />
              <stop offset="34%" stopColor={p.glow} stopOpacity={0.5} />
              <stop offset="100%" stopColor={p.glow} stopOpacity={0} />
            </radialGradient>
          )}
        </defs>

        {/* The sky spans the whole world, so a nearer window shows the lower,
            warmer part of the same ramp instead of a differently mixed sky. */}
        <rect x="0" y="0" width={WORLD.w} height={WORLD.h} fill={`url(#${skyId})`} />

        {!quiet &&
          horizon.stars.map((star, index) => (
            <circle
              key={index}
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill={p.light}
              opacity={0.55 + (index % 3) * 0.15}
            />
          ))}

        {!quiet && <circle cx={light.cx} cy={light.cy} r={light.r} fill={`url(#${lightId})`} />}

        {horizon.layers.map((layer, index) => (
          <path key={index} d={layer.d} fill={layer.fill} opacity={layer.opacity} />
        ))}

        <rect
          x="0"
          y={horizon.groundTop}
          width={WORLD.w}
          height={WORLD.h - horizon.groundTop}
          fill={`url(#${groundId})`}
        />
      </svg>

      {/* A hairline inside the frame, so a pale sky still has an edge against a
          pale page. White at 12% reads on every palette in the set. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)' }}
      />

      {children}
    </div>
  );
}
