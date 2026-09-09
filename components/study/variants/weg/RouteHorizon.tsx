import React from 'react';

import {
  HORIZON,
  TEAL,
  hillPath,
  ridgePath,
  roadPoint,
  roadRibbon,
  type RouteArt,
} from './routeArt';

/**
 * The picture of a route: a seeded horizon out of the levensboom vocabulary,
 * with the road running from your feet to the vanishing point.
 *
 * No canvas, no image request, no animation - the sky is a CSS gradient and the
 * land is at most five `<path>`s, so the overview can carry seventy-seven of
 * these without the page ever settling down. The reader's own tree deliberately
 * does not appear: a study is not yours until you set out, and the tree means
 * your own progress.
 *
 * `preserveAspectRatio` is left at its default and the SVG carries the aspect
 * itself, so the art is composed at the size it renders instead of being
 * cropped to fit a box authored at a different ratio.
 */

export interface RouteMark {
  /** 0 at your feet, 1 at the horizon. */
  t: number;
  done: boolean;
  current?: boolean;
}

const W = 320;

export default function RouteHorizon({
  art,
  ratio = 2.6,
  walked = 0,
  marks = [],
  label,
  className = '',
}: {
  art: RouteArt;
  /** width / height. */
  ratio?: number;
  /** How much of the road is behind you, 0 to 1. */
  walked?: number;
  marks?: RouteMark[];
  /** Dutch, and never the word "levensboom". */
  label: string;
  className?: string;
}) {
  const H = Math.round(W / ratio);
  const groundTop = H * HORIZON;
  const glowX = Math.round(50 + art.bend * 22);
  const clamped = Math.max(0, Math.min(1, walked));

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: [
          `radial-gradient(58% 46% at ${glowX}% ${Math.round(HORIZON * 100)}%, ${art.glow}59, transparent 72%)`,
          `linear-gradient(180deg, ${art.skyTop}, ${art.skyBottom})`,
        ].join(', '),
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden focusable="false">
        {art.backdrop === 'stars' &&
          art.stars.map((star, index) => (
            <circle
              key={index}
              cx={star.x * W}
              cy={star.y * H}
              r={star.r}
              fill={art.glow}
              opacity={0.85}
            />
          ))}

        {art.backdrop === 'mountain' && (
          <path
            d={`M${-W * 0.1} ${groundTop}${art.peaks
              .map((peak, index) => `L${(index / (art.peaks.length - 1)) * W} ${groundTop - peak * H}`)
              .join('')}L${W * 1.1} ${groundTop}Z`}
            fill={art.far}
          />
        )}

        {art.backdrop === 'lake' && (
          <>
            <path
              d={ridgePath(W, H, groundTop - H * 0.13, art.ridgeFar)}
              fill={art.far}
            />
            <rect
              x={0}
              y={groundTop - H * 0.13}
              width={W}
              height={H * 0.13}
              fill={art.water ?? art.far}
            />
          </>
        )}

        {art.backdrop === 'wall' && (
          <rect x={0} y={groundTop - H * 0.16} width={W} height={H * 0.16} fill={art.far} />
        )}

        {(art.backdrop === 'hills' ||
          art.backdrop === 'garden' ||
          art.backdrop === 'dunes' ||
          art.backdrop === 'meadow') && (
          <path d={ridgePath(W, H, groundTop, art.ridgeFar)} fill={art.farAlt} />
        )}

        {art.backdrop !== 'lake' && art.backdrop !== 'stars' && (
          <path
            d={ridgePath(W, H, groundTop, art.ridgeNear)}
            fill={art.far}
            opacity={art.backdrop === 'meadow' ? 0.6 : 1}
          />
        )}

        {/* The ground the road is cut into. Two bands rather than a gradient:
            no <defs>, so this component never needs a unique id and can be
            rendered any number of times on one page. */}
        <rect x={0} y={groundTop} width={W} height={H - groundTop} fill={art.ground} />
        <rect x={0} y={H * 0.86} width={W} height={H * 0.14} fill={art.groundDeep} opacity={0.55} />

        {/* The surface with its shoulder drawn as a stroke - an even edge on
            both sides, which a second, wider ribbon would not give. */}
        <path
          d={roadRibbon(W, H, art.bend, 0, 1)}
          fill={art.road}
          stroke={art.roadEdge}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        {clamped > 0 && (
          <path d={roadRibbon(W, H, art.bend, 0, clamped)} fill={TEAL} opacity={0.88} />
        )}

        {marks.map((mark, index) => {
          const point = roadPoint(mark.t, W, H, art.bend);
          const size = Math.max(1.4, point.half * 0.3);
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={mark.current ? size * 1.7 : size}
              fill={mark.current ? '#ffffff' : mark.done ? '#ffffff' : art.roadEdge}
              stroke={mark.current || mark.done ? TEAL : 'none'}
              strokeWidth={mark.current ? size * 0.7 : size * 0.45}
            />
          );
        })}

        {/* A hair of shade along the very bottom, so the road reads as sunk
            into the ground rather than laid on top of it. */}
        <path
          d={hillPath(W, H * 0.995, H * 0.012, 2.4, art.ridgeNear.phase, 0)}
          fill={art.groundDeep}
          opacity={0.4}
        />
      </svg>
    </div>
  );
}
