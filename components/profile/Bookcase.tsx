"use client"

import { memo, useId, type CSSProperties, type KeyboardEvent } from "react"
import type { BookProgress } from "../../lib/bibleProgress"
import { CASE, RIBBON_RED, ladderY, type BookcaseLayout, type SpineGeom } from "../../lib/bookcase"

/**
 * "Je boekenkast": the 66 books as spines on three shelves of a deep-teal case,
 * with a library ladder leaning on it as the overall progress bar. Pure SVG in
 * the mockup's own 370 x 436 design space, scaled to the column. The app draws
 * the same case (features/profile/present/bookcase_view.dart).
 *
 * Motion is CSS, keyed on the `is-played` class the page sets one frame after
 * the case is on screen: spines fill in a Genesis-to-Openbaring wave, finished
 * books take their gold, the leeslint drops, and a book finished since the
 * last visit hops and throws gold sparks. `prefers-reduced-motion` turns every
 * transition and animation off (see BOOKCASE_CSS), so the case simply shows
 * its settled state. The marker on the ladder is positioned by the page.
 */

const GOLD = ["#B98A2E", "#F5D98B", "#C49533"]
const SERIF: CSSProperties = { fontFamily: "var(--font-lora), Georgia, serif" }
const SANS: CSSProperties = { fontFamily: "var(--font-inter), system-ui, sans-serif" }

/** When a spine starts filling, in ms after the intro starts. */
const spineDelay = (index: number) => Math.round(100 + (index / 65) * 720)
const SPINE_MS = 520
const varStyle = (vars: Record<string, string | number>): CSSProperties => vars as CSSProperties

export interface BookcaseProps {
  layout: BookcaseLayout
  /** 0-1 share of all chapters read, for the ladder marker. */
  fraction: number
  /** What the marker prints, "11%"; the page counts it up. */
  markerLabel: string
  played: boolean
  /** The book the leeslint lies in. */
  current: string | null
  /** Books finished since the last visit. */
  fresh: string[]
  /** The book whose dialog is open: it stands pulled out of the shelf. */
  pulled: string | null
  onOpenBook: (book: BookProgress) => void
}

export default function Bookcase(props: BookcaseProps) {
  const { layout, fraction, markerLabel, played, current, fresh, pulled, onOpenBook } = props
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")

  return (
    <svg
      viewBox={`0 0 ${CASE.width} ${CASE.height}`}
      className={`bk-svg block h-auto w-full ${played ? "is-played" : ""}`}
      role="group"
      aria-label="Je boekenkast met alle 66 bijbelboeken"
    >
      <Defs id={id} />
      <Cabinet id={id} />
      <Shelves id={id} layout={layout} current={current} fresh={fresh} pulled={pulled} onOpenBook={onOpenBook} />
      <Ladder />
      <Marker fraction={fraction} label={markerLabel} id={id} />
    </svg>
  )
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-case`} x1="0" x2="1">
        <stop offset="0" style={{ stopColor: "var(--bk-case-l)" }} />
        <stop offset=".5" style={{ stopColor: "var(--bk-case-m)" }} />
        <stop offset="1" style={{ stopColor: "var(--bk-case-r)" }} />
      </linearGradient>
      <linearGradient id={`${id}-back`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: "var(--bk-back-t)" }} />
        <stop offset="1" style={{ stopColor: "var(--bk-back-b)" }} />
      </linearGradient>
      <linearGradient id={`${id}-gold`} x1="0" x2="1">
        <stop offset="0" stopColor={GOLD[0]} />
        <stop offset=".45" stopColor={GOLD[1]} />
        <stop offset="1" stopColor={GOLD[2]} />
      </linearGradient>
      <linearGradient id={`${id}-lamp`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FDE68A" stopOpacity=".3" />
        <stop offset="1" stopColor="#FDE68A" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-lampside`} x1="0" x2="1">
        <stop offset="0" style={{ stopColor: "var(--bk-back-t)" }} stopOpacity=".5" />
        <stop offset=".5" style={{ stopColor: "var(--bk-back-t)" }} stopOpacity="0" />
        <stop offset="1" style={{ stopColor: "var(--bk-back-t)" }} stopOpacity=".5" />
      </linearGradient>
      <filter id={`${id}-ds`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="9" style={{ floodColor: "var(--bk-shadow)" }} />
      </filter>
      <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  )
}

/** Body, cornice, base, side posts and the plant and lamp on top. */
function Cabinet({ id }: { id: string }) {
  const W = CASE.width
  return (
    <g aria-hidden="true">
      <rect x="8" y="52" width={W - 16} height="370" rx="6" fill={`url(#${id}-case)`} filter={`url(#${id}-ds)`} />
      <rect x="2" y="42" width={W - 4} height="16" rx="4" style={{ fill: "var(--bk-cornice)" }} />
      <rect x="2" y="55" width={W - 4} height="4" style={{ fill: "var(--bk-cornice-s)" }} />
      <rect x="12" y="410" width={W - 24} height="10" style={{ fill: "var(--bk-cornice-s)" }} />
      <g transform="translate(36,42)">
        <path d="M-9,0 h18 l-3,-14 h-12z" style={{ fill: "var(--bk-pot)" }} />
        <path d="M-10,-14 h20 v-3 h-20z" style={{ fill: "var(--bk-pot-rim)" }} />
        <path d="M0,-17 q-14,-6 -12,-22 q8,6 12,22" fill="#4CA36F" />
        <path d="M0,-14 q14,-10 10,-26 q-10,8 -10,26" fill="#3E8E5E" />
        <path d="M0,-14 q-2,-16 4,-28 q4,14 -4,28" fill="#5DBB7E" />
      </g>
      <g transform="translate(300,42)">
        <rect x="-10" y="-4" width="20" height="4" rx="2" fill="#A47C2C" />
        <rect x="-1.5" y="-26" width="3" height="22" fill="#C9A24A" />
        <path d="M-12,-26 h24 l-5,-14 h-14z" fill="#E9C46A" />
      </g>
    </g>
  )
}

interface ShelvesProps {
  id: string
  layout: BookcaseLayout
  current: string | null
  fresh: string[]
  pulled: string | null
  onOpenBook: (book: BookProgress) => void
}

/** Memoised: the page re-renders every frame of the count-up, the shelves don't need to. */
const Shelves = memo(function Shelves({ id, layout, current, fresh, pulled, onOpenBook }: ShelvesProps) {
  const W = CASE.width
  const x0 = CASE.inset - 4
  const freshSet = new Set(fresh)

  return (
    <g>
      {CASE.shelfTops.map((top) => {
        const base = top + CASE.shelfHeight
        const planks: number[] = []
        for (let px = CASE.inset + 18; px < W - CASE.inset; px += 36) planks.push(px)
        return (
          <g key={top}>
            <g aria-hidden="true">
              <rect x={x0} y={top} width={W - 2 * x0} height={CASE.shelfHeight} fill={`url(#${id}-back)`} />
              {planks.map((px) => (
                <line key={px} x1={px} y1={top} x2={px} y2={base} style={{ stroke: "var(--bk-plank)" }} />
              ))}
              <rect x={x0} y={top} width={W - 2 * x0} height="22" fill={`url(#${id}-lamp)`} />
              <rect x={x0} y={top} width={W - 2 * x0} height="22" fill={`url(#${id}-lampside)`} />
            </g>
            {layout.spines
              .filter((s) => s.base === base)
              .map((s) => (
                <Spine
                  key={s.book.name}
                  id={id}
                  spine={s}
                  current={s.book.name === current}
                  fresh={freshSet.has(s.book.name)}
                  pulled={s.book.name === pulled}
                  onOpen={onOpenBook}
                />
              ))}
            {layout.bookends
              .filter((e) => e.base === base)
              .map((e) => (
                <g key={e.x} aria-hidden="true">
                  <path d={`M${e.x + 2},${base} v-30 q0,-6 6,-6 v36z`} fill="#C9A24A" />
                  <rect x={e.x + 2} y={base - 2} width="10" height="2" fill="#A47C2C" />
                </g>
              ))}
            <g aria-hidden="true">
              <rect x={CASE.inset - 6} y={base} width={W - 2 * (CASE.inset - 6)} height={CASE.boardHeight} style={{ fill: "var(--bk-board)" }} />
              <rect x={CASE.inset - 6} y={base} width={W - 2 * (CASE.inset - 6)} height="2.5" style={{ fill: "var(--bk-board-edge)" }} />
            </g>
          </g>
        )
      })}

      {/* The leeslint hangs out of the book you are in, over the shelf board. */}
      {layout.spines
        .filter((s) => s.book.name === current)
        .map((s) => {
          const rx = s.x + s.width - 6
          const top = s.base - 8
          return (
            <g key="ribbon" aria-hidden="true" className={`bk-lift ${pulled === s.book.name ? "is-pulled" : ""}`}>
              <g className="bk-ribbon">
                <path d={`M${rx},${top} v30 l-3,-4 l-3,4 v-30z`} fill={RIBBON_RED} />
                <path d={`M${rx},${top} v30 l-3,-4 v-26z`} fill="#B91C1C" />
              </g>
            </g>
          )
        })}

      {layout.plaques.map((p) => {
        const w = p.label.length * 4.9 + 14
        return (
          <g key={p.group} transform={`translate(${p.centerX},${p.base + 7.5})`} aria-hidden="true">
            <rect x={-w / 2} y="-5.5" width={w} height="11" rx="2.5" fill={`url(#${id}-gold)`} />
            <text y="2.6" textAnchor="middle" fontSize="7.6" fontWeight="700" fill="#5B4314" style={SANS}>
              {p.label}
            </text>
          </g>
        )
      })}

      <g aria-hidden="true">
        <rect x="8" y="59" width={CASE.inset - 12} height="355" style={{ fill: "var(--bk-post)" }} />
        <rect x={W - CASE.inset + 4} y="59" width={CASE.inset - 12} height="355" style={{ fill: "var(--bk-post)" }} />
      </g>

      {/* Sparks over a book finished since the last visit. */}
      {layout.spines
        .filter((s) => freshSet.has(s.book.name))
        .map((s) => (
          <g key={`spark-${s.book.name}`} aria-hidden="true" transform={`translate(${s.x + s.width / 2},${s.base - s.height + 4})`}>
            {Array.from({ length: 10 }, (_, j) => {
              const angle = -Math.PI / 2 + (j / 9 - 0.5) * Math.PI * 1.1
              const dist = 30 + 8 * ((j * 37) % 10) / 10
              const r = 3.4
              const q = r * 0.32
              return (
                <path
                  key={j}
                  className="bk-spark"
                  d={`M0,${-r} L${q},${-q} L${r},0 L${q},${q} L0,${r} L${-q},${q} L${-r},0 L${-q},${-q}Z`}
                  fill={j % 2 === 0 ? "#F5D98B" : "#FFFFFF"}
                  style={varStyle({
                    "--dx": `${(Math.cos(angle) * dist).toFixed(1)}px`,
                    "--dy": `${(Math.sin(angle) * dist).toFixed(1)}px`,
                  })}
                />
              )
            })}
          </g>
        ))}
    </g>
  )
})

function Spine({
  id,
  spine,
  current,
  fresh,
  pulled,
  onOpen,
}: {
  id: string
  spine: SpineGeom
  current: boolean
  fresh: boolean
  pulled: boolean
  onOpen: (book: BookProgress) => void
}) {
  const { book, x, width: ww, height: h, base, color, index } = spine
  const y = base - h
  const delay = spineDelay(index)
  const share = book.readCount / Math.max(1, book.chapters)
  const labelSize = ww > 16 ? 9.5 : 8
  const clip = `${id}-c${index}`
  const highlight = Math.max(1.5, ww * 0.22)
  const label =
    `${book.name}, ` +
    (book.completed
      ? `uit, alle ${book.chapters} hoofdstukken gelezen`
      : `${book.readCount} van ${book.chapters} hoofdstukken gelezen`) +
    (current ? ", hier ligt je leeslint" : "")

  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onOpen(book)
    }
  }

  const fh = Math.max(4, h * (book.completed ? 1 : share))
  const wy = base - fh + 1.5

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      className="bk-hit"
      onClick={() => onOpen(book)}
      onKeyDown={onKey}
    >
      <title>{label}</title>
      <rect x={x - 0.7} y={base - CASE.shelfHeight} width={ww + 1.4} height={CASE.shelfHeight + CASE.boardHeight} fill="transparent" />
      <g className={`bk-lift ${pulled ? "is-pulled" : ""}`}>
        <g className={fresh ? "bk-hop" : undefined}>
          {current && (
            <rect
              className="bk-glow"
              x={x - 3}
              y={y - 3}
              width={ww + 6}
              height={h + 6}
              rx="3"
              fill="#FDE68A"
              filter={`url(#${id}-glow)`}
            />
          )}
          {fresh && <rect className="bk-cglow" x={x - 4} y={y - 4} width={ww + 8} height={h + 8} rx="3" fill="#F5D98B" filter={`url(#${id}-glow)`} />}
          <clipPath id={clip}>
            <rect x={x} y={y} width={ww} height={h} rx="1.6" />
          </clipPath>
          <rect
            x={x + 0.5}
            y={y + 0.5}
            width={ww - 1}
            height={h - 1}
            rx="1.6"
            style={{ fill: "var(--bk-ghost)", stroke: "var(--bk-ghost-line)" }}
          />
          {book.started && (
            <g clipPath={`url(#${clip})`}>
              <g className="bk-rise" style={varStyle({ "--d": `${delay}ms` })}>
                {book.completed ? (
                  <rect x={x} y={y} width={ww} height={h} fill={color} />
                ) : (
                  <path d={`M${x},${wy} q${ww / 4},-3 ${ww / 2},0 t${ww / 2},0 V${base} H${x}z`} fill={color} />
                )}
                <rect x={x} y={base - fh} width={highlight} height={fh} fill="#fff" opacity=".14" />
              </g>
            </g>
          )}
          {book.completed ? (
            <g className="bk-gold" style={varStyle({ "--d": `${delay + SPINE_MS - 60}ms` })}>
              <rect x={x + 0.6} y={y + 6} width={ww - 1.2} height="2.4" fill={`url(#${id}-gold)`} />
              <rect x={x + 0.6} y={y + 10} width={ww - 1.2} height="1" fill={`url(#${id}-gold)`} />
              <rect x={x + 0.6} y={base - 9} width={ww - 1.2} height="2.4" fill={`url(#${id}-gold)`} />
              <circle cx={x + ww / 2} cy={y + 18} r="1.6" fill="#F5D98B" />
              {ww >= 11 && (
                <text
                  transform={`translate(${x + ww / 2 + 3.2},${base - 14}) rotate(-90)`}
                  fontWeight="600"
                  fontSize={labelSize}
                  fill="#FBE7A9"
                  style={SERIF}
                >
                  {spine.label}
                </text>
              )}
            </g>
          ) : book.started ? (
            ww >= 11 && (
              <text
                transform={`translate(${x + ww / 2 + 3.2},${base - 6}) rotate(-90)`}
                fontWeight="600"
                fontSize={labelSize}
                fill="#fff"
                fillOpacity=".9"
                style={SERIF}
              >
                {spine.label}
              </text>
            )
          ) : (
            ww >= 12 && (
              <text
                transform={`translate(${x + ww / 2 + 3},${base - 6}) rotate(-90)`}
                fontWeight="500"
                fontSize={ww > 16 ? 9 : 7.6}
                style={{ ...SERIF, fill: "var(--bk-ghost-text)" }}
              >
                {spine.label}
              </text>
            )
          )}
          {current && <rect x={x + 0.5} y={y + 0.5} width={ww - 1} height={h - 1} rx="1.6" fill="none" stroke="#FDE68A" strokeWidth="1.2" />}
          <rect className="bk-focus" x={x - 1.5} y={y - 1.5} width={ww + 3} height={h + 3} rx="2.5" fill="none" stroke="#5EEAD4" strokeWidth="1.8" />
        </g>
      </g>
    </g>
  )
}

/** Rails, rungs and the four milestone tags. */
const Ladder = memo(function Ladder() {
  const lx = CASE.ladderX
  const top = CASE.ladderTop
  const bot = CASE.ladderBottom
  const rungs = Array.from({ length: 11 }, (_, i) => {
    const y = ladderY((i + 1) / 12)
    return { y, xl: lx - 16 + ((y - (top - 6)) / (bot - top + 6)) * 10 }
  })
  const tags: [number, string][] = [[0.25, "25%"], [0.5, "50%"], [0.75, "75%"], [1, "Alles"]]
  return (
    <g aria-hidden="true">
      <line x1={lx - 16} y1={top - 6} x2={lx - 6} y2={bot} stroke="#7A4E2A" strokeWidth="5" strokeLinecap="round" />
      <line x1={lx + 10} y1={top - 6} x2={lx + 20} y2={bot} stroke="#7A4E2A" strokeWidth="5" strokeLinecap="round" />
      <line x1={lx - 17.2} y1={top - 6} x2={lx - 7.2} y2={bot} stroke="#A9744A" strokeWidth="1.6" strokeLinecap="round" />
      <line x1={lx + 8.8} y1={top - 6} x2={lx + 18.8} y2={bot} stroke="#A9744A" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx={lx - 6} cy={bot + 2} r="3.5" fill="#3F2A17" />
      <circle cx={lx + 20} cy={bot + 2} r="3.5" fill="#3F2A17" />
      {rungs.map((r) => (
        <line key={r.y} x1={r.xl} y1={r.y} x2={r.xl + 26} y2={r.y} stroke="#8B5A33" strokeWidth="3" strokeLinecap="round" />
      ))}
      {tags.map(([m, label]) => (
        <g key={label} transform={`translate(${lx + 2},${ladderY(m) + (m === 1 ? 10 : 0)})`}>
          <rect x="-17" y="-8" width="34" height="16" rx="8" style={{ fill: "var(--bk-pill)", stroke: "var(--bk-pill-line)" }} />
          <text y="3.4" textAnchor="middle" fontSize="9" fontWeight="700" style={{ ...SANS, fill: "var(--bk-pill-text)" }}>
            {label}
          </text>
        </g>
      ))}
    </g>
  )
})

/** The reader's own marker on the ladder, never lower than just above the feet. */
function Marker({ fraction, label, id }: { fraction: number; label: string; id: string }) {
  const y = Math.min(ladderY(fraction), CASE.ladderBottom - 20)
  const size = label.length > 4 ? Math.max(6.5, 10 * 4 / label.length) : 10
  return (
    <g transform={`translate(${CASE.ladderX + 4},${y})`} aria-hidden="true">
      <circle r="15" fill="#FDE68A" opacity=".5" filter={`url(#${id}-glow)`} />
      <circle r="11.5" fill="#0D9488" style={{ stroke: "var(--bk-ring)" }} strokeWidth="2.5" />
      <text y={size * 0.36} textAnchor="middle" fontSize={size} fontWeight="800" fill="#fff" style={SANS}>
        {label}
      </text>
    </g>
  )
}

/**
 * Theme tokens and motion for the case, the room and the page around it.
 * Scoped under `.bk`; `.dark` (the site's dark theme) swaps the palette.
 */
export const BOOKCASE_CSS = `
.bk {
  --bk-wall-t:#EEF3F6; --bk-wall-b:#E4EBF0; --bk-wall-line:rgba(15,23,42,.025);
  --bk-floor-t:#D7DFE6; --bk-floor-b:#CDD6DE; --bk-floor-edge:#C3CDD6;
  --bk-case-l:#15524D; --bk-case-m:#1A5F59; --bk-case-r:#124A45;
  --bk-cornice:#1E6B64; --bk-cornice-s:#0E403C; --bk-post:#17574F;
  --bk-back-t:#0A2F2D; --bk-back-b:#0E3B38; --bk-plank:rgba(0,0,0,.14);
  --bk-board:#1F6E67; --bk-board-edge:#2E857D;
  --bk-ghost:rgba(255,255,255,.075); --bk-ghost-line:rgba(255,255,255,.24); --bk-ghost-text:rgba(255,255,255,.34);
  --bk-pill:#F8FAFC; --bk-pill-line:#CBD5E1; --bk-pill-text:#64748B; --bk-ring:#FFFFFF;
  --bk-shadow:rgba(15,23,42,.28); --bk-pot:#CBD5E1; --bk-pot-rim:#94A3B8;
  --bk-ch-empty:#E8EDF2; --bk-ch-next:#C2410C;
  --bk-amber-wash:#FEF3C7; --bk-amber:#A47C2C;
  --bk-card-shadow:0 14px 30px -14px rgba(15,23,42,.35), 0 0 0 1px rgba(15,23,42,.04);
}
.dark .bk, [data-theme="dark"] .bk {
  --bk-wall-t:#1D2222; --bk-wall-b:#191D1D; --bk-wall-line:rgba(255,255,255,.028);
  --bk-floor-t:#272C2C; --bk-floor-b:#222727; --bk-floor-edge:#313838;
  --bk-case-l:#104541; --bk-case-m:#14524C; --bk-case-r:#0E3F3B;
  --bk-cornice:#186059; --bk-cornice-s:#0A312E; --bk-post:#134A44;
  --bk-back-t:#061B1A; --bk-back-b:#092624; --bk-plank:rgba(0,0,0,.18);
  --bk-board:#1B625B; --bk-board-edge:#287A72;
  --bk-ghost:rgba(255,255,255,.063); --bk-ghost-line:rgba(255,255,255,.2); --bk-ghost-text:rgba(255,255,255,.3);
  --bk-pill:#262626; --bk-pill-line:#454545; --bk-pill-text:#B0B0B0; --bk-ring:#E5E5E5;
  --bk-shadow:rgba(0,0,0,.5); --bk-pot:#5E6870; --bk-pot-rim:#48525A;
  --bk-ch-empty:#333333; --bk-ch-next:#F97316;
  --bk-amber-wash:#3A2E12; --bk-amber:#E9C46A;
  --bk-card-shadow:0 14px 30px -14px rgba(0,0,0,.6), 0 0 0 1px var(--line);
}
.bk-room {
  background:
    repeating-linear-gradient(90deg, transparent 0 22px, var(--bk-wall-line) 22px 23px),
    linear-gradient(180deg, var(--bk-wall-t), var(--bk-wall-b));
}
.bk-floor { background: linear-gradient(180deg, var(--bk-floor-t), var(--bk-floor-b)); border-top: 3px solid var(--bk-floor-edge); }

.bk-hit { cursor: pointer; outline: none; }
.bk-lift { transition: transform .22s cubic-bezier(.34,1.56,.64,1); }
.bk-hit:hover .bk-lift { transform: translateY(-3px); }
.bk-lift.is-pulled, .bk-hit:hover .bk-lift.is-pulled { transform: translateY(-7px); }
.bk-focus { opacity: 0; }
.bk-hit:focus-visible .bk-focus { opacity: 1; }

.bk-rise { transform: scaleY(0); transform-box: fill-box; transform-origin: 50% 100%;
  transition: transform ${SPINE_MS}ms cubic-bezier(.22,1,.36,1) var(--d, 0ms); }
.is-played .bk-rise { transform: scaleY(1); }
.bk-gold { opacity: 0; transition: opacity .28s ease-out var(--d, 0ms); }
.is-played .bk-gold { opacity: 1; }
.bk-glow { opacity: 0; transition: opacity .5s ease-out 1s; }
.is-played .bk-glow { opacity: .55; }
.bk-ribbon { transform: scaleY(0); transform-box: fill-box; transform-origin: 50% 0;
  transition: transform .5s cubic-bezier(.34,1.56,.64,1) 1.05s; }
.is-played .bk-ribbon { transform: scaleY(1); }

.bk-spark { opacity: 0; }
.is-played .bk-spark { animation: bk-spark 1.25s cubic-bezier(.22,1,.36,1) 1.75s both; }
.is-played .bk-hop { animation: bk-hop .9s ease-out 1.7s both; }
.bk-cglow { opacity: 0; }
.is-played .bk-cglow { animation: bk-cglow 1.5s ease-out 1.7s both; }
@keyframes bk-spark {
  0% { opacity: 0; transform: translate(0,0) scale(1); }
  12% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.35); }
}
@keyframes bk-hop { 0%,100% { transform: translateY(0); } 35% { transform: translateY(-7px); } 70% { transform: translateY(0); } 85% { transform: translateY(-2px); } }
@keyframes bk-cglow { 0%,100% { opacity: 0; } 35% { opacity: .8; } }

.bk-in { opacity: 0; transform: translateY(10px); transition: opacity .45s ease-out var(--d, 0ms), transform .55s cubic-bezier(.22,1,.36,1) var(--d, 0ms); }
.is-played .bk-in, .bk-in.is-played { opacity: 1; transform: none; }
.bk-cell { transition: background-color .2s ease-out var(--d, 0ms); }
.bk-bar { transition: width .9s cubic-bezier(.22,1,.36,1) var(--d, 0ms); }

@media (prefers-reduced-motion: reduce) {
  .bk *, .bk *::before, .bk *::after { transition: none !important; animation: none !important; }
  .bk .bk-spark, .bk .bk-cglow { opacity: 0 !important; }
}
`
