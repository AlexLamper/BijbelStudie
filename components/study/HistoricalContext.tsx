'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, BookOpen } from 'lucide-react';
import { useTranslation } from '../../app/i18n/client';
import GeoImages from './GeoImages';

interface HistoricalContextProps {
  book: string;
  chapter: number;
  t: (key: string) => string;
}

function SummarySkeleton() {
  return (
    <div className="space-y-3 pt-1" aria-hidden>
      {[100, 90, 95, 80, 92, 75, 88, 60].map((w, i) => (
        <div
          key={i}
          className="h-3.5 rounded animate-pulse bg-gray-100 dark:bg-secondary"
          style={{ width: `${w}%` }}
        />
      ))}
      <div className="pt-2 space-y-3">
        {[100, 85, 95, 70, 88].map((w, i) => (
          <div
            key={i}
            className="h-3.5 rounded animate-pulse bg-gray-100 dark:bg-secondary"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function HistoricalContext({ book, chapter }: HistoricalContextProps) {
  const { i18n } = useTranslation('study');
  const lng = i18n.resolvedLanguage;
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary]     = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!book) return;
    setIsLoading(true);
    setError(null);
    setSummary(null);

    fetch(`/api/summary?book=${encodeURIComponent(book)}&lang=${lng}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setSummary(data?.summary ?? null))
      .catch(() => setError('Informatie kon niet worden geladen.'))
      .finally(() => setIsLoading(false));
  }, [book, lng]);

  return (
    <div className="border-0 shadow-none h-full flex flex-col bg-white dark:bg-background">

      {/* Header bar - matches commentary style exactly */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-border flex items-center gap-2 bg-gray-50 dark:bg-card flex-none">
        <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: '#0D9488' }} />
        <span className="text-sm font-medium text-gray-600 dark:text-muted-foreground">{book}</span>
      </div>

      {/* Image strip */}
      <GeoImages book={book} chapter={chapter} variant="strip" />

      {/* Scrollable content - matches commentary padding exactly */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-4 pb-24 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-secondary scrollbar-track-transparent">
        {isLoading ? (
          <SummarySkeleton />
        ) : error ? (
          <div className="py-10 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : summary ? (
          <div className="font-inter text-gray-700 dark:text-foreground text-base leading-loose whitespace-pre-wrap">
            {summary}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-muted-foreground italic text-sm">
            Geen algemene informatie beschikbaar voor dit boek.
          </p>
        )}
      </div>
    </div>
  );
}
