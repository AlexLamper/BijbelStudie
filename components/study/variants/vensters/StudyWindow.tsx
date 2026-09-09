import React from 'react';

import {
  VIEW_H,
  VIEW_W,
  horizonOf,
  rgba,
  type StudyArt,
} from './studyHorizon';

/**
 * One window: a sky, a seeded horizon, an earth band, and whatever the caller
 * puts on the glass.
 *
 * No hooks and no 'use client', so the same component renders inside a server
 * component (the detail band, which is the LCP element there) and inside the
 * client catalogue. Nothing animates - a banner that moves is decoration, and
 * seventy-seven of them would be a page that never settles.
 *
 * The picture is `aria-hidden` throughout. A window says nothing a reader needs;
 * the title next to it does, and every caller labels its own link.
 */
export default function StudyWindow({
  art,
  className = '',
  children,
  /** Skips the sun and the stars: at thumbnail size they are noise, not detail. */
  quiet = false,
  style,
}: {
  art: StudyArt;
  className?: string;
  children?: React.ReactNode;
  quiet?: boolean;
  style?: React.CSSProperties;
}) {
  const p = art.palette;
  const horizon = horizonOf(art);
  const groundId = `vs-ground-${art.key}`;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(180deg, ${p.skyTop} 0%, ${p.skyBottom} 76%, ${p.skyBottom} 100%)`,
        ...style,
      }}
    >
      {!quiet && (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${art.light.x}%`,
            top: `${art.light.y}%`,
            height: p.night ? '9%' : '20%',
            aspectRatio: '1',
            transform: 'translate(-50%, -50%)',
            backgroundImage: `radial-gradient(circle, ${p.light} 0%, ${p.glow} 34%, ${rgba(p.glow, 0)} 72%)`,
          }}
        />
      )}

      {!quiet &&
        art.stars.map((star, index) => (
          <span
            key={index}
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.r,
              height: star.r,
              backgroundColor: p.light,
              opacity: 0.55 + (index % 3) * 0.15,
            }}
          />
        ))}

      {/* `preserveAspectRatio="none"` is the point: the horizon composes to
          whatever box it is given - 21:5, 16:10, 3:2 - instead of being cropped
          the way today's 16:6 art is inside a 96x64 thumb. */}
      <svg
        aria-hidden
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id={groundId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.ground} />
            <stop offset="100%" stopColor={p.groundDeep} />
          </linearGradient>
        </defs>

        {horizon.shapes.map((shape, index) => (
          <path key={index} d={shape.d} fill={shape.fill} opacity={shape.opacity} />
        ))}

        <path
          d={`M0 ${horizon.groundTop}H${VIEW_W}V${VIEW_H}H0Z`}
          fill={`url(#${groundId})`}
        />
      </svg>

      {/* A hairline inside the frame, so a pale sky still has an edge against a
          pale page. White at 10% reads on every palette in the set. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)' }}
      />

      {children}
    </div>
  );
}
