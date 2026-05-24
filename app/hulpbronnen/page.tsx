"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  BookOpen, Search, ArrowRight, Sparkles, ExternalLink,
  Library as LibraryIcon, ShieldCheck, Filter,
} from "lucide-react"
import { LIBRARY, CATEGORIES, getCategoryMeta, type LibraryItem, type LibraryCategory } from "./library"

const TEAL = "#0D9488"

type AccessFilter = "all" | "free" | "pro"

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 xl:px-10 py-8 space-y-8">

        {/* Hero */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: TEAL }}>
            Bibliotheek
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground mb-2">
            Hulpbronnen
          </h1>
          <p className="text-gray-500 dark:text-muted-foreground text-sm max-w-2xl">
            Een groeiende collectie publiek-domein Bijbels, prekenbundels, commentaren en dogmatische werken.
            Direct in de app leesbaar of openbaar te raadplegen bij de bron.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Zoek op titel, auteur of bron..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-secondary/40 text-sm text-gray-900 dark:text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <Chip
              active={category === "all"}
              onClick={() => setCategory("all")}
              color={TEAL}
            >
              Alles <span className="opacity-60">· {counts.all}</span>
            </Chip>
            {CATEGORIES.map(c => (
              <Chip
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
                color={c.color}
              >
                {c.label} <span className="opacity-60">· {counts[c.id]}</span>
              </Chip>
            ))}
          </div>

          {/* Access toggle */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
              <Filter className="h-3 w-3" /> Toegang
            </div>
            <div className="flex gap-1.5">
              {([
                { id: "all",  label: "Alles" },
                { id: "free", label: "Gratis" },
                { id: "pro",  label: "Pro" },
              ] as { id: AccessFilter; label: string }[]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAccess(opt.id)}
                  className={[
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                    access === opt.id
                      ? "bg-[#0D9488] text-white border-[#0D9488]"
                      : "bg-transparent text-gray-600 dark:text-muted-foreground border-gray-200 dark:border-border hover:bg-gray-100 dark:hover:bg-secondary",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl"
          style={{ backgroundColor: "rgba(13,148,136,0.04)", border: "1px solid rgba(13,148,136,0.15)" }}>
          <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: TEAL }} />
          <p className="text-sm text-gray-700 dark:text-foreground/90 leading-relaxed">
            <strong className="font-semibold">Vrij beschikbaar.</strong> Alle werken in deze bibliotheek
            zijn publiek domein of vrij raadpleegbaar bij hun bron (DBNL, Project Gutenberg, universitaire repositories).
            We hosten geen content zelf — we verwijzen door of tonen materiaal direct vanuit de oorspronkelijke uitgever.
          </p>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <LibraryIcon className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-muted-foreground" />
            <p className="text-sm text-gray-500 dark:text-muted-foreground">
              Geen werken gevonden voor deze filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => <BookCard key={item.slug} item={item} />)}
          </div>
        )}

        {/* Footer CTA */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/studie"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}>
            <BookOpen className="h-4 w-4" />
            Naar Bijbelstudie
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/feedback"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-secondary text-gray-700 dark:text-foreground hover:bg-gray-200 dark:hover:bg-secondary/80 transition-colors">
            Werk voorstellen
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Components ─────────────────────────────────────────────────── */

function Chip({
  active, onClick, color, children,
}: {
  active: boolean
  onClick: () => void
  color: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
        active ? "text-white border-transparent" : "bg-transparent text-gray-700 dark:text-foreground border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-secondary",
      ].join(" ")}
      style={active ? { backgroundColor: color } : undefined}
    >
      {children}
    </button>
  )
}

function BookCard({ item }: { item: LibraryItem }) {
  const cat = getCategoryMeta(item.category)
  return (
    <Link
      href={`/hulpbronnen/${item.slug}`}
      className="group block bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5 hover:border-[#0D9488] dark:hover:border-[#0D9488] hover:shadow-sm transition-all no-underline"
    >
      {/* Top row: category + pro */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ backgroundColor: cat.tint, color: cat.color }}>
          {cat.label}
        </span>
        {item.isPro && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "#D97706" }}>
            <Sparkles className="h-2.5 w-2.5" /> Pro
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-bold text-base text-gray-900 dark:text-foreground leading-snug mb-1 group-hover:text-[#0D9488] transition-colors">
        {item.title}
      </h3>

      {/* Author + year */}
      <p className="text-xs text-gray-500 dark:text-muted-foreground mb-3">
        {[item.author, item.year].filter(Boolean).join(" · ")}
      </p>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-foreground/80 leading-relaxed line-clamp-3 mb-4">
        {item.description}
      </p>

      {/* Footer: source + action */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-border">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          {item.source}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488]">
          Openen <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  )
}
