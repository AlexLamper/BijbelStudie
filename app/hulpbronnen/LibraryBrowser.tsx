"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, ExternalLink, Filter, Search } from "lucide-react"
import { LIBRARY, CATEGORIES, getCategoryMeta, type LibraryItem, type LibraryCategory } from "./library"
import { ProBadge } from "../../components/ui/ProBadge"
import { Card } from "../../components/kit/primitives"

type AccessFilter = "all" | "free" | "pro"

const ACCESS_OPTIONS: { id: AccessFilter; label: string }[] = [
  { id: "all", label: "Alles" },
  { id: "free", label: "Gratis" },
  { id: "pro", label: "Pro" },
]

/**
 * Everything on /hulpbronnen that answers to a click: the search field, the two
 * filter rows and the shelf they narrow. The heading, the intro, the structured
 * data and the onward links stay in page.tsx, server-rendered - the same split
 * as app/studies/page.tsx and StudiesBrowser.
 *
 * `notice` is the rights notice, rendered by the server page and handed in so it
 * keeps its place between the filters and the shelf.
 */
export default function LibraryBrowser({ notice }: { notice: React.ReactNode }) {
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
    <>
      {/* -- Search and filters ----------------------------------------- */}
      <div className="mt-7 flex flex-col gap-3">
        <div className="search-field flex h-[46px] w-full max-w-[440px] items-center gap-[10px] rounded-[12px] border border-line-strong bg-surface px-[15px] shadow-field">
          <label htmlFor="bibliotheek-zoeken" className="sr-only">Zoek in de bibliotheek</label>
          {/* Identifies the field, not decoration. */}
          <Search size={18} strokeWidth={1.9} aria-hidden className="flex-none text-ink-muted" />
          <input
            id="bibliotheek-zoeken"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Zoek op titel, auteur of bron..."
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] text-ink outline-none placeholder:text-ink-muted"
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
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

      <div className="mt-7">{notice}</div>

      {/* -- The shelf -------------------------------------------------- */}
      <section aria-labelledby="bibliotheek-lijst" className="mt-9">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 id="bibliotheek-lijst" className="text-[16px] font-bold text-ink">Werken</h2>
          <div className="flex-1" />
          <span className="text-[12.5px] tabular-nums text-ink-faint">
            {filtered.length} van {LIBRARY.length} {LIBRARY.length === 1 ? "werk" : "werken"}
          </span>
        </div>

        {filtered.length === 0 ? (
          <Card className="mt-4 max-w-[34rem] px-[18px] py-6">
            <h3 className="text-[15px] font-semibold text-ink">Geen werken gevonden</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
              Geen werk in de bibliotheek past bij deze zoekopdracht of filters.
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={() => { setQuery(""); setCategory("all"); setAccess("all") }}
                className="mt-4 inline-flex h-10 items-center rounded-btn border border-line bg-surface px-4 text-[13.5px] font-semibold text-teal-dark outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-[#0D9488] dark:text-teal-400"
              >
                Filters wissen
              </button>
            )}
          </Card>
        ) : (
          <ul className="stagger-in m-0 mt-4 grid list-none grid-cols-1 gap-[14px] p-0 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(item => (
              <li key={item.slug} className="list-none">
                <BookCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/* -- Parts ------------------------------------------------------- */

function Count({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={`tabular-nums ${active ? "text-white/75" : "text-ink-faint"}`}>
      &middot; {children}
    </span>
  )
}

/**
 * The kit's Chip (components/kit/primitives.tsx) in shape and colour, written
 * out here because these chips carry a category dot, a count and `aria-pressed`,
 * none of which that primitive takes. The chosen chip fills with `teal-dark`
 * rather than `teal`, because its label is small white type.
 */
function Chip({
  active, onClick, dot, children,
}: {
  active: boolean
  onClick: () => void
  /** The category's own colour, as the marker that identifies it - never as the fill under the label. */
  dot?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-[13px] py-[7px] text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2",
        active
          ? "border-teal-dark bg-teal-dark font-semibold text-white"
          : "border-line bg-surface font-medium text-ink-body hover:border-line-strong",
      ].join(" ")}
    >
      {dot && (
        <span
          aria-hidden
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${active ? "ring-1 ring-white/80" : ""}`}
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
      className="group flex h-full flex-col rounded-card border border-line bg-surface p-[18px] no-underline outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-[#0D9488]"
    >
      {/* Category + access */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          <span
            aria-hidden
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: cat.color }}
          />
          <span className="truncate">{cat.label}</span>
        </span>
        {item.isPro && <ProBadge />}
      </div>

      <h3 className="mt-3 text-[15px] font-bold leading-snug text-ink">
        {item.title}
      </h3>

      <p className="mt-1 text-[12px] text-ink-faint">
        {[item.author, item.year].filter(Boolean).join(" · ")}
      </p>

      <p className="mb-4 mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-ink-muted">
        {item.description}
      </p>

      {/* Source and action. `mt-auto` keeps this on the card's floor, so a short
          description does not leave the row floating mid-card. */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-soft pt-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-faint">
          {/* Identifies where the work lives - a data type, not decoration. */}
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{item.source}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-teal-dark dark:text-teal-400">
          Openen <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}
