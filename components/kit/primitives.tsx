import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * The shared presentation primitives for the nine app routes.
 *
 * Spec: design_handoff_web/COMPONENTS.md. No page writes its own variant of any
 * of these, and none of them fetches, mutates or decides anything - they take
 * values and draw them. Every measurement is the design's; every colour is a
 * token name from tailwind.config.ts.
 */

/* ── Banner gradients ───────────────────────────────────────────────────────
   Study artwork comes from the server; where it is missing the design puts a
   gradient plate in its place. Five of them, picked deterministically from a
   key so the same study keeps the same colour on every render and between the
   grid and the list. */
const BANNERS = [
  "var(--grad-banner)",
  "var(--grad-banner-2)",
  "var(--grad-banner-3)",
  "var(--grad-banner-4)",
  "var(--grad-banner-5)",
];

export function bannerGradient(key: string | number | undefined | null): string {
  if (key == null) return BANNERS[0];
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return BANNERS[h % BANNERS.length];
}

/* ── Card ─────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`rounded-card border border-line bg-white ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ── StatCard ─────────────────────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  delta,
  deltaNegative = false,
  icon,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaNegative?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`px-[17px] py-[15px] ${className}`}>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[12px] text-ink-muted">{label}</span>
        {icon}
      </div>
      <div className="mt-[6px] flex items-baseline gap-2">
        <span className="text-[25px] font-bold tracking-[-0.5px] text-ink tabular-nums">{value}</span>
        {delta && (
          <span
            className={`text-[11.5px] font-semibold tabular-nums ${
              deltaNegative ? "text-danger" : "text-success"
            }`}
          >
            {delta}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ── Chip ─────────────────────────────────────────────────────────────────── */

export function Chip({
  label,
  active = false,
  onClick,
  href,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const cls = [
    "inline-flex items-center rounded-full px-[15px] py-2 text-[13px] no-underline transition-colors",
    active
      ? "bg-teal font-semibold text-white"
      : "border border-line bg-white font-medium text-ink-body hover:border-line-strong",
  ].join(" ");
  if (href) {
    return (
      <Link href={href} className={cls}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {label}
    </button>
  );
}

/* ── Pill ─────────────────────────────────────────────────────────────────── */

export function Pill({
  label,
  tone = "neutral",
  className = "",
}: {
  label: React.ReactNode;
  tone?: "neutral" | "gold" | "warn";
  className?: string;
}) {
  /* The quiet half of the Pro pair. This chip stands in a row next to the
     streak and member-since pills, so it keeps their exact metrics and earns
     its status from colour alone - the loud gold plate (ProBadge,
     --grad-pro-badge) appears once per screen, in the Abonnement card.
     Champagne with a real gold edge rather than the near-white wash it was:
     --pro-pill-ink holds 9.05:1 on the darkest stop, and the border finally
     reads as a border at 2.0:1 on white instead of 1.4:1. */
  if (tone === "gold") {
    return (
      <span
        className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-[6px] text-[12.5px] font-bold ${className}`}
        style={{
          backgroundImage: "var(--grad-pro-pill)",
          borderColor: "var(--pro-pill-border)",
          color: "var(--pro-pill-ink)",
          // A hair of light along the top edge, so the chip reads as a surface
          // and not as a printed swatch. Cheaper than a shadow, which TOKENS.md
          // reserves for the FAB, the streak badge and the search field.
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
        }}
      >
        {label}
      </span>
    );
  }
  if (tone === "warn") {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-warn-wash px-3 py-[6px] text-[12.5px] font-bold text-warn ${className}`}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border border-line bg-white px-3 py-[6px] text-[12.5px] font-bold text-ink-body ${className}`}
    >
      {label}
    </span>
  );
}

/* ── ProgressBar ──────────────────────────────────────────────────────────── */

export function ProgressBar({
  value,
  height = 6,
  done = false,
  className = "",
}: {
  /** 0-100. */
  value: number;
  height?: 4 | 6 | 8 | 22;
  done?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-line ${className}`}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          backgroundColor: done || pct >= 100 ? "var(--success-fill)" : "var(--teal)",
        }}
      />
    </div>
  );
}

/* ── SectionHeading ───────────────────────────────────────────────────────── */

export function SectionHeading({
  title,
  meta,
  action,
  className = "",
}: {
  title: string;
  meta?: React.ReactNode;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-3 ${className}`}>
      <h2 className="text-[16px] font-bold text-ink">{title}</h2>
      {meta && <span className="text-[12.5px] text-ink-faint">{meta}</span>}
      <div className="flex-1" />
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal no-underline hover:text-teal-dark"
        >
          {action.label}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

/* ── ListRow ──────────────────────────────────────────────────────────────── */

export function ListRow({
  thumb,
  art,
  title,
  meta,
  progress,
  action,
  first = false,
}: {
  /** A CSS background value - the gradient plate used when there is no artwork. */
  thumb?: string;
  /** Real artwork for the 44 px square; wins over `thumb` when given. */
  art?: React.ReactNode;
  title: React.ReactNode;
  meta: React.ReactNode;
  progress?: number;
  action?: React.ReactNode;
  /** The first row in a card carries no top hairline. */
  first?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-[14px] px-[18px] py-3 ${
        first ? "" : "border-t border-line-soft"
      }`}
    >
      <div
        className="h-[44px] w-[44px] flex-none overflow-hidden rounded-btn"
        style={art ? undefined : { background: thumb }}
      >
        {art}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold text-ink">{title}</div>
        <div className="mt-[2px] truncate text-[12px] text-ink-faint">{meta}</div>
        {progress != null && (
          <ProgressBar value={progress} height={4} className="mt-[6px] max-w-[360px]" />
        )}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}

/* ── StudyCard ────────────────────────────────────────────────────────────── */

export function StudyCard({
  title,
  meta,
  gradient,
  art,
  badge,
  progress,
  href,
  imageHeight = 96,
}: {
  title: React.ReactNode;
  meta: React.ReactNode;
  /** The gradient plate, drawn when there is no artwork. */
  gradient?: string;
  /** Real artwork for the banner; wins over `gradient` when given. */
  art?: React.ReactNode;
  badge?: React.ReactNode;
  progress?: number;
  href?: string;
  imageHeight?: number;
}) {
  const inner = (
    <>
      <div
        className="relative flex-none overflow-hidden"
        style={art ? { height: imageHeight } : { height: imageHeight, background: gradient }}
      >
        {art}
        {badge && <div className="absolute left-[10px] top-[10px]">{badge}</div>}
      </div>
      <div className="px-[14px] py-3">
        <div className="line-clamp-2 text-[14px] font-bold leading-[1.35] text-ink">{title}</div>
        <div className="mt-[5px] text-[11.5px] text-ink-faint">{meta}</div>
        {progress != null && <ProgressBar value={progress} height={4} className="mt-[9px]" />}
      </div>
    </>
  );

  const cls =
    "flex flex-col overflow-hidden rounded-card border border-line bg-white no-underline transition-colors hover:border-line-strong";

  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/* ── IconButton ───────────────────────────────────────────────────────────── */

export function IconButton({
  icon,
  active = false,
  size = 34,
  label,
  onClick,
  href,
  className = "",
}: {
  icon: React.ReactNode;
  active?: boolean;
  size?: number;
  label: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const cls = [
    "inline-flex flex-none items-center justify-center rounded-btn transition-colors",
    active ? "bg-[var(--teal-wash)] text-teal" : "text-ink-body hover:bg-line-soft",
    className,
  ].join(" ");
  const style = { width: size, height: size };
  return href ? (
    <Link href={href} aria-label={label} title={label} className={cls} style={style}>
      {icon}
    </Link>
  ) : (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cls} style={style}>
      {icon}
    </button>
  );
}

/* ── HeatGrid ─────────────────────────────────────────────────────────────── */

const HEAT = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];

export function HeatGrid({
  levels,
  columns = 12,
  titles,
}: {
  /** One 0-4 step per tile. */
  levels: number[];
  columns?: number;
  /** Optional tooltip per tile, same order. */
  titles?: string[];
}) {
  return (
    <div
      className="grid gap-[5px]"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
    >
      {levels.map((lvl, i) => (
        <div
          key={i}
          title={titles?.[i]}
          className="rounded-[4px]"
          style={{
            paddingTop: "100%",
            backgroundColor: HEAT[Math.max(0, Math.min(4, lvl))],
          }}
        />
      ))}
    </div>
  );
}

export function HeatLegend() {
  return (
    <div className="flex items-center gap-[5px]">
      <span className="text-[11px] text-ink-faint">Minder</span>
      {HEAT.map((c) => (
        <span key={c} className="h-[13px] w-[13px] rounded-[4px]" style={{ backgroundColor: c }} />
      ))}
      <span className="text-[11px] text-ink-faint">Meer</span>
    </div>
  );
}

/* ── WeekBars ─────────────────────────────────────────────────────────────── */

const DAY_LABELS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export function WeekBars({
  values,
  todayIndex,
  labels = DAY_LABELS,
}: {
  /** Seven numbers, any scale; the tallest fills 76 px. */
  values: number[];
  todayIndex: number;
  /** The week does not always start on Sunday - the source decides. */
  labels?: string[];
}) {
  const max = Math.max(1, ...values);
  return (
    <div>
      <div className="flex h-[76px] items-end gap-[7px]">
        {values.map((v, i) => {
          const empty = v <= 0;
          const h = empty ? 6 : Math.max(10, Math.round((v / max) * 76));
          return (
            <div
              key={i}
              className="flex-1 rounded-t-[7px]"
              style={{
                height: h,
                backgroundColor: empty
                  ? "var(--bar-empty)"
                  : i === todayIndex
                    ? "var(--bar-today)"
                    : "var(--bar-read)",
              }}
            />
          );
        })}
      </div>
      <div className="mt-[7px] flex gap-[7px]">
        {labels.map((d, i) => (
          <span
            key={d}
            className={`flex-1 text-center text-[11.5px] ${
              i === todayIndex ? "font-semibold text-teal-dark" : "text-ink-faint"
            }`}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */

/** A grey plate for a route's `loading.tsx`, on the light ground the shell uses. */
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton-pulse rounded-[6px] bg-line ${className}`} style={style} />;
}

/* ── FadeBottom ───────────────────────────────────────────────────────────── */

/** The 96 px wash at the foot of a reading pane, so text ends rather than stops. */
export function FadeBottom() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
      style={{ background: "linear-gradient(rgba(255,255,255,0),var(--surface) 78%)" }}
    />
  );
}
