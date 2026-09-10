"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, BookOpen, ChevronRight, ExternalLink, Filter, Search, ShieldCheck } from "lucide-react"
import { LIBRARY, CATEGORIES, getCategoryMeta, type LibraryItem, type LibraryCategory } from "./library"
import { JsonLd } from "../../components/seo/JsonLd"
import { ProBadge } from "../../components/ui/ProBadge"
import { SectionHeading } from "../../components/scene/pieces"
import { CTA_PRIMARY, EYEBROW, TEAL_ON_DARK, TILE } from "../../components/scene/tokens"
import { absoluteUrl } from "../../lib/seo/constants"
import {
  graph,
  webPageNode,
  breadcrumbNode,
  itemListNode,
} from "../../lib/seo/structuredData"

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Hulpbronnen", path: "/hulpbronnen" },
]

/**
 * Built here rather than in layout.tsx: that layout also wraps
 * /hulpbronnen/:slug, and these nodes describe the list page specifically.
 * The value is constant, so it is computed once at module scope instead of on
 * every render.
 */
const RESOURCES_GRAPH = (() => {
  const url = absoluteUrl("/hulpbronnen")
  return graph(
    webPageNode({
      path: "/hulpbronnen",
      name: "Hulpbronnen: gratis bijbelstudieboeken",
      description:
        "Een groeiende bibliotheek met gratis, publiek-domein bijbels, bijbelcommentaren, prekenbundels en dogmatische werken.",
      type: "CollectionPage",
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(CRUMBS, url),
    itemListNode({
      pageUrl: url,
      name: "Bibliotheek",
      // Paywalled items are listed because they are visible in this list;
      // only their own detail pages carry noindex.
      items: LIBRARY.map(item => ({
        name: item.title,
        path: `/hulpbronnen/${item.slug}`,
        description: item.description,
      })),
    })
  )
})()

/**
 * The controls on this page are native elements wearing literal colours.
 *
 * The shared button and input primitives are painted in theme tokens -
 * `bg-background`, `border-input`, `text-muted-foreground` - and every one of
 * those flips with the reader's light/dark setting while the landscape does
 * not. Same values, same handlers, colours that belong to the scene.
 */
const CONTROL =
  "inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white outline-none transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white"

/**
 * A chosen filter is a WHITE pill, not a pill in the category's own colour.
 *
 * The five category colours (library.ts) were chosen as type on a 10% tint on a
 * white page. As a fill under white type on the scene they run from 3.7:1
 * (#0D9488, #3B82F6) to 5.6:1, so half of them fail outright and the row reads
 * as five different levels of emphasis. White is the one fill that separates
 * from whatever the landscape is doing behind it - the same reason CTA_PRIMARY
 * is white - and the colour still does its job one element to the left, as the
 * dot that identifies the category.
 */
const CONTROL_ON =
  "inline-flex items-center gap-2 rounded-full border border-transparent bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white"

type AccessFilter = "all" | "free" | "pro"

const ACCESS_OPTIONS: { id: AccessFilter; label: string }[] = [
  { id: "all", label: "Alles" },
  { id: "free", label: "Gratis" },
  { id: "pro", label: "Pro" },
]

export default function ResourcesPage() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<LibraryCategory | "all">("all")
  const [access, setAccess] = useState<AccessFilter>("all")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LIBRARY.filter(item => {
      if (category !== "all" && item.category !== category) return false
      if (access === "free" && item.isPro) return false
      if (access === "pro" && !item.isPro) return false
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        (item.author?.toLowerCase().includes(q) ?? false) ||
        item.description.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
      )
    })
  }, [query, category, access])

  const counts = useMemo(() => {
    const byCat: Record<string, number> = { all: LIBRARY.length }
    for (const c of CATEGORIES) byCat[c.id] = LIBRARY.filter(i => i.category === c.id).length
    return byCat
  }, [])

  const filtersActive = query.trim() !== "" || category !== "all" || access !== "all"

  return (
    // No wrapper and no gutter of its own: the shell (app/hulpbronnen/layout.tsx)
    // owns both, and the DOCUMENT has to be what scrolls or the landscape never
    // moves.
    <>
      <JsonLd data={RESOURCES_GRAPH} />

      {/* The visible trail has to exist for the BreadcrumbList markup to be
          eligible - Google drops structured data that describes navigation a
          visitor cannot see. Drawn here rather than with the shared
          `Breadcrumbs`, which is a full-bleed white bar with its own max-width
          and would cut the scene in half an inch from the top. */}
      <nav aria-label="Kruimelpad" className="pt-5">
        <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-xs text-white/60">
          {CRUMBS.map((crumb, i) => {
            const isLast = i === CRUMBS.length - 1
            return (
              <li key={crumb.path} className="flex list-none items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
                {isLast ? (
                  <span aria-current="page" className="font-medium text-white/90">{crumb.name}</span>
                ) : (
                  <Link
                    href={crumb.path}
                    className="rounded text-white/70 no-underline underline-offset-4 outline-none transition-colors hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {crumb.name}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {/* -- The sky ---------------------------------------------------- */}
      <header className="pb-10 pt-8">
        <div className="scene-sky max-w-[46rem]">
          <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>Bibliotheek</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Hulpbronnen voor bijbelstudie
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Een groeiende collectie van {LIBRARY.length} gratis, publiek-domein Bijbels, prekenbundels,
            bijbelcommentaren en dogmatische werken. Direct in de app leesbaar of openbaar te
            raadplegen bij de bron.
          </p>
        </div>
      </header>

      {/* -- The horizon: search and filters ---------------------------- */}
      <div className="scene-horizon">
        <div className={`space-y-4 p-4 shadow-lg shadow-black/20 sm:p-5 ${TILE}`}>
          {/* Search */}
          <div className="relative">
            <label htmlFor="bibliotheek-zoeken" className="sr-only">Zoek in de bibliotheek</label>
            {/* Identifies the field, not decoration. */}
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              id="bibliotheek-zoeken"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Zoek op titel, auteur of bron..."
              className="h-10 w-full rounded-lg border border-white/20 bg-black/30 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/50 hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white"
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter op categorie">
            <Chip active={category === "all"} onClick={() => setCategory("all")}>
              Alles <Count active={category === "all"}>{counts.all}</Count>
            </Chip>
            {CATEGORIES.map(c => (
              <Chip
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
                dot={c.color}
              >
                {c.label} <Count active={category === c.id}>{counts[c.id]}</Count>
              </Chip>
            ))}
          </div>

          {/* Access toggle */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
              {/* Identifies the control group, not decoration. */}
              <Filter className="h-3 w-3" aria-hidden /> Toegang
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter op toegang">
              {ACCESS_OPTIONS.map(opt => (
                <Chip key={opt.id} active={access === opt.id} onClick={() => setAccess(opt.id)}>
                  {opt.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* -- The desk: the shelf itself --------------------------------- */}
      <div className="pb-24 pt-12">
        {/* The rights notice. Its wording is the licence talking and is not ours
            to edit - the per-source notes live in library.ts. */}
        <div className={`flex items-start gap-3 p-4 ${TILE}`}>
          {/* Identifies what the notice is about, not decoration. */}
          <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TEAL_ON_DARK }} />
          <p className="m-0 text-sm leading-relaxed text-white/80">
            <strong className="font-semibold text-white">Vrij beschikbaar.</strong> Alle werken in deze bibliotheek
            zijn publiek domein of vrij raadpleegbaar bij hun bron (DBNL, Project Gutenberg, universitaire repositories).
            We hosten geen content zelf - we verwijzen door of tonen materiaal direct vanuit de oorspronkelijke uitgever.
          </p>
        </div>

        <section aria-labelledby="bibliotheek-lijst" className="mt-12">
          <SectionHeading
            id="bibliotheek-lijst"
            title="Werken"
            rule
            action={
              <span className="text-xs tabular-nums text-white/60">
                {filtered.length} van {LIBRARY.length} {LIBRARY.length === 1 ? "werk" : "werken"}
              </span>
            }
          />

          {filtered.length === 0 ? (
            /* No panel: an empty shelf is a sentence, and a box drawn around one
               only says the page is empty twice. */
            <div className="max-w-[34rem] pt-8">
              <h3 className="text-base font-semibold text-white">Geen werken gevonden</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Geen werk in de bibliotheek past bij deze zoekopdracht of filters.
              </p>
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setCategory("all"); setAccess("all") }}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
                >
                  Filters wissen
                </button>
              )}
            </div>
          ) : (
            <ul className="stagger-in m-0 mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(item => (
                <li key={item.slug} className="list-none">
                  <BookCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Where to go from the shelf. */}
        <div className="mt-14 flex flex-wrap items-center gap-4">
          <Link href="/studie" className={CTA_PRIMARY}>
            <BookOpen className="h-4 w-4" aria-hidden />
            Naar Bijbelstudie
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link
            href="/feedback"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white no-underline outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
          >
            Werk voorstellen
          </Link>
        </div>
      </div>
    </>
  )
}

/* -- Parts ------------------------------------------------------- */

function Count({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={`tabular-nums ${active ? "text-gray-900/55" : "text-white/50"}`}>
      &middot; {children}
    </span>
  )
}

function Chip({
  active, onClick, dot, children,
}: {
  active: boolean
  onClick: () => void
  /**
   * The category's own colour, as the marker that identifies it - never as the
   * fill under the label. See CONTROL_ON.
   */
  dot?: string
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={active ? CONTROL_ON : CONTROL}>
      {dot && (
        <span
          aria-hidden
          className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-black/30"
          style={{ backgroundColor: dot }}
        />
      )}
      {children}
    </button>
  )
}

function BookCard({ item }: { item: LibraryItem }) {
  const cat = getCategoryMeta(item.category)
  return (
    <Link
      href={`/hulpbronnen/${item.slug}`}
      className={`group flex h-full flex-col p-5 no-underline shadow-lg shadow-black/20 outline-none transition-colors hover:border-white/45 hover:bg-black/55 focus-visible:ring-2 focus-visible:ring-white ${TILE}`}
    >
      {/* Category + access */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
          <span
            aria-hidden
            className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-black/30"
            style={{ backgroundColor: cat.color }}
          />
          <span className="truncate">{cat.label}</span>
        </span>
        {item.isPro && <ProBadge />}
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-white">
        {item.title}
      </h3>

      <p className="mt-1 text-xs text-white/55">
        {[item.author, item.year].filter(Boolean).join(" · ")}
      </p>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/75">
        {item.description}
      </p>

      {/* Source and action. `mt-auto` keeps this on the card's floor, so a short
          description does not leave the row floating mid-card. */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/15 pt-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-white/55">
          {/* Identifies where the work lives - a data type, not decoration. */}
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{item.source}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold" style={{ color: TEAL_ON_DARK }}>
          Openen <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}
