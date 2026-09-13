"use client";

import NavTreeAvatar from "../levensboom/NavTreeAvatar";
import { useIsPro } from "../../hooks/useIsPro";
import { useLevensboom } from "../../hooks/useLevensboom";

const SLATE_900 = "#0F172A";

/**
 * Ring and corner-mark metrics per avatar size, so a 36 px sidebar avatar and a
 * 96 px profile avatar are the same object at two scales rather than two
 * designs.
 *
 * `size` is always the full footprint: ring, gap and disc together. The ring
 * never grows the box, so swapping a free account for a Pro one moves nothing.
 *
 * `pill.x` / `pill.y` are the offsets from the right edge and from the top or
 * bottom edge. Both corner marks use them: the streak at top-right, PRO at
 * bottom-right. At 36-38 px two 15 px pills pulled 3 px outside the box leave
 * a clear band of about 6 px between them, so they never touch.
 */
function metrics(size: number) {
  if (size < 48) {
    return { stroke: 1.5, gap: 2, glow: 6, pill: { font: 9.5, height: 15, padX: 4, track: 0.9, outline: 2, x: -7, y: -3 } };
  }
  if (size < 80) {
    return { stroke: 1.75, gap: 2.5, glow: 10, pill: { font: 10, height: 16, padX: 5, track: 1, outline: 2, x: -5, y: -2 } };
  }
  return { stroke: 2, gap: 3.5, glow: 18, pill: { font: 10, height: 19, padX: 7, track: 1.4, outline: 2.5, x: 2, y: 6 } };
}

type Corner = "top" | "bottom";

function pillBase(size: number, corner: Corner): React.CSSProperties {
  const { pill } = metrics(size);
  return {
    right: pill.x,
    [corner]: pill.y,
    height: pill.height,
    paddingLeft: pill.padX,
    paddingRight: pill.padX,
    fontSize: pill.font,
  };
}

/**
 * The compact PRO mark, bottom-right ("Midnight"): a slate-900 plate with
 * letter-spaced teal-200 type and a teal hairline, plus an outline in the
 * surface colour so it sits cleanly over the ring it overlaps. No gold, no
 * icon.
 */
function ProMark({ size }: { size: number }) {
  const { pill } = metrics(size);
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
  );
}

/**
 * The streak count, top-right. The quiet partner of the PRO mark: white plate,
 * slate-900 number, a hairline for an edge on a white ground, and the same
 * surface-coloured outline where it crosses the ring.
 */
function StreakMark({ size, streak }: { size: number; streak: number }) {
  const { pill } = metrics(size);
  const label = `${streak} ${streak === 1 ? "dag" : "dagen"} reeks`;
  // Plate, number and hairline follow the theme: surface plate, ink number,
  // and a light hairline in dark mode where the slate one would vanish.
  return (
    <span
      aria-label={label}
      title={label}
      className="absolute inline-flex items-center justify-center rounded-full bg-surface font-semibold leading-none tabular-nums text-[#0F172A] [--streak-edge:rgba(15,23,42,.14)] dark:text-ink dark:[--streak-edge:rgba(255,255,255,.18)]"
      style={{
        ...pillBase(size, "top"),
        minWidth: pill.height,
        boxShadow: `inset 0 0 0 1px var(--streak-edge), 0 0 0 ${pill.outline}px var(--surface, #fff), 0 1px 3px rgba(15,23,42,.10)`,
      }}
    >
      {streak}
    </span>
  );
}

/**
 * The frame every account avatar shares: the tree disc, a gap in the surface
 * colour, and the ring. Pro draws a thin teal-to-emerald ring with a barely
 * visible teal glow and a second hairline on the disc itself; a free account
 * draws one hairline in `line`, at the same inset, so the tree is the same size
 * either way.
 *
 * `pro` and `streak` are passed in rather than read here so callers that
 * already know them do not need a session or the tree state.
 */
export function AvatarFrame({
  size,
  pro,
  mark = false,
  streak = null,
  className = "",
  children,
}: {
  size: number;
  pro: boolean;
  /** Draw the PRO mark in the bottom-right corner (only when `pro`). */
  mark?: boolean;
  /** Streak count for the top-right mark; hidden when null or 0. */
  streak?: number | null;
  className?: string;
  /** Extra corner content, e.g. a level marker. */
  children?: React.ReactNode;
}) {
  const { stroke, gap, glow } = metrics(size);
  const inset = stroke + gap;
  const inner = Math.max(1, Math.round(size - inset * 2));

  return (
    <span
      className={`relative inline-block flex-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Ring: a filled disc with the surface punched out of it. */}
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
      {/* The tree. NavTreeAvatar's own studio rim is clipped by this disc. */}
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
  );
}

/**
 * The account's face: the reader's tree, the Pro ring, the streak and the PRO
 * mark. The top bar, the sidebar foot and the profile header all draw this one
 * component, from one source each - Pro from `useIsPro` (the session's resolved
 * entitlement), the streak from `useLevensboom().data.streak` (the
 * /api/v1/gamification summary) - so they can never show different things for
 * the same account.
 *
 * The streak is shown only when it is above 0.
 */
export default function AccountAvatar({
  size,
  className,
}: {
  size: number;
  className?: string;
}) {
  const pro = useIsPro();
  const { data } = useLevensboom();
  return (
    <AvatarFrame
      size={size}
      pro={pro}
      mark
      streak={data?.streak ?? null}
      className={className}
    />
  );
}
