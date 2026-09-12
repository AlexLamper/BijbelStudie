'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';

import { FOCUS_RING, INK, INK_FAINT, INK_MUTED, PANEL_SOLID, RULE, scrim } from './lesson-layout';
import { formatSummaryText } from '../HistoricalContext';
import { getPreferenceClasses, getPreferenceStyles } from '../../../lib/preferenceClasses';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

/**
 * "Context van <boek>" - the same algemene info as the tab on /lezen.
 *
 * A dialog rather than a fourth panel: the background of a book is read once at
 * the start of a study, not alongside every chapter, and giving it permanent
 * screen space next to the commentary would crowd out both.
 *
 * The summary is fetched only after the dialog is first opened, so a lesson that
 * never opens it costs nothing.
 *
 * It renders through a PORTAL, into document.body. Rendered in place it sat
 * inside the step body, which is a sibling of the flow header - and the header
 * carries `z-50` and therefore its own stacking context. No z-index on a
 * descendant of a z-auto sibling can climb over that, so the dim covered the
 * lesson and stopped dead at the top bar: the beam stayed lit while everything
 * from the dialog down went grey, which looked like a rendering fault rather
 * than a modal. Out at the document root the backdrop covers the header and the
 * sidebar rail too, which is what "modal" means.
 */
export default function BookContextDialog({
  book,
  open,
  onClose,
  preferences,
}: {
  book: string;
  open: boolean;
  onClose: () => void;
  preferences?: ReadingPreferences;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded || !book) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/summary?book=${encodeURIComponent(book)}&lang=nl`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        setSummary(data?.summary ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setError('Informatie kon niet worden geladen.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, loaded, book]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // `mounted` guards the portal: document.body does not exist during the server
  // render, and reaching for it there throws.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
      // Neutral ink at 55%, like every other dim in the flow. No scoped `dark`
      // here any more: it pinned the whole dialog to the night palette, which is
      // why it kept the old styling on the light lesson. The `--les-*` variables
      // are declared on `:root`, so a portal into document.body inherits exactly
      // the palette the lesson is in.
      style={{ backgroundColor: scrim(0.55) }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Context van ${book}`}
        onClick={(event) => event.stopPropagation()}
        className={`flex h-[85vh] w-full flex-col rounded-t-2xl sm:h-[78vh] sm:max-w-2xl sm:rounded-2xl ${PANEL_SOLID}`}
      >
        <header className={`flex h-14 flex-none items-center justify-between border-b px-5 ${RULE}`}>
          {/* Titled in words; an info mark beside "Context van ..." adds nothing. */}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className={`truncate text-[14.5px] font-bold ${INK}`}>Context van {book}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className={`h-8 w-8 flex-none inline-flex items-center justify-center rounded-md hover:bg-les-card ${INK_FAINT} hover:text-les-ink ${FOCUS_RING}`}
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {loading ? (
            <div className="space-y-3" aria-hidden>
              {[100, 92, 96, 80, 90, 74, 88, 62, 95, 70].map((width, index) => (
                <div
                  key={index}
                  className="h-3.5 animate-pulse rounded bg-les-card"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-danger" />
              <p className="text-[13.5px] text-danger">{error}</p>
            </div>
          ) : summary ? (
            <div
              className={`max-w-none text-[14.5px] leading-[1.75] ${INK_MUTED} ${getPreferenceClasses(preferences)}`}
              style={getPreferenceStyles(preferences)}
              dangerouslySetInnerHTML={{ __html: formatSummaryText(summary) }}
            />
          ) : (
            <p className={`text-[13.5px] italic ${INK_FAINT}`}>
              Geen algemene informatie beschikbaar voor dit boek.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
