/**
 * Ontwerp C: the Pro membership card - a physical-feeling object at credit-card
 * proportions (1.586 : 1), deep teal, with a pressed leaf-vein texture and a
 * letter-spaced wordmark. The texture is lines at a few percent opacity, not an
 * icon: it reads as grain when you look at the card and as a leaf only when you
 * look for it.
 *
 * `muted` draws the same card as an outlined, greyed blank - the upsell a free
 * account sees in place of its own card.
 */

const W = 320
const H = 202

type Pt = [number, number]

/** A cubic bezier across the card: the leaf's midrib, entering bottom-left of centre and leaving top-right. */
const MIDRIB: [Pt, Pt, Pt, Pt] = [[96, 232], [150, 150], [236, 70], [352, -18]]

function bez(t: number): { p: Pt; tan: Pt } {
  const [a, b, c, d] = MIDRIB
  const u = 1 - t
  const p: Pt = [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ]
  const tx = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0])
  const ty = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1])
  const len = Math.hypot(tx, ty) || 1
  return { p, tan: [tx / len, ty / len] }
}

/** Side veins: fixed steps along the midrib, curving forward on both sides. Deterministic - no randomness. */
const VEINS: string[] = (() => {
  const out: string[] = []
  const r = (n: number) => Math.round(n * 10) / 10
  for (let i = 1; i <= 9; i++) {
    const t = i / 10.5
    const { p, tan } = bez(t)
    const reach = 150 * (1 - Math.abs(t - 0.45) * 1.1)
    for (const side of [1, -1]) {
      // Normal to the midrib, then leaned 42 degrees toward the tip.
      const nx = -tan[1] * side
      const ny = tan[0] * side
      const lean = 0.9
      const ex = p[0] + (nx + tan[0] * lean) * reach * 0.7
      const ey = p[1] + (ny + tan[1] * lean) * reach * 0.7
      const cx = p[0] + nx * reach * 0.45
      const cy = p[1] + ny * reach * 0.45
      out.push(`M${r(p[0])} ${r(p[1])}Q${r(cx)} ${r(cy)} ${r(ex)} ${r(ey)}`)
    }
  }
  return out
})()

const MIDRIB_D = `M${MIDRIB[0].join(" ")}C${MIDRIB[1].join(" ")} ${MIDRIB[2].join(" ")} ${MIDRIB[3].join(" ")}`

function Texture({ muted, id }: { muted: boolean; id: string }) {
  const light = muted ? "rgba(15,23,42,.07)" : "rgba(255,255,255,.11)"
  const dark = muted ? "rgba(255,255,255,.9)" : "rgba(0,0,0,.22)"
  const fine = muted ? "rgba(15,23,42,.035)" : "rgba(255,255,255,.035)"
  const veins = (
    <>
      <path d={MIDRIB_D} strokeWidth={1.4} />
      {VEINS.map((d, i) => (
        <path key={i} d={d} strokeWidth={0.8} />
      ))}
    </>
  )
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={fine} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} />
      {/* Emboss: the same lines twice - a shadow a pixel down, the highlight on top. */}
      <g fill="none" stroke={dark} strokeLinecap="round" transform="translate(0 1)">
        {veins}
      </g>
      <g fill="none" stroke={light} strokeLinecap="round">
        {veins}
      </g>
    </svg>
  )
}

export default function MembershipCard({
  name,
  since,
  plan,
  muted = false,
}: {
  name: string
  /** e.g. "maart 2025"; null prints a dash. */
  since: string | null
  plan: string
  muted?: boolean
}) {
  const ink = muted ? "text-ink-faint" : "text-white"
  const sub = muted ? "text-ink-faint" : "text-teal-100"
  const label = muted ? "text-ink-faint/80" : "text-teal-200/70"

  return (
    <div
      className="group relative w-full max-w-[360px] overflow-hidden rounded-[14px]"
      style={{
        aspectRatio: "1.586 / 1",
        ...(muted
          ? { backgroundColor: "#F9FAFB", boxShadow: "inset 0 0 0 1px #D1D5DB" }
          : {
              backgroundImage: "linear-gradient(145deg, #0F766E 0%, #115E59 55%, #134E4A 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 1px rgba(255,255,255,.06), 0 1px 2px rgba(15,23,42,.10), 0 10px 24px -10px rgba(19,78,74,.55)",
            }),
      }}
    >
      <Texture muted={muted} id={muted ? "mc-fine-muted" : "mc-fine"} />

      {/* Sheen: one soft band that crosses the card on hover. CSS only; gone
          entirely under prefers-reduced-motion. */}
      {!muted && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-[-20%] left-[-60%] w-[45%] -skew-x-12 opacity-0 transition-[transform,opacity] duration-700 ease-out group-hover:translate-x-[400%] group-hover:opacity-100 motion-reduce:hidden"
          style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,.13), transparent)" }}
        />
      )}

      <div className="relative flex h-full flex-col justify-between p-[18px]">
        <div className={`text-[10px] font-semibold uppercase leading-none tracking-[0.28em] ${sub}`}>
          Bijbelstudie <span className={muted ? "" : "text-white"}>Pro</span>
        </div>

        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <div className={`truncate text-[16px] font-semibold leading-tight tracking-[0.01em] ${ink}`}>{name}</div>
            <div className={`mt-[5px] truncate text-[11.5px] leading-none ${sub}`}>
              Pro-lid sinds {since ?? "-"}
            </div>
          </div>
          <div className="flex-none text-right">
            <div className={`text-[10px] font-semibold uppercase leading-none tracking-[0.2em] ${label}`}>Plan</div>
            <div className={`mt-[5px] text-[12.5px] font-semibold leading-none ${ink}`}>{plan}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
