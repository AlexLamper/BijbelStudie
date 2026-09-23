import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { Header } from "../landing/navbar";
import { Footer } from "../landing/footer";

/* Teal type is `text-teal-dark` (#0F766E): #0D9488 is 3.7:1 on white - fine as
   a fill, short of AA as type. On dark it lifts to teal-400. */

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Horizontal frame for every block on a content page: the full width of the
 * window with a gutter, never a fixed column. Pages fill the width with grids
 * and a side column; only running prose keeps a reading measure (`max-w-prose`
 * or similar) on the paragraph block itself, not on the page.
 */
export const CONTENT_FRAME = "w-full px-4 sm:px-6 lg:px-10 2xl:px-14";

/*
 * The platform vocabulary for content pages. These pages hang in the landing
 * header and footer (signed-out visitors and crawlers need both), but between
 * them they use the app's own surfaces: the `bg-line-soft` ground of AppShell,
 * white `rounded-card` panels with a `border-line` hairline, rows split by
 * `border-line-soft`, and a 20 rem rail on the right like the dashboard's.
 */

/** The article element: the frame plus the page's vertical rhythm. */
export const CONTENT_PAGE = `${CONTENT_FRAME} py-6 sm:py-8 lg:py-10`;

/** A panel on the ground, as the app's `Card` (components/kit/primitives). */
export const CONTENT_CARD = "rounded-card border border-line bg-surface p-5 sm:p-6";

/** An h2, in a panel or on the ground above a grid of panels. */
export const CONTENT_H2 = "text-[18px] font-bold tracking-[-0.2px] text-ink sm:text-[19px]";

/**
 * A side column that stays in view from lg up. The landing header is sticky
 * and 64 px tall (h-16); 88 px leaves the same 24 px gap the grid has. Only for
 * a rail that is short enough to fit a laptop screen: a sticky element taller
 * than the viewport hides its own lower half until the page ends.
 */
export const STICKY_RAIL = "lg:sticky lg:top-[88px] lg:self-start";

/**
 * Page frame for the public content pages (/bijbelstudie, /bijbelboeken,
 * /bijbel, /bijbel-over).
 *
 * These are server components on purpose: the whole point of these routes is
 * that a crawler gets the full text in the initial HTML without executing any
 * JavaScript. The Footer is a server component too; the Header stays a client
 * component for its mobile menu, and hydrates for that alone.
 */
export function ContentShell({
  crumbs,
  children,
}: {
  crumbs: Crumb[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-line-soft dark:bg-background">
      {/* The header's inner row takes the same frame as the breadcrumbs and
          the page, so the logo lines up with the content on a wide screen. */}
      <Header frame={CONTENT_FRAME} />
      {crumbs.length > 0 && <Breadcrumbs crumbs={crumbs} />}
      <main className="flex-grow">{children}</main>
      <Footer frame={CONTENT_FRAME} />
    </div>
  );
}

/**
 * The page's own title block: eyebrow, the one h1, a lede. `aside` sits beside
 * it from lg up (the stat tiles on /bijbelboeken) and under it below that.
 */
export function ContentHeader({
  eyebrow,
  title,
  lede,
  aside,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-6 lg:mb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
      <div className="min-w-0 max-w-[48rem]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1.4px] text-teal-dark dark:text-teal-400">
          {eyebrow}
        </p>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[34px]">
          {title}
        </h1>
        {lede && (
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted sm:text-[16px]">{lede}</p>
        )}
      </div>
      {aside && <div className="lg:w-[26rem] lg:flex-none">{aside}</div>}
    </header>
  );
}

/**
 * Visible breadcrumb trail. It has to exist on the page for the
 * BreadcrumbList structured data to be eligible - Google drops markup that
 * describes navigation a visitor cannot see.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Kruimelpad"
      className="border-b border-line bg-surface"
    >
      <ol className={`${CONTENT_FRAME} py-3 flex items-center gap-1.5 text-xs flex-wrap text-gray-500 dark:text-muted-foreground`}>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
              {isLast ? (
                <span aria-current="page" className="font-medium text-gray-900 dark:text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.path} className="hover:underline">
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Previous / next as one panel with a row per direction. Side by side from sm
 * up; `rail` stacks them again from lg up, for a nav that sits in a side
 * column. A lone link (the first or last page of a chain) takes the full row.
 */
export function PrevNextNav({
  label,
  previous,
  next,
  rail = false,
}: {
  /** The nav's accessible name, e.g. "Andere hoofdstukken". */
  label: string;
  previous?: { href: string; label: string };
  next?: { href: string; label: string };
  rail?: boolean;
}) {
  if (!previous && !next) return null;
  const both = !!previous && !!next;
  const row =
    "flex min-w-0 items-center gap-3 px-[18px] py-3 no-underline transition-colors hover:bg-line-soft";
  // The second row's hairline: on top when stacked, on the left side by side.
  const divider = rail
    ? "border-t border-line-soft sm:border-l sm:border-t-0 lg:border-l-0 lg:border-t"
    : "border-t border-line-soft sm:border-l sm:border-t-0";
  return (
    <nav
      aria-label={label}
      className={`grid overflow-hidden rounded-card border border-line bg-surface ${
        both ? `sm:grid-cols-2 ${rail ? "lg:grid-cols-1" : ""}` : ""
      }`}
    >
      {previous && (
        <Link href={previous.href} className={row}>
          <ArrowLeft className="h-4 w-4 shrink-0 text-teal-dark dark:text-teal-400" aria-hidden />
          <span className="min-w-0">
            <span className="block text-[11.5px] text-ink-faint">Vorige</span>{" "}
            <span className="block truncate text-[14px] font-semibold text-ink">{previous.label}</span>
          </span>
        </Link>
      )}
      {next && (
        <Link href={next.href} className={`${row} justify-end text-right ${previous ? divider : ""}`}>
          <span className="min-w-0">
            <span className="block text-[11.5px] text-ink-faint">Volgende</span>{" "}
            <span className="block truncate text-[14px] font-semibold text-ink">{next.label}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-teal-dark dark:text-teal-400" aria-hidden />
        </Link>
      )}
    </nav>
  );
}

/**
 * Card grid of internal links, rendered at the foot of a content page. The
 * grid packs as many ~17 rem cards as the width it is given allows and lets
 * them share the row, so it fills a full-width frame and still reads in a
 * narrow column. `prefetch={false}` for targets that are rendered per request.
 */
export function RelatedLinks({
  title = "Verder lezen",
  links,
  prefetch,
}: {
  title?: string;
  links: { href: string; label: string; description: string }[];
  prefetch?: boolean;
}) {
  return (
    <section className="mt-10 lg:mt-12">
      <h2 className={`${CONTENT_H2} mb-4`}>{title}</h2>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))]">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={prefetch}
            className="group block rounded-card border border-line bg-surface p-[18px] no-underline transition-colors hover:border-line-strong"
          >
            <span className="block text-[14.5px] font-semibold text-teal-dark group-hover:underline dark:text-teal-400">
              {link.label}
            </span>
            <span className="mt-1 block text-[13px] leading-[1.55] text-ink-muted">
              {link.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
