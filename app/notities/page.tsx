"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  BookOpen, Search, Filter, Plus, Edit, Trash2,
  ChevronDown, MoreHorizontal, Tag, Lock,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu"
import { EditNoteModal } from "../../components/study/EditNoteModal"
import SceneShell from "../../components/scene/SceneShell"
import { SectionHeading } from "../../components/scene/pieces"
import { CTA_PRIMARY, EYEBROW, SCENE_X, TEAL_ON_DARK, TILE } from "../../components/scene/tokens"

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
 * The reader's own highlight colours, as they are stored on the note.
 *
 * The card this page used to draw showed a teal strip above every highlight,
 * which threw away the one thing the colour actually carries - the reader's own
 * choice - and spent an accent on saying nothing. The swatch in the margin now
 * shows the stored colour. The hexes are the six the note editors offer
 * (components/study/EditNoteModal.tsx); they are pale by design, which is
 * exactly what reads on a dark landscape.
 */
const HIGHLIGHT_HEX: Record<string, string> = {
  yellow: "#FEF3C7", blue: "#DBEAFE", green: "#D1FAE5",
  pink: "#FCE7F3", purple: "#E9D5FF", orange: "#FED7AA",
}

/**
 * A control on the scene: quiet glass, white type, a real focus ring.
 *
 * The shared `Button` and `Input` are drawn for a themed page - `bg-background`,
 * `border-input`, `text-muted-foreground` - and every one of those flips with
 * the reader's light/dark setting while the landscape does not. Rather than
 * fight them with overrides whose winner depends on Tailwind's generation
 * order, the controls on this page are native elements wearing literal colours.
 * Behaviour is unchanged: same values, same handlers.
 */
const SCENE_CONTROL =
  "inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs font-semibold text-white outline-none transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40"

/**
 * A row in the ledger: a margin column that carries the reference, the date and
 * what kind of note it is, and the line itself beside it. Below `sm` the margin
 * would leave nothing for the words, so the two stack.
 *
 * The right inset reserves the row's action menu, which is absolutely
 * positioned so it never enters the grid and never pushes a long reference into
 * a second line.
 */
const LEDGER_ROW = "relative py-5 pr-10 sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-start sm:gap-x-6"

/**
 * Notities.
 *
 * The full version of the "Recente notities" ledger at the bottom of the
 * dashboard, and deliberately continuous with it: a note is a line the reader
 * wrote, so it is set as one. The reference stands in the margin the way it
 * does in a printed bible, the scripture and the reader's own words run beside
 * it, and a hairline separates the rows. No cards - boxing a note in glass was
 * what made the reader's own writing look like somebody else's content.
 *
 * Three layers, the shell's own shape:
 *   1. the sky      - a SHORT one. Someone on this page came to find a note,
 *                     not to look at a landscape, so it is a heading block and
 *                     the one action, the way /admin does it.
 *   2. the horizon  - the search field and the three filters. On a page of
 *                     records that toolbar IS what should break the fold: it is
 *                     the first thing a reader with two hundred notes reaches
 *                     for. There is no honest row of figures to put here - the
 *                     API returns one page of twenty, so every count this
 *                     component can compute describes the page, not the shelf.
 *   3. the desk     - the ledger, bare on the landscape.
 *
 * Nothing about the data changed: the same /api/notes query with the same
 * server-side book/tag/type filters and the same client-side search over the
 * loaded page, the same twenty per page, the same edit modal, and the same
 * delete - same confirm wording, same DELETE /api/notes/[id], same local
 * removal.
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

  const filtered = notes.filter(n =>
    n.verseReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.verseText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.noteText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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

  // The signed-out / still-resolving frame. Dark, because the page it is
  // standing in for is a landscape and the light skeleton it replaced flashed a
  // white screen first.
  if (status === "loading" || !session) {
    return (
      <div
        role="status"
        aria-label="Notities laden"
        className={`min-h-screen w-full min-w-0 bg-[#0B1220] pt-6 ${SCENE_X}`}
      >
        <div className="max-w-[40rem] space-y-4">
          <div className="h-3 w-24 rounded bg-white/15" />
          <div className="h-11 w-[22rem] max-w-full rounded bg-white/15" />
          <div className="h-4 w-[26rem] max-w-full rounded bg-white/10" />
        </div>
      </div>
    )
  }

  return (
    <SceneShell backdrop="reader" header rail>
      {/* -- The sky: deliberately short ------------------------------- */}
      <section aria-labelledby="notities-titel" className="pb-10 pt-6">
        <div className="scene-sky flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <div className="min-w-0 max-w-[40rem]">
            {/* One of the two accents on this screen; the other is the
                reference in each row's margin. */}
            <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
              Notities
            </p>
            <h1
              id="notities-titel"
              className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              Wat je opviel
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Alles wat je opschreef en markeerde tijdens het lezen, op één plek.
            </p>
          </div>
          <button type="button" onClick={() => router.push("/studie")} className={CTA_PRIMARY}>
            <Plus className="h-4 w-4" aria-hidden /> Notitie schrijven
          </button>
        </div>
      </section>

      {/* -- The horizon: search and filters --------------------------- */}
      <div className="scene-horizon">
        <div className={`flex flex-col gap-3 p-3 shadow-lg shadow-black/20 sm:flex-row sm:items-center ${TILE}`}>
          <div className="relative min-w-0 flex-1">
            <label htmlFor="notities-zoeken" className="sr-only">Zoek in je notities</label>
            {/* Identifies the field, not decoration. */}
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              id="notities-zoeken"
              type="search"
              placeholder="Zoek notities, verzen of tags..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-white/20 bg-black/30 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/50 hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Type filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={SCENE_CONTROL}>
                  <Filter className="h-3.5 w-3.5" aria-hidden />
                  {selectedType === "all" ? "Alle typen" : TYPE_LABELS[selectedType]}
                  <ChevronDown className="h-3.5 w-3.5 text-white/60" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedType("all")}>Alle typen</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedType("note")}>Notities</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedType("highlight")}>Markeringen</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedType("both")}>Notities &amp; Markeringen</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Book filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={SCENE_CONTROL}>
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                  {selectedBook === "all" ? "Alle boeken" : selectedBook}
                  <ChevronDown className="h-3.5 w-3.5 text-white/60" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-60 overflow-y-auto">
                <DropdownMenuItem onClick={() => setSelectedBook("all")}>Alle boeken</DropdownMenuItem>
                <DropdownMenuSeparator />
                {uniqueBooks.map(b => <DropdownMenuItem key={b} onClick={() => setSelectedBook(b)}>{b}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tag filter */}
            {uniqueTags.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={SCENE_CONTROL}>
                    <Tag className="h-3.5 w-3.5" aria-hidden />
                    {selectedTag === "all" ? "Alle tags" : selectedTag}
                    <ChevronDown className="h-3.5 w-3.5 text-white/60" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-60 overflow-y-auto">
                  <DropdownMenuItem onClick={() => setSelectedTag("all")}>Alle tags</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {uniqueTags.map(t => <DropdownMenuItem key={t} onClick={() => setSelectedTag(t)}>#{t}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* -- The desk: the ledger -------------------------------------- */}
      <div className="pb-24 pt-12">
        <section aria-labelledby="notities-lijst">
          <SectionHeading
            id="notities-lijst"
            title="Je notities"
            rule
            action={
              loading ? null : (
                <span className="text-xs tabular-nums text-white/60">
                  {filtered.length} {filtered.length === 1 ? "notitie" : "notities"}
                  {totalPages > 1 ? ` · pagina ${currentPage} van ${totalPages}` : ""}
                </span>
              )
            }
          />

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-300/40 bg-red-950/60 px-4 py-3 text-sm text-red-100"
            >
              {error}
            </div>
          )}

          {/* Loading: the shape of what is coming, never a hold on the scene. */}
          {loading && (
            <div className="divide-y divide-white/10" role="status" aria-label="Notities laden">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={LEDGER_ROW}>
                  <div className="space-y-2">
                    <div className="h-3 w-24 rounded bg-white/20" />
                    <div className="h-2.5 w-20 rounded bg-white/10" />
                  </div>
                  <div className="mt-3 space-y-2 sm:mt-0">
                    <div className="h-3.5 w-full rounded bg-white/10" />
                    <div className="h-3.5 w-4/5 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <>
              {filtered.length === 0 ? (
                /* No panel here either: an empty shelf is a sentence, and a
                   sixteen-rem box drawn around one only says the page is
                   empty twice. */
                <div className="max-w-[34rem] pt-8">
                  <h3 className="text-base font-semibold text-white">Geen notities gevonden</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">
                    {searchTerm || selectedBook !== "all" || selectedTag !== "all" || selectedType !== "all"
                      ? "Geen notitie past bij deze zoekopdracht of filters."
                      : "Begin met bestuderen om hier je notities te zien."}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/studie")}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Plus className="h-4 w-4" aria-hidden /> Begin met bestuderen
                  </button>
                </div>
              ) : (
                <ul className="stagger-in m-0 divide-y divide-white/10 p-0">
                  {filtered.map(note => {
                    const swatch = note.type === "note" ? null : HIGHLIGHT_HEX[note.highlightColor] || null
                    return (
                      <li key={note._id} className={`list-none ${LEDGER_ROW}`}>
                        {/* The margin: where the note is, when it was written,
                            and what kind of note it is. */}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold tabular-nums" style={{ color: TEAL_ON_DARK }}>
                            {note.verseReference}
                          </p>
                          <p className="mt-1 text-[11px] tabular-nums text-white/55">
                            <time dateTime={note.createdAt}>
                              {new Date(note.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                            </time>
                          </p>
                          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">
                            {swatch && (
                              <span
                                aria-hidden
                                className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-black/30"
                                style={{ backgroundColor: swatch }}
                              />
                            )}
                            <span className="truncate">{TYPE_LABELS[note.type]}</span>
                            {note.isPrivate && (
                              <>
                                {/* Identifies who can see it - a data type,
                                    not decoration. */}
                                <Lock className="h-2.5 w-2.5 shrink-0" aria-hidden />
                                <span className="sr-only">Alleen voor jou zichtbaar</span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* The line: the scripture, then the reader's own
                            words, which are the brightest type in the row. */}
                        <div className="mt-3 min-w-0 sm:mt-0">
                          <blockquote className="m-0 break-words border-l-2 border-white/20 pl-3 text-sm italic leading-relaxed text-white/70">
                            &ldquo;{note.verseText}&rdquo;
                            <footer className="mt-1 text-[11px] not-italic text-white/50">- {note.translation}</footer>
                          </blockquote>

                          {note.noteText && (
                            <p className="mt-3 line-clamp-6 break-words text-[15px] leading-relaxed text-white/90">
                              {note.noteText}
                            </p>
                          )}

                          {note.tags.length > 0 && (
                            <ul className="m-0 mt-3 flex flex-wrap gap-x-3 gap-y-1 p-0">
                              {note.tags.map((tag, i) => (
                                <li key={i} className="min-w-0 list-none break-all text-[11px] text-white/55">#{tag}</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* The row's actions. Same menu, same two items, same
                            handlers - it now has an accessible name, which the
                            icon-only trigger it replaces did not. */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Acties voor notitie bij ${note.verseReference}`}
                              className="absolute right-0 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => editNote(note)}>
                              <Edit className="h-4 w-4 mr-2" /> Bewerken
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteNote(note._id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <nav aria-label="Paginering" className="flex items-center justify-center gap-4 pt-8">
                  <button
                    type="button"
                    className={SCENE_CONTROL}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Vorige
                  </button>
                  <span className="text-xs tabular-nums text-white/65">
                    Pagina {currentPage} van {totalPages}
                  </span>
                  <button
                    type="button"
                    className={SCENE_CONTROL}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Volgende
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      <EditNoteModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingNote(null) }}
        note={editingNote}
        onSave={handleSaved}
      />
    </SceneShell>
  )
}
