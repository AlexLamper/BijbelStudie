'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, BookOpen, ChevronDown, ChevronUp, Images } from 'lucide-react';
import { useTranslation } from '../../app/i18n/client';
import GeoImages from './GeoImages';
import { ReadingPreferences } from '../../hooks/useReadingPreferences';
import { getPreferenceClasses, getPreferenceStyles } from '../../lib/preferenceClasses';

function formatSummaryText(raw: string): string {
  const P = 'style="margin-top:0.85em;line-height:1.8"';
  const blocks = raw.split(/\n{2,}/);

  return blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    const line = trimmed.replace(/\n+/g, ' ');

    // Section heading: bold line in ALL CAPS or ending with ':'
    if (/^[A-Z\s]{5,}$/.test(line))
      return `<p style="font-weight:700;font-size:0.95rem;margin-top:1.6em;margin-bottom:0.15em;line-height:1.5;border-left:3px solid #0D9488;padding-left:0.75em">${line}</p>`;
    // Numbered point: 1., 2., 3.
    if (/^\d+\.\s/.test(line))
      return `<p style="padding-left:1.5em;margin-top:0.8em;line-height:1.8">${line}</p>`;

    return `<p ${P}>${line}</p>`;
  }).filter(Boolean).join('');
}

interface HistoricalContextProps {
  book: string;
  chapter: number;
  t: (key: string) => string;
  preferences?: ReadingPreferences;
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

const IMAGES_PREF_KEY = 'bijbelstudie_show_geo_images';

export default function HistoricalContext({ book, chapter, preferences }: HistoricalContextProps) {
  const prefClasses = getPreferenceClasses(preferences);
  const prefStyles  = getPreferenceStyles(preferences);
  const { i18n } = useTranslation('study');
  const lng = i18n.resolvedLanguage;
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary]     = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [showImages, setShowImages] = useState(() => {
    try { return localStorage.getItem(IMAGES_PREF_KEY) !== 'false'; } catch { return true; }
  });

  const toggleImages = () => {
    setShowImages(prev => {
      const next = !prev;
      try { localStorage.setItem(IMAGES_PREF_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  };

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

      {/* Image strip with collapsible toggle */}
      {showImages && <GeoImages book={book} chapter={chapter} variant="strip" />}
      <div className="flex justify-center flex-none">
        <button
          onClick={toggleImages}
          className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-gray-400 dark:text-muted-foreground hover:text-gray-600 dark:hover:text-foreground transition-colors border-b border-gray-100 dark:border-border w-full justify-center bg-gray-50 dark:bg-card"
        >
          <Images size={11} />
          {showImages ? (
            <><span>Verberg afbeeldingen</span><ChevronUp size={11} /></>
          ) : (
            <><span>Toon afbeeldingen</span><ChevronDown size={11} /></>
          )}
        </button>
      </div>

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
          <div
            className={`text-gray-700 dark:text-foreground max-w-none ${prefClasses}`}
            style={prefStyles}
            dangerouslySetInnerHTML={{ __html: formatSummaryText(summary) }}
          />
        ) : (
          <p className="text-gray-400 dark:text-muted-foreground italic text-sm">
            Geen algemene informatie beschikbaar voor dit boek.
          </p>
        )}
      </div>
    </div>
  );
}
