"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Search, Plus, Edit, Trash2, ChevronDown, MoreHorizontal, Lock,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { EditNoteModal } from "../../components/study/EditNoteModal"
import AppShell from "../../components/shell/AppShell"
import { Card, Skeleton } from "../../components/kit/primitives"

interface Note {
  _id: string
  verseReference: string
  book: string
  chapter: number
  verse?: number
  verseText: string
  translation: string
  noteText: string
  highlightColor: string
  tags: string[]
  isPrivate: boolean
  type: "note" | "highlight" | "both"
  language: string
  createdAt: string
  updatedAt: string
}

const TYPE_LABELS: Record<string, string> = {
  note: "Notitie", highlight: "Markering", both: "Notitie & markering",
}

/**
 * The reader's own highlight colours, as they are stored on the note. The six
 * the note editors offer (components/study/EditNoteModal.tsx).
 *
 * The only literal colours in this redesign that are not design tokens, and
 * deliberately so: they are DATA, not styling. Which of the six a note carries
 * is the reader's own choice, stored on the document, and the swatch has to
 * show that choice rather than a palette value of ours.
 */
const HIGHLIGHT_HEX: Record<string, string> = {
  yellow: "#FEF3C7", blue: "#DBEAFE", green: "#D1FAE5",
  pink: "#FCE7F3", purple: "#E9D5FF", orange: "#FED7AA",
}

/** The three tabs, mapped onto the `type` filter /api/notes already takes. */
const TABS: { value: string; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "note", label: "Notities" },
  { value: "highlight", label: "Markeringen" },
]

/**
 * Notities (design_handoff_web/PAGES.md §4).
 *
 * Rows, not cards: one card holds the whole list and each note is a row inside
 * it, edge to edge, with a single hairline between. No date headings and no
 * grouping - the date sits in the row's own meta line.
 *
 * The data layer is untouched: the same /api/notes query with the same
 * server-side book/tag/type filters, the same twenty per page, the same edit
 * modal and the same delete (same confirm wording, same DELETE, same local
 * removal). What changed is what those values render as, plus two things worth
 * naming:
 *
 * - "Bladwijzers" is the design's third tab and the web has no bookmark source
 *   (only the mobile API has one), so the row is the two filters that do exist
 *   plus "Alles".
 * - "Exporteren" writes a text file in the browser from the notes already on
 *   screen. There is no export endpoint and this adds none; the card says so in
 *   as many words.
 */
export default function NotesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [notes, setNotes]               = useState<Note[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [searchTerm, setSearchTerm]     = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedBook, setSelectedBook] = useState("all")
  const [selectedTag, setSelectedTag]   = useState("all")
  const [sortOrder, setSortOrder]       = useState<"new" | "old">("new")
  const [currentPage, setCurrentPage]   = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [editingNote, setEditingNote]   = useState<Note | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const uniqueBooks = Array.from(new Set(notes.map(n => n.book))).sort()
  const uniqueTags  = Array.from(new Set(notes.flatMap(n => n.tags))).sort()

  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/inloggen")
  }, [session, status, router])

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedBook !== "all") params.append("book", selectedBook)
      if (selectedTag  !== "all") params.append("tag",  selectedTag)
      if (selectedType !== "all") params.append("type", selectedType)
      params.append("page",  currentPage.toString())
      params.append("limit", "20")
      const res  = await fetch(`/api/notes?${params}`)
      const data = await res.json().catch(() => null)
      if (!res.ok || !data || !Array.isArray(data.notes)) {
        throw new Error(typeof data?.error === "string" ? data.error : "Notities konden niet worden geladen.")
      }
      setNotes(data.notes)
      setTotalPages(typeof data.pagination?.totalPages === "number" ? data.pagination.totalPages : 1)
      setError(null)
    } catch {
      setError("Notities konden niet worden geladen.")
    } finally {
      setLoading(false)
    }
  }, [selectedBook, selectedTag, selectedType, currentPage])

  useEffect(() => { if (session) fetchNotes() }, [session, fetchNotes])

  const filtered = useMemo(() => {
    const needle = searchTerm.toLowerCase()
    const rows = notes.filter(n =>
      n.verseReference.toLowerCase().includes(needle) ||
      n.verseText.toLowerCase().includes(needle) ||
      n.noteText.toLowerCase().includes(needle) ||
      n.tags.some(t => t.toLowerCase().includes(needle))
    )
    // Ordering only - the server already returns newest first, so this is the
    // same page of records read from the other end.
    return sortOrder === "new"
      ? rows
      : [...rows].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
  }, [notes, searchTerm, sortOrder])

  /** Counts for the rail and the header. They describe the loaded page, which
   *  is what the endpoint returns - never a total the client cannot know. */
  const counts = useMemo(() => {
    const byBook: Record<string, number> = {}
    let noteCount = 0
    let highlightCount = 0
    for (const note of notes) {
      byBook[note.book] = (byBook[note.book] ?? 0) + 1
      if (note.type === "note" || note.type === "both") noteCount += 1
      if (note.type === "highlight" || note.type === "both") highlightCount += 1
    }
    return { byBook, noteCount, highlightCount }
  }, [notes])

  const deleteNote = async (id: string) => {
    if (!confirm("Weet u zeker dat u deze notitie wilt verwijderen?")) return
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" })
      setNotes(notes.filter(n => n._id !== id))
    } catch {
      setError("Verwijderen mislukt.")
    }
  }

  const editNote = (note: Note) => { setEditingNote(note); setShowEditModal(true) }
  const handleSaved = (updated: Note) => {
    setNotes(notes.map(n => n._id === updated._id ? updated : n))
    setShowEditModal(false); setEditingNote(null)
  }

  /** The export the design asks for: the rows on screen, as plain text, written
   *  in the browser. No endpoint is called and nothing leaves the page. */
  const exportNotes = () => {
    const body = filtered
      .map(note =>
        [
          note.verseReference,
          new Date(note.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }),
          note.verseText ? `"${note.verseText}" (${note.translation})` : "",
          note.noteText,
        ].filter(Boolean).join("\n"),
      )
      .join("\n\n---\n\n")
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "bijbelstudie-notities.txt"
    link.click()
    URL.revokeObjectURL(url)
  }

  if (status === "loading" || !session) {
    return (
      <AppShell title="Notities">
        <div role="status" aria-label="Notities laden" className="flex min-h-full gap-5">
          <Skeleton className="min-w-0 flex-1 rounded-card" />
          <div className="flex w-[300px] flex-none flex-col gap-[14px]">
            <Skeleton className="h-11 rounded-[12px]" />
            <Skeleton className="h-[280px] rounded-card" />
            <Skeleton className="h-[140px] rounded-card" />
          </div>
        </div>
      </AppShell>
    )
  }

  const rowLabel = `${counts.noteCount} ${counts.noteCount === 1 ? "notitie" : "notities"} · ${counts.highlightCount} ${counts.highlightCount === 1 ? "markering" : "markeringen"}`

  return (
    <AppShell title="Notities">
      <div className="flex min-h-full gap-5">
        {/* ── The list ─────────────────────────────────────────────── */}
        <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Tabs. Same filter, same values - only the shape changed. */}
          <div className="flex flex-none items-center gap-[22px] border-b border-line px-[22px]">
            {TABS.map(tab => {
              const active = tab.value === selectedType
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => { setSelectedType(tab.value); setCurrentPage(1) }}
                  className={[
                    "border-b-2 pb-[13px] pt-4 text-[14px] transition-colors",
                    active
                      ? "border-teal font-semibold text-teal"
                      : "border-transparent font-medium text-ink-muted hover:text-ink-body",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              )
            })}
            <div className="flex-1" />
            {!loading && <span className="text-[12.5px] text-ink-faint tabular-nums">{rowLabel}</span>}
          </div>

          {error && (
            <div role="alert" className="border-b border-line px-[22px] py-4 text-[13.5px] text-danger">
              {error}
            </div>
          )}

          {loading ? (
            <div role="status" aria-label="Notities laden">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-3 border-b border-line px-[22px] py-[18px]">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="max-w-[34rem] px-[22px] py-10">
              <h3 className="text-[15.5px] font-bold text-ink">Geen notities gevonden</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
                {searchTerm || selectedBook !== "all" || selectedTag !== "all" || selectedType !== "all"
                  ? "Geen notitie past bij deze zoekopdracht of filters."
                  : "Begin met bestuderen om hier je notities te zien."}
              </p>
              <button
                type="button"
                onClick={() => router.push("/studie")}
                className="mt-5 inline-flex items-center gap-2 rounded-btn border border-line px-4 py-2.5 text-[13.5px] font-semibold text-ink-body transition-colors hover:bg-line-soft"
              >
                <Plus className="h-4 w-4" aria-hidden /> Begin met bestuderen
              </button>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filtered.map(note => {
                const swatch = note.type === "note" ? null : HIGHLIGHT_HEX[note.highlightColor] || null
                return (
                  <article key={note._id} className="border-b border-line px-[22px] py-[18px] last:border-b-0">
                    {/* Meta: where it is, when it was written, and the menu. */}
                    <div className="flex items-center gap-[9px]">
                      <span className="text-[12.5px] font-semibold text-teal">{note.verseReference}</span>
                      <span className="h-[3px] w-[3px] rounded-full bg-line-strong" />
                      <time dateTime={note.createdAt} className="text-[12.5px] text-ink-faint">
                        {new Date(note.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                      </time>
                      {swatch && (
                        <span
                          aria-hidden
                          title={TYPE_LABELS[note.type]}
                          className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-line"
                          style={{ backgroundColor: swatch }}
                        />
                      )}
                      {note.isPrivate && (
                        <>
                          <Lock className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
                          <span className="sr-only">Alleen voor jou zichtbaar</span>
                        </>
                      )}
                      <div className="flex-1" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Acties voor notitie bij ${note.verseReference}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-faint transition-colors hover:bg-line-soft hover:text-ink-body"
                          >
                            <MoreHorizontal size={17} aria-hidden />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => editNote(note)}>
                            <Edit className="mr-2 h-4 w-4" /> Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteNote(note._id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* The reader's own words: regular weight, not bold - they
                        are a sentence, not a heading. */}
                    {note.noteText && (
                      <p className="mt-2 max-w-[720px] break-words text-[14.5px] leading-[1.6] text-ink">
                        {note.noteText}
                      </p>
                    )}

                    {/* The verse, behind a 2 px rule, in the serif face. */}
                    {note.verseText && (
                      <div className="mt-[9px] flex max-w-[720px] items-stretch gap-[10px]">
                        <span className="w-[2px] flex-none bg-teal-soft" />
                        <p className="font-serif text-[13px] leading-[1.6] text-ink-muted">
                          {note.verseText}
                        </p>
                      </div>
                    )}

                    {note.tags.length > 0 && (
                      <ul className="m-0 mt-[9px] flex flex-wrap gap-x-3 gap-y-1 p-0">
                        {note.tags.map((tag, i) => (
                          <li key={i} className="min-w-0 list-none break-all text-[11px] text-ink-faint">#{tag}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                )
              })}

              {totalPages > 1 && (
                <nav aria-label="Paginering" className="flex items-center justify-center gap-4 py-6">
                  <button
                    type="button"
                    className="rounded-btn border border-line px-3 py-2 text-[13px] font-semibold text-ink-body transition-colors hover:bg-line-soft disabled:opacity-40"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Vorige
                  </button>
                  <span className="text-[12.5px] text-ink-faint tabular-nums">
                    Pagina {currentPage} van {totalPages}
                  </span>
                  <button
                    type="button"
                    className="rounded-btn border border-line px-3 py-2 text-[13px] font-semibold text-ink-body transition-colors hover:bg-line-soft disabled:opacity-40"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Volgende
                  </button>
                </nav>
              )}
            </div>
          )}
        </Card>

        {/* ── The rail ─────────────────────────────────────────────── */}
        <aside className="flex w-[300px] flex-none flex-col gap-[14px]">
          <button
            type="button"
            onClick={() => router.push("/studie")}
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-teal text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={18} strokeWidth={2.2} />
            Nieuwe notitie
          </button>

          <Card className="flex-none p-[18px]">
            {/* The search lives here rather than in a toolbar of its own: the
                design gives this page one rail for narrowing the list, and this
                is what narrows it most. */}
            <label htmlFor="notities-zoeken" className="sr-only">Zoek in je notities</label>
            <div className="flex h-9 items-center gap-2 rounded-[9px] border border-line px-[11px]">
              <Search size={15} className="flex-none text-ink-muted" aria-hidden />
              <input
                id="notities-zoeken"
                type="search"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Zoek in je notities"
                className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
              />
            </div>

            <div className="mt-[14px] text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
              Filteren
            </div>
            <div className="mt-[10px] flex flex-col gap-[2px]">
              <FilterRow
                label="Alle notities"
                count={notes.length}
                active={selectedBook === "all"}
                onClick={() => { setSelectedBook("all"); setCurrentPage(1) }}
              />
              {uniqueBooks.map(book => (
                <FilterRow
                  key={book}
                  label={book}
                  count={counts.byBook[book] ?? 0}
                  active={selectedBook === book}
                  onClick={() => { setSelectedBook(book); setCurrentPage(1) }}
                />
              ))}
            </div>

            {uniqueTags.length > 0 && (
              <>
                <div className="my-[14px] h-px bg-line" />
                <div className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
                  Tags
                </div>
                <div className="mt-[10px] flex flex-col gap-[2px]">
                  <FilterRow
                    label="Alle tags"
                    active={selectedTag === "all"}
                    onClick={() => { setSelectedTag("all"); setCurrentPage(1) }}
                  />
                  {uniqueTags.map(tag => (
                    <FilterRow
                      key={tag}
                      label={`#${tag}`}
                      active={selectedTag === tag}
                      onClick={() => { setSelectedTag(tag); setCurrentPage(1) }}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="my-[14px] h-px bg-line" />
            <div className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
              Sorteren
            </div>
            <div className="relative mt-[10px] flex h-9 items-center rounded-[9px] border border-line">
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as "new" | "old")}
                aria-label="Sorteervolgorde"
                className="h-full w-full cursor-pointer appearance-none rounded-[9px] bg-transparent pl-3 pr-8 text-[13px] font-medium text-ink-body outline-none"
              >
                <option value="new">Nieuwste eerst</option>
                <option value="old">Oudste eerst</option>
              </select>
              <ChevronDown size={15} strokeWidth={2} className="pointer-events-none absolute right-[10px] text-ink-muted" />
            </div>
          </Card>

          <Card className="flex-none p-[18px]">
            <div className="text-[14px] font-semibold text-ink">Exporteren</div>
            <p className="mt-[6px] text-[12.5px] leading-[1.55] text-ink-muted">
              Download de notities die je nu ziet als tekstbestand.
            </p>
            <button
              type="button"
              onClick={exportNotes}
              disabled={filtered.length === 0}
              className="mt-3 flex h-9 w-full items-center justify-center rounded-[9px] border border-line text-[13px] font-semibold text-ink-body transition-colors hover:bg-line-soft disabled:opacity-40"
            >
              Downloaden
            </button>
          </Card>
        </aside>
      </div>

      <EditNoteModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingNote(null) }}
        note={editingNote}
        onSave={handleSaved}
      />
    </AppShell>
  )
}

/** One 34 px row in the rail's filter list. */
function FilterRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-[34px] items-center rounded-[8px] px-[11px] text-left transition-colors",
        active ? "bg-[var(--teal-wash-2)]" : "hover:bg-line-soft",
      ].join(" ")}
    >
      <span className={`flex-1 truncate text-[13px] ${active ? "font-semibold text-teal" : "font-medium text-ink-body"}`}>
        {label}
      </span>
      {count != null && <span className="text-[12px] font-medium text-ink-faint tabular-nums">{count}</span>}
    </button>
  )
}
