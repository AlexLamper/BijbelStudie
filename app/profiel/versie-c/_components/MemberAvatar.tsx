"use client"

import NavTreeAvatar from "../../../../components/levensboom/NavTreeAvatar"

const TEAL_DEEP = "#0F766E"
const TEAL_200 = "#99F6E4"
const HAIRLINE = "#D1D5DB"

/**
 * Ontwerp C: the account frame as three concentric rings for Pro - a 1 px
 * teal-200 hairline outside, a 2 px gap, a solid 2 px deep teal ring, a 2 px
 * gap, then the tree. Crisp, no glow, no gradient.
 *
 * A free account draws one grey hairline where the teal ring sits, and the tree
 * keeps the exact same inset, so switching state moves nothing.
 *
 * Variant-local copy of components/kit/AccountAvatar's AvatarFrame: `pro` is
 * passed in so the page's preview toggle can show either state.
 */
const INSET = 7 // 1 hairline + 2 gap + 2 ring + 2 gap

export function MemberFrame({
  size,
  pro,
  seal = false,
  streak = null,
  className = "",
  children,
}: {
  size: number
  pro: boolean
  /** Draw the PRO seal bottom-right (only when `pro`). */
  seal?: boolean
  /** Streak count top-right; hidden when null or 0. */
  streak?: number | null
  className?: string
  children?: React.ReactNode
}) {
  const inner = Math.max(1, Math.round(size - INSET * 2))

  return (
    <span className={`relative inline-block flex-none ${className}`} style={{ width: size, height: size }}>
      {pro ? (
        <>
          <span aria-hidden className="absolute inset-0 rounded-full" style={{ boxShadow: `inset 0 0 0 1px ${TEAL_200}` }} />
          <span aria-hidden className="absolute rounded-full" style={{ inset: 3, boxShadow: `inset 0 0 0 2px ${TEAL_DEEP}` }} />
        </>
      ) : (
        <span aria-hidden className="absolute rounded-full" style={{ inset: 4, boxShadow: `inset 0 0 0 1px ${HAIRLINE}` }} />
      )}
      <span
        className="absolute overflow-hidden rounded-full bg-sky"
        style={{ top: INSET, left: INSET, width: inner, height: inner }}
      >
        <NavTreeAvatar size={inner} showLevel={false} fallback={null} />
      </span>
      {streak != null && streak > 0 && <StreakDisc size={size} streak={streak} />}
      {pro && seal && <ProSeal size={size} />}
      {children}
    </span>
  )
}

/**
 * The PRO seal: a deep teal disc with a fine white inner ring a few pixels in,
 * like a pressed medallion, and PRO letter-spaced across its middle. An outline
 * in the surface colour lifts it off the rings it overlaps.
 */
function ProSeal({ size }: { size: number }) {
  const d = Math.max(28, Math.round(size * 0.34))
  return (
    <span
      role="img"
      aria-label="Pro-lid"
      title="Pro-lid"
      className="absolute inline-flex items-center justify-center rounded-full font-bold leading-none text-white"
      style={{
        width: d,
        height: d,
        right: -2,
        bottom: -2,
        fontSize: 10,
        letterSpacing: "0.14em",
        paddingLeft: "0.14em",
        background: "radial-gradient(circle at 50% 35%, #0F766E 0%, #115E59 100%)",
        boxShadow: [
          "inset 0 0 0 2.5px #0F766E",
          "inset 0 0 0 3.5px rgba(204,251,241,.55)",
          "0 0 0 2.5px var(--surface, #fff)",
          "0 1px 3px 2.5px rgba(15,23,42,.10)",
        ].join(", "),
      }}
    >
      PRO
    </span>
  )
}

/**
 * The streak, top-right - kept, and cut to the seal's language: a white disc
 * with a teal-200 hairline and a deep teal number, same surface outline.
 */
function StreakDisc({ size, streak }: { size: number; streak: number }) {
  const d = Math.max(20, Math.round(size * 0.25))
  const label = `${streak} ${streak === 1 ? "dag" : "dagen"} reeks`
  return (
    <span
      aria-label={label}
      title={label}
      className="absolute inline-flex items-center justify-center rounded-full bg-white font-bold leading-none tabular-nums"
      style={{
        minWidth: d,
        height: d,
        paddingLeft: 5,
        paddingRight: 5,
        right: -1,
        top: -1,
        fontSize: 11,
        color: TEAL_DEEP,
        boxShadow: `inset 0 0 0 1px ${TEAL_200}, 0 0 0 2.5px var(--surface, #fff)`,
      }}
    >
      {streak}
    </span>
  )
}
