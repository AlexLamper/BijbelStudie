"use client";

import NavTreeAvatar from "../levensboom/NavTreeAvatar";
import { useIsPro } from "../../hooks/useIsPro";
import { useLevensboom } from "../../hooks/useLevensboom";

const TEAL = "#0D9488";
const TEAL_DEEP = "#0F766E";

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
    return { stroke: 1.5, gap: 2, pill: { font: 10, height: 15, padX: 4, track: 0.6, outline: 2, x: -7, y: -3 } };
  }
  if (size < 80) {
    return { stroke: 2, gap: 2.5, pill: { font: 10, height: 16, padX: 5, track: 0.7, outline: 2, x: -5, y: -2 } };
  }
  return { stroke: 2.5, gap: 3, pill: { font: 11, height: 19, padX: 7, track: 0.8, outline: 2.5, x: 2, y: 6 } };
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
 * The compact PRO mark, bottom-right. Deep teal plate, white type (5.5:1 -
 * brand teal itself is 3.7:1 against white and fails for 10 px text), and an
 * outline in the surface colour so it sits cleanly over the ring it overlaps.
 * No gradient, no glow, no icon.
 */
function ProMark({ size }: { size: number }) {
  const { pill } = metrics(size);
  return (
    <span
      className="absolute inline-flex items-center justify-center rounded-full font-bold uppercase leading-none text-white"
      style={{
        ...pillBase(size, "bottom"),
        letterSpacing: pill.track,
        backgroundColor: TEAL_DEEP,
        boxShadow: `0 0 0 ${pill.outline}px var(--surface, #fff)`,
      }}
    >
      Pro
    </span>
  );
}

/**
 * The streak count, top-right. The quiet partner of the PRO mark: white plate,
 * deep teal number, a teal hairline for an edge on a white ground, and the same
 * surface-coloured outline where it crosses the ring.
 */
function StreakMark({ size, streak }: { size: number; streak: number }) {
  const { pill } = metrics(size);
  return (
    <span
      aria-label={`${streak} ${streak === 1 ? "dag" : "dagen"} reeks`}
      title={`${streak} ${streak === 1 ? "dag" : "dagen"} reeks`}
      className="absolute inline-flex items-center justify-center rounded-full bg-white font-bold leading-none tabular-nums"
      style={{
        ...pillBase(size, "top"),
        minWidth: pill.height,
        color: TEAL_DEEP,
        boxShadow: `inset 0 0 0 1px rgba(13,148,136,.35), 0 0 0 ${pill.outline}px var(--surface, #fff)`,
      }}
    >
      {streak}
    </span>
  );
}

/**
 * The frame every account avatar shares: the tree disc, a gap in the surface
 * colour, and the ring. Pro draws a thin teal ring that deepens slightly toward
 * the bottom; a free account draws a hairline in `line`, at the same inset, so
 * the tree is the same size either way.
 *
 * `pro` and `streak` are passed in rather than read here so callers that
 * already know them (and the tests of this component, should they come) do not
 * need a session or the tree state.
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
  const { stroke, gap } = metrics(size);
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
            ? { backgroundImage: `linear-gradient(160deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)` }
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
 * /api/v1/gamification summary, which is what the top bar always showed) - so
 * they can never show different things for the same account.
 *
 * The streak is shown only when it is above 0, as the top bar did before.
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
