"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { StickyNote, Calendar, Plus } from "lucide-react";
import { SkeletonList } from "../ui/skeletons";
import { Badge } from "../ui/badge";
import { CreateNoteModal } from "./CreateNoteModal";

interface Note {
  _id: string;
  noteText: string;
  verseReference?: string;
  tags: string[];
  createdAt: string;
}

interface ChapterNotesProps {
  book: string;
  chapter: number;
  className?: string;
  /**
   * Drop the panel chrome: no header bar, no card frame around each note, no
   * padding of its own.
   *
   * The study flow's Verdieping step already labels this column ("Notities", and
   * a line saying what it shows) and already provides the padding, so the
   * standard panel repeated all of it inside a second border - a box in a box in
   * a box for two lines of text.
   */
  bare?: boolean;
}

export function ChapterNotes({ book, chapter, bare = false }: ChapterNotesProps) {
  const { data: session } = useSession();

  const [notes, setNotes]         = useState<Note[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes?book=${encodeURIComponent(book)}&chapter=${chapter}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      } else {
        setError('Notities konden niet worden geladen.');
      }
    } catch {
      setError('Fout bij het laden van notities.');
    } finally {
      setLoading(false);
    }
  }, [book, chapter, session?.user?.email]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });

  const truncate = (text: string, max = 160) =>
    text.length <= max ? text : text.slice(0, max).trim() + '…';

  if (!session) return null;

  if (bare) {
    return (
      <>
        {loading && <SkeletonList count={2} />}

        {error && <p className="text-[13px] text-destructive">{error}</p>}

        {!loading && !error && notes.length === 0 && (
          <div className="content-in">
            <p className="text-[13px] text-gray-500 dark:text-muted-foreground mb-3">
              Je hebt nog geen notities bij {book} {chapter}.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="press inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#0D9488' }}
            >
              <Plus className="w-4 h-4" />
              Notitie maken
            </button>
          </div>
        )}

        {!loading && !error && notes.length > 0 && (
          <div className="stagger-in">
            {/* Divided, not carded. A rule between entries is enough to separate
                two short paragraphs; a rounded border and a shadow around each
                turns a list of thoughts into a stack of receipts. */}
            <ul className="m-0 p-0 list-none divide-y divide-gray-200 dark:divide-border">
              {notes.map((note) => (
                <li key={note._id} className="py-3 first:pt-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    {note.verseReference && (
                      <span className="text-[11.5px] font-semibold" style={{ color: '#0D9488' }}>
                        {note.verseReference}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 dark:text-muted-foreground ml-auto flex-none">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13.5px] text-gray-700 dark:text-foreground leading-relaxed">
                    {truncate(note.noteText)}
                  </p>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setShowModal(true)}
              className="press mt-3 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] font-semibold transition-colors hover:bg-[rgba(13,148,136,0.08)]"
              style={{ color: '#0D9488' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Notitie toevoegen
            </button>
          </div>
        )}

        <CreateNoteModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          verseReference={`${book} ${chapter}`}
          book={book}
          chapter={chapter}
          verseText=""
          defaultScope="hoofdstuk"
          onSave={() => { setShowModal(false); fetchNotes(); }}
        />
      </>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-border flex items-center justify-between bg-gray-50/50 dark:bg-card/50 flex-none">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4" style={{ color: '#0D9488' }} />
            <span className="text-sm font-medium text-gray-600">
              {book} {chapter}
            </span>
            {notes.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(13,148,136,0.08)', color: '#0D9488' }}>
                {notes.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(13,148,136,0.08)', color: '#0D9488' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(13,148,136,0.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(13,148,136,0.08)'}
          >
            <Plus className="w-3.5 h-3.5" />
            Nieuwe notitie
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">

          {loading && (
            <SkeletonList count={3} className="py-2" />
          )}

          {error && (
            <p className="text-sm text-red-500 text-center py-8">{error}</p>
          )}

          {!loading && !error && notes.length === 0 && (
            <div className="content-in flex flex-col items-center text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(13,148,136,0.07)' }}>
                <StickyNote className="w-5 h-5" style={{ color: '#0D9488' }} />
              </div>
              <p className="font-semibold text-gray-800 dark:text-foreground mb-1.5">Nog niets opgeschreven</p>
              <p className="text-sm text-gray-400 leading-relaxed mb-5 max-w-xs">
                Wat raakt je in dit hoofdstuk? Schrijf een notitie over een vers, een gedeelte, of het hele hoofdstuk.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="press flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#0D9488' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#0f766e'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#0D9488'}
              >
                <Plus className="w-4 h-4" />
                Schrijf je eerste notitie
              </button>
            </div>
          )}

          {!loading && !error && notes.length > 0 && (
            <div className="stagger-in space-y-3 pb-16">
              {notes.map(note => (
                <div key={note._id}
                  className="rounded-xl border border-gray-100 dark:border-border bg-white dark:bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    {note.verseReference && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(13,148,136,0.07)', color: '#0D9488' }}>
                        {note.verseReference}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto flex-shrink-0">
                      <Calendar className="h-3 w-3" />
                      {formatDate(note.createdAt)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-foreground leading-relaxed">{truncate(note.noteText)}</p>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {note.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">#{tag}</Badge>
                      ))}
                      {note.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">+{note.tags.length - 3}</Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateNoteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        verseReference={`${book} ${chapter}`}
        book={book}
        chapter={chapter}
        verseText=""
        defaultScope="hoofdstuk"
        onSave={() => { setShowModal(false); fetchNotes(); }}
      />
    </>
  );
}
