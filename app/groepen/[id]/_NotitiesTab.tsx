"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import MiniTreeAvatar from "../../../components/levensboom/MiniTreeAvatar"
import type { PublicLevensboomCard } from "../../../lib/levensboom/publicCard"

interface SharedNote {
  _id: string
  userId: { _id: string; name: string; image?: string; levensboom?: PublicLevensboomCard | null }
  verseReference: string
  noteText: string
  book?: string
  chapter?: number
  createdAt: string
}

/** The author's tree at row size; initials only when there is no tree to show. */
function Avatar({ name, size = 8, card }: { name: string; size?: number; card?: PublicLevensboomCard | null }) {
  return <MiniTreeAvatar card={card} name={name} size={size * 4} />
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
      <div className="flex items-center justify-between rounded-card border border-line bg-teal-faint p-3.5 max-md:flex-col max-md:items-start max-md:gap-2">
        <div className="flex items-center gap-2.5">
          <p className="text-sm text-ink-body">
            Deel een notitie via de bijbelstudie tool - selecteer een groep bij het opslaan.
          </p>
        </div>
        <Link href="/studie"
          className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap ml-3 flex-shrink-0 text-teal-dark dark:text-teal-400 max-md:ml-0 max-md:min-h-10 max-md:text-sm">
          Open studie <ArrowRight size={12} aria-hidden />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-surface border border-line rounded-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-line skeleton-pulse" />
                <div className="h-3 rounded bg-line skeleton-pulse w-32" />
              </div>
              <div className="h-3 rounded bg-line skeleton-pulse w-3/4" />
              <div className="h-3 rounded bg-line skeleton-pulse w-1/2" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="content-in flex flex-col items-center rounded-card border border-line bg-surface text-center py-16 px-4">
          <p className="font-semibold text-ink mb-1">Nog geen gedeelde notities</p>
          <p className="text-sm text-ink-muted max-w-xs">
            Groepsleden kunnen notities delen vanuit de bijbelstudie tool.
          </p>
        </div>
      ) : (
        <div className="stagger-in space-y-3">
          {notes.map(note => (
            <div key={note._id}
              className="bg-surface border border-line rounded-card p-4">
              <div className="flex items-start gap-3">
                <Avatar name={note.userId.name} size={8} card={note.userId.levensboom} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-ink max-md:min-w-0 max-md:truncate">
                      {note.userId.name}
                    </span>
                    <span className="text-xs text-ink-faint flex-shrink-0">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  {note.verseReference && (
                    <p className="text-xs font-semibold mb-1.5 text-teal-dark dark:text-teal-400">
                      {note.verseReference}
                    </p>
                  )}
                  <p className="text-sm text-ink-body leading-relaxed line-clamp-4 break-words">
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
