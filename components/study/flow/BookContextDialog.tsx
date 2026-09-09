'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';

import { FOCUS_RING, INK, INK_FAINT, INK_MUTED, PANEL_SOLID, RULE } from './lesson-layout';
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
      className="dark fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      // The scene's ground, like every other dim in the flow.
      style={{ backgroundColor: 'rgba(11,18,32,0.55)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Context van ${book}`}
        onClick={(event) => event.stopPropagation()}
        className={`w-full sm:max-w-2xl h-[85vh] sm:h-[78vh] flex flex-col ${PANEL_SOLID} rounded-t-2xl sm:rounded-2xl shadow-[0_40px_80px_-32px_rgba(0,0,0,0.85)]`}
      >
        <header className={`flex-none flex items-center justify-between px-5 h-14 border-b ${RULE}`}>
          {/* Titled in words; an info mark beside "Context van ..." adds nothing. */}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className={`text-sm font-bold truncate ${INK}`}>Context van {book}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className={`h-8 w-8 flex-none inline-flex items-center justify-center rounded-md hover:bg-white/10 ${INK_FAINT} hover:text-white ${FOCUS_RING}`}
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-5">
          {loading ? (
            <div className="space-y-3" aria-hidden>
              {[100, 92, 96, 80, 90, 74, 88, 62, 95, 70].map((width, index) => (
                <div
                  key={index}
                  className="h-3.5 rounded animate-pulse bg-white/10"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : summary ? (
            <div
              className={`${INK_MUTED} max-w-none ${getPreferenceClasses(preferences)}`}
              style={getPreferenceStyles(preferences)}
              dangerouslySetInnerHTML={{ __html: formatSummaryText(summary) }}
            />
          ) : (
            <p className={`${INK_FAINT} italic text-sm`}>
              Geen algemene informatie beschikbaar voor dit boek.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
