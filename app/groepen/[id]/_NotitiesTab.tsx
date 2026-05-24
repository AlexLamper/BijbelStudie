"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { StickyNote, ArrowRight, BookOpen } from "lucide-react"

interface SharedNote {
  _id: string
  userId: { _id: string; name: string; image?: string }
  verseReference: string
  noteText: string
  book?: string
  chapter?: number
  createdAt: string
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
      style={{ backgroundColor: "#0D9488", fontSize: size <= 6 ? 10 : 12 }}
    >
      {initials}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
}

export default function NotitiesTab({ groupId }: { groupId: string }) {
  const [notes, setNotes] = useState<SharedNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/groepen/${groupId}/notes`)
      .then(r => r.ok ? r.json() : { notes: [] })
      .then(d => setNotes(d.notes || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId])

  return (
    <div className="space-y-4">
      {/* CTA */}
      <div className="flex items-center justify-between p-3.5 rounded-xl"
        style={{ backgroundColor: "rgba(13,148,136,0.05)", border: "1px solid rgba(13,148,136,0.15)" }}>
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 flex-shrink-0" style={{ color: "#0D9488" }} />
          <p className="text-sm text-gray-700 dark:text-foreground">
            Deel een notitie via de bijbelstudie tool - selecteer een groep bij het opslaan.
          </p>
        </div>
        <Link href="/studie"
          className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap ml-3 flex-shrink-0"
          style={{ color: "#0D9488" }}>
          Open studie <ArrowRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-secondary animate-pulse" />
                <div className="h-3 rounded bg-gray-100 dark:bg-secondary animate-pulse w-32" />
              </div>
              <div className="h-3 rounded bg-gray-100 dark:bg-secondary animate-pulse w-3/4" />
              <div className="h-3 rounded bg-gray-100 dark:bg-secondary animate-pulse w-1/2" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 px-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(13,148,136,0.07)" }}>
            <StickyNote className="w-6 h-6" style={{ color: "#0D9488" }} />
          </div>
          <p className="font-semibold text-gray-800 dark:text-foreground mb-1">Nog geen gedeelde notities</p>
          <p className="text-sm text-gray-500 dark:text-muted-foreground max-w-xs">
            Groepsleden kunnen notities delen vanuit de bijbelstudie tool.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note._id}
              className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Avatar name={note.userId.name} size={8} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-foreground">
                      {note.userId.name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-muted-foreground flex-shrink-0">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  {note.verseReference && (
                    <p className="text-xs font-semibold mb-1.5" style={{ color: "#0D9488" }}>
                      {note.verseReference}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-foreground/80 leading-relaxed line-clamp-4">
                    {note.noteText}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
