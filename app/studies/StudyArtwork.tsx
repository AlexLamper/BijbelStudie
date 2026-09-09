import React from 'react'

import { studyArtFor, studyHorizon, type StudyArtKind } from '../../lib/studyArt'

/**
 * One study's own horizon, drawn.
 *
 * All of the geometry, the palette, the season and the time of day come out of
 * `lib/studyArt.ts` - seeded per study id and clock-free, so the server and the
 * client agree and a study keeps the same picture forever. This file only
 * paints what that module already decided; it is not a second art system and it
 * must never draw anything of its own.
 *
 * No `"use client"`: nothing here holds state, so the same component renders
 * inside the server-rendered study page (where it is the largest thing on the
 * screen and must be in the first paint) and inside the client catalogue.
 *
 * `ratio` is the point. The picture is COMPOSED at the ratio it will be drawn
 * at rather than authored at 16:6 and then `object-cover`-cropped into a 96x64
 * thumbnail - which threw a third of every list picture away. Give the box its
 * size in `className` and pass the matching width/height as `ratio`.
 *
 * `study.image` is deliberately not read here. That field is returned verbatim
 * by /api/v1/studies to a shipped Flutter binary, so it stays in the data - but
 * the web no longer renders it.
 *
 * The whole thing is `aria-hidden`: a view says nothing a reader needs, and
 * every caller labels its own link.
 */
export default function StudyArtwork({
  id,
  kind,
  ratio,
  className = '',
  quiet = false,
}: {
  id: string
  kind: StudyArtKind
  /** Width divided by height of the box this lands in. */
  ratio: number
  className?: string
  /** Drop the sun and the stars: at thumbnail size they are noise, not detail. */
  quiet?: boolean
}) {
  const art = studyArtFor(id, kind)
  const height = 100
  const width = Math.max(1, Math.round(height * ratio))
  const horizon = studyHorizon(art, width, height)
  const palette = art.palette
  const groundPct = (horizon.groundTop / height) * 100

  /**
   * Where the sun or the moon stands. Derived from the study's own seeded
   * `phase`, so it is stable per study and clock-free like everything else -
   * `lib/studyArt.ts` forbids a new random draw and it is right to.
   */
  const lightX = 8 + (art.shape.phase / (Math.PI * 2)) * 84
  const lightY = palette.night ? 18 : 26

  return (
    <span
      aria-hidden
      className={`relative block overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(180deg, ${horizon.skyTop} 0%, ${horizon.skyBottom} 78%, ${horizon.skyBottom} 100%)`,
      }}
    >
      {!quiet && (
        <span
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${lightX}%`,
            top: `${lightY}%`,
            height: palette.night ? '10%' : '22%',
            aspectRatio: '1',
            transform: 'translate(-50%, -50%)',
            backgroundImage: `radial-gradient(circle, ${palette.light} 0%, ${palette.glow} 36%, ${fade(palette.glow)} 72%)`,
          }}
        />
      )}

      {/* Stars are boxes with `aspect-ratio: 1`, not <circle>: the ridge svg
          below runs at `preserveAspectRatio="none"`, which would stretch a
          circle into an ellipse in a wide strip. The radius stays exactly what
          studyHorizon said - it is only scaled to something visible. */}
      {!quiet &&
        horizon.stars.map((star, index) => (
          <span
            key={index}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${(star.cx / width) * 100}%`,
              top: `${(star.cy / height) * 100}%`,
              height: `${0.55 + star.r * 2.2}%`,
              aspectRatio: '1',
              backgroundColor: palette.light,
              opacity: 0.55 + (index % 3) * 0.15,
            }}
          />
        ))}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {horizon.layers.map((layer, index) => (
          <path key={index} d={layer.d} fill={layer.fill} opacity={layer.opacity} />
        ))}
      </svg>

      {/* The band of land is a div with a CSS gradient rather than a <rect>
          with a <linearGradient>: a gradient id has to be unique on the page,
          and the same study can appear twice (featured and in the list). */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          top: `${groundPct}%`,
          backgroundImage: `linear-gradient(180deg, ${horizon.ground} 0%, ${horizon.groundDeep} 100%)`,
        }}
      />

      {/* A hairline inside the frame, so a pale sky keeps an edge against the
          scene behind it. White at 14% holds on every one of the palettes. */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14)' }}
      />
    </span>
  )
}

/** The same colour at zero alpha, so a radial gradient ends in nothing. */
function fade(hex: string): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, 0)`
}
