"use client";

import NavTreeAvatar from "../../../../components/levensboom/NavTreeAvatar";
import { CHAMPAGNE, RING_GRADIENT, TEAL_DEEP, TEAL_FAINT } from "./champagne";

/**
 * Lokale kopie van components/kit/AccountAvatar's `AvatarFrame`, in ontwerp B.
 *
 * Zelfde maatvoering (de ring laat de box nooit groeien), andere Pro-taal:
 *  - Pro: een dunne champagne-ring met metaalglans, dan een witte spleet, dan
 *    de boom.
 *  - Gratis: een grijze haarlijn op dezelfde inset.
 *  - PRO rechtsonder: witte pil, gespatieerde champagne-inkt, champagne
 *    haarlijn en een rand in de achtergrondkleur.
 *  - Reeks rechtsboven: teal-wash plaat, diep teal cijfer, teal haarlijn - de
 *    koele partner van de warme PRO-pil.
 *
 * `pro` en `streak` komen binnen als props, zodat de voorbeeldschakelaar op de
 * pagina beide toestanden kan tonen, los van de echte status.
 */
function metrics(size: number) {
  if (size < 48) {
    return { stroke: 1.5, gap: 2, pill: { font: 10, height: 15, padX: 4, track: 0.8, outline: 2, x: -7, y: -3 } };
  }
  if (size < 80) {
    return { stroke: 2, gap: 2.5, pill: { font: 10, height: 16, padX: 6, track: 1.1, outline: 2, x: -5, y: -2 } };
  }
  return { stroke: 2.5, gap: 3.5, pill: { font: 10.5, height: 20, padX: 8, track: 1.6, outline: 2.5, x: 0, y: 5 } };
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

function ProMark({ size }: { size: number }) {
  const { pill } = metrics(size);
  return (
    <span
      className="absolute inline-flex items-center justify-center rounded-full bg-white font-semibold uppercase leading-none"
      style={{
        ...pillBase(size, "bottom"),
        // Letter-spacing adds trailing space after the last letter; pull it back
        // so "PRO" sits optically centred in the pill.
        paddingRight: pill.padX - pill.track,
        letterSpacing: pill.track,
        color: CHAMPAGNE.ink,
        boxShadow: `inset 0 0 0 1px ${CHAMPAGNE.hairline}, 0 0 0 ${pill.outline}px var(--surface, #fff)`,
      }}
    >
      Pro
    </span>
  );
}

function StreakMark({ size, streak }: { size: number; streak: number }) {
  const { pill } = metrics(size);
  const label = `${streak} ${streak === 1 ? "dag" : "dagen"} reeks`;
  return (
    <span
      aria-label={label}
      title={label}
      className="absolute inline-flex items-center justify-center rounded-full font-bold leading-none tabular-nums"
      style={{
        ...pillBase(size, "top"),
        fontSize: pill.font + 1,
        minWidth: pill.height,
        backgroundColor: TEAL_FAINT,
        color: TEAL_DEEP,
        boxShadow: `inset 0 0 0 1px rgba(13,148,136,.38), 0 0 0 ${pill.outline}px var(--surface, #fff)`,
      }}
    >
      {streak}
    </span>
  );
}

export function ChampagneFrame({
  size,
  pro,
  mark = false,
  streak = null,
  className = "",
  children,
}: {
  size: number;
  pro: boolean;
  /** PRO-pil rechtsonder (alleen bij `pro`). */
  mark?: boolean;
  /** Reeks rechtsboven; verborgen bij null of 0. */
  streak?: number | null;
  className?: string;
  /** Extra hoekinhoud, bv. het niveau. */
  children?: React.ReactNode;
}) {
  const { stroke, gap } = metrics(size);
  const inset = stroke + gap;
  const inner = Math.max(1, Math.round(size - inset * 2));

  return (
    <span className={`relative inline-block flex-none ${className}`} style={{ width: size, height: size }}>
      {/* Ring: een gevulde schijf met het oppervlak eruit gestanst. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={pro ? { backgroundImage: RING_GRADIENT } : { backgroundColor: "var(--line, #E5E7EB)" }}
      />
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{ inset: pro ? stroke : 1, backgroundColor: "var(--surface, #fff)" }}
      />
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
 * De boom in de "Je boom"-kaart: zelfde ring, met het niveau als stip
 * rechtsonder (zoals components/kit/TreeAvatar `levelStyle="dot"`). Geen
 * PRO-pil - die hoek is hier van het niveau. De stip is diep teal in plaats van
 * verzadigd goud: naast een champagne-ring leest een tweede, feller goud als
 * een tweede Pro-teken.
 */
export function ChampagneTree({ size, pro, level }: { size: number; pro: boolean; level: number }) {
  const dot = Math.round(size * 0.29);
  return (
    <ChampagneFrame size={size} pro={pro}>
      <span
        className="absolute bottom-0 right-0 inline-flex items-center justify-center rounded-full font-bold text-white tabular-nums"
        style={{
          backgroundColor: TEAL_DEEP,
          width: dot,
          height: dot,
          fontSize: Math.max(10, Math.round(dot * 0.45)),
          border: "2.5px solid var(--surface)",
        }}
      >
        {level}
      </span>
    </ChampagneFrame>
  );
}
