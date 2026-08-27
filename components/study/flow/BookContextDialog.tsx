'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Info, X } from 'lucide-react';

import { formatSummaryText } from '../HistoricalContext';
import { getPreferenceClasses, getPreferenceStyles } from '../../../lib/preferenceClasses';
import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

const TEAL = '#0D9488';

/**
 * "Context van <boek>" - the same algemene info as the tab on /lezen.
 *
 * A dialog rather than a fourth panel: the background of a book is read once at
 * the start of a study, not alongside every chapter, and giving it permanent
 * screen space next to the commentary would crowd out both.
 *
 * The summary is fetched only after the dialog is first opened, so a lesson that
 * never opens it costs nothing.
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Context van ${book}`}
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-2xl h-[85vh] sm:h-[78vh] flex flex-col bg-white dark:bg-card rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-border shadow-2xl"
      >
        <header className="flex-none flex items-center justify-between px-5 h-14 border-b border-gray-200 dark:border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Info size={15} style={{ color: TEAL }} className="flex-none" />
            <h2 className="text-sm font-bold text-foreground truncate">Context van {book}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="h-8 w-8 flex-none inline-flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-secondary text-muted-foreground"
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
                  className="h-3.5 rounded animate-pulse bg-gray-100 dark:bg-secondary"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : summary ? (
            <div
              className={`text-gray-700 dark:text-foreground max-w-none ${getPreferenceClasses(preferences)}`}
              style={getPreferenceStyles(preferences)}
              dangerouslySetInnerHTML={{ __html: formatSummaryText(summary) }}
            />
          ) : (
            <p className="text-gray-400 dark:text-muted-foreground italic text-sm">
              Geen algemene informatie beschikbaar voor dit boek.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
