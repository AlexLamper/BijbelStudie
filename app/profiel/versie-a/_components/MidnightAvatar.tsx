"use client"

import NavTreeAvatar from "../../../../components/levensboom/NavTreeAvatar"

/**
 * Ontwerp A - de avatarlijst in "Midnight"-stijl. Een variant-lokale kopie van
 * components/kit/AccountAvatar's AvatarFrame; die gedeelde component blijft
 * onaangeroerd.
 *
 * Pro: een dunne teal-naar-smaragd ring (conic), een witte spleet, dan de boom
 * met een eigen haarlijn - twee lijnen, geen dikke rand. Daaromheen een teal
 * gloed op zeer lage dekking, nauwelijks zichtbaar.
 * Gratis: één grijze haarlijn op dezelfde inzet, zodat de boom even groot blijft.
 */

const SLATE_900 = "#0F172A"

function metrics(size: number) {
  if (size < 48) {
    return { stroke: 1.5, gap: 2, glow: 6, pill: { font: 9.5, height: 15, padX: 4, track: 0.9, outline: 2, x: -7, y: -3 } }
  }
  if (size < 80) {
    return { stroke: 1.75, gap: 2.5, glow: 10, pill: { font: 10, height: 16, padX: 5, track: 1, outline: 2, x: -5, y: -2 } }
  }
  return { stroke: 2, gap: 3.5, glow: 18, pill: { font: 10, height: 19, padX: 7, track: 1.4, outline: 2.5, x: 2, y: 6 } }
}

type Corner = "top" | "bottom"

function pillBase(size: number, corner: Corner): React.CSSProperties {
  const { pill } = metrics(size)
  return {
    right: pill.x,
    [corner]: pill.y,
    height: pill.height,
    paddingLeft: pill.padX,
    paddingRight: pill.padX,
    fontSize: pill.font,
  }
}

/** Compact donker PRO-merk: slate-900, letterspatie, teal-200 letters, teal haarlijn. */
function ProMark({ size }: { size: number }) {
  const { pill } = metrics(size)
  return (
    <span
      className="absolute inline-flex items-center justify-center rounded-full font-semibold uppercase leading-none"
      style={{
        ...pillBase(size, "bottom"),
        letterSpacing: pill.track,
        paddingLeft: pill.padX + pill.track / 2,
        backgroundColor: SLATE_900,
        color: "#99F6E4",
        boxShadow: `inset 0 0 0 1px rgba(45,212,191,.45), 0 0 0 ${pill.outline}px var(--surface, #fff), 0 2px 6px rgba(15,23,42,.18)`,
      }}
    >
      Pro
    </span>
  )
}

/** De reeks, rechtsboven: wit plaatje, slate-900 cijfer, zelfde maten als PRO. */
function StreakMark({ size, streak }: { size: number; streak: number }) {
  const label = `${streak} ${streak === 1 ? "dag" : "dagen"} reeks`
  return (
    <span
      aria-label={label}
      title={label}
      className="absolute inline-flex items-center justify-center rounded-full bg-white font-semibold leading-none tabular-nums"
      style={{
        ...pillBase(size, "top"),
        minWidth: metrics(size).pill.height,
        color: SLATE_900,
        boxShadow: `inset 0 0 0 1px rgba(15,23,42,.14), 0 0 0 ${metrics(size).pill.outline}px var(--surface, #fff), 0 1px 3px rgba(15,23,42,.10)`,
      }}
    >
      {streak}
    </span>
  )
}

export default function MidnightAvatar({
  size,
  pro,
  mark = false,
  streak = null,
  className = "",
  children,
}: {
  size: number
  pro: boolean
  /** PRO-merk rechtsonder (alleen bij `pro`). */
  mark?: boolean
  /** Reeks rechtsboven; verborgen bij null of 0. */
  streak?: number | null
  className?: string
  /** Extra hoekinhoud, bv. een niveaumarkering. */
  children?: React.ReactNode
}) {
  const { stroke, gap, glow } = metrics(size)
  const inset = stroke + gap
  const inner = Math.max(1, Math.round(size - inset * 2))

  return (
    <span className={`relative inline-block flex-none ${className}`} style={{ width: size, height: size }}>
      {/* Buitenring: gevulde schijf met het oppervlak eruit gestanst. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={
          pro
            ? {
                backgroundImage:
                  "conic-gradient(from 210deg, #0D9488, #10B981 30%, #5EEAD4 50%, #10B981 70%, #0D9488)",
                boxShadow: `0 0 ${glow}px rgba(13,148,136,.16)`,
              }
            : { backgroundColor: "var(--line, #E5E7EB)" }
        }
      />
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{ inset: pro ? stroke : 1, backgroundColor: "var(--surface, #fff)" }}
      />
      {/* De boom, met bij Pro een tweede, binnenste haarlijn. */}
      <span
        className="absolute overflow-hidden rounded-full bg-sky"
        style={{ top: inset, left: inset, width: inner, height: inner }}
      >
        <NavTreeAvatar size={inner} showLevel={false} fallback={null} />
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          top: inset,
          left: inset,
          width: inner,
          height: inner,
          boxShadow: pro ? "inset 0 0 0 1px rgba(13,148,136,.28)" : "inset 0 0 0 1px rgba(15,23,42,.06)",
        }}
      />
      {streak != null && streak > 0 && <StreakMark size={size} streak={streak} />}
      {pro && mark && <ProMark size={size} />}
      {children}
    </span>
  )
}
