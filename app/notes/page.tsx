"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  BookOpen, Search, Filter, Plus, Edit, Trash2,
  Calendar, Tag, Eye, EyeOff, ChevronDown,
  StickyNote, Highlighter, FileText,
} from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu"
import { EditNoteModal } from "../../components/study/EditNoteModal"
import { LoadingSpinner } from "../../components/ui/loading-spinner"

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
    if (!session) router.push("/auth/signin")
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
      const data = await res.json()
      setNotes(data.notes)
      setTotalPages(data.pagination.totalPages)
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

  if (status === "loading" || !session) return <LoadingSpinner fullHeight message="Laden..." />

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="px-6 xl:px-10 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notities & Markeringen</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Beheer al uw bijbelstudienotities op één plek</p>
          </div>
          <Button
            onClick={() => router.push("/study")}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Notitie aanmaken
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoek notities, verzen of tags..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-white dark:bg-card"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Type filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white dark:bg-card gap-2">
                  <Filter className="h-4 w-4" />
                  {selectedType === "all" ? "Alle typen" : TYPE_LABELS[selectedType]}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedType("all")}>Alle typen</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedType("note")}><StickyNote className="h-4 w-4 mr-2" />Notities</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedType("highlight")}><Highlighter className="h-4 w-4 mr-2" />Markeringen</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedType("both")}>Notities & Markeringen</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Book filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white dark:bg-card gap-2">
                  <BookOpen className="h-4 w-4" />
                  {selectedBook === "all" ? "Alle boeken" : selectedBook}
                  <ChevronDown className="h-4 w-4" />
                </Button>
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
                  <Button variant="outline" size="sm" className="bg-white dark:bg-card gap-2">
                    <Tag className="h-4 w-4" />
                    {selectedTag === "all" ? "Alle tags" : selectedTag}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
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

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingSpinner />}

        {/* Notes grid */}
        {!loading && (
          <>
            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-card border border-border rounded-xl p-16 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Geen notities gevonden</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Begin met bestuderen om hier uw notities te zien.
                </p>
                <Button onClick={() => router.push("/study")} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                  <Plus className="h-4 w-4" /> Begin met bestuderen
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(note => (
                  <div key={note._id}
                    className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                    {/* Colored accent top strip for highlights */}
                    {note.type === "highlight" && (
                      <div className="h-1 bg-teal-500" />
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{note.verseReference}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(note.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                            {note.isPrivate ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
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
                      </div>

                      {/* Bible verse */}
                      <blockquote className="text-sm text-muted-foreground border-l-2 border-teal-300 pl-3 mb-3 italic leading-relaxed">
                        &ldquo;{note.verseText}&rdquo;
                        <footer className="text-xs mt-1 not-italic">- {note.translation}</footer>
                      </blockquote>

                      {/* Note text */}
                      {note.noteText && (
                        <p className="text-sm text-foreground mb-3 leading-relaxed line-clamp-3">{note.noteText}</p>
                      )}

                      {/* Tags */}
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {note.tags.map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Type badge */}
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 rounded-full">
                        {note.type === "note"      && <StickyNote  className="h-3 w-3" />}
                        {note.type === "highlight" && <Highlighter className="h-3 w-3" />}
                        {note.type === "both"      && <StickyNote  className="h-3 w-3" />}
                        {TYPE_LABELS[note.type]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button variant="outline" size="sm" className="bg-white dark:bg-card"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}>
                  Vorige
                </Button>
                <span className="text-sm text-muted-foreground">
                  Pagina {currentPage} van {totalPages}
                </span>
                <Button variant="outline" size="sm" className="bg-white dark:bg-card"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}>
                  Volgende
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <EditNoteModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingNote(null) }}
        note={editingNote}
        onSave={handleSaved}
      />
    </div>
  )
}
