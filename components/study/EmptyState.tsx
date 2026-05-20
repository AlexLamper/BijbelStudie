'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

interface EmptyStateProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVersion: string | null;
  loadingBooks: boolean;
  loadingChapters: boolean;
  loadingVersions: boolean;
  versions: string[];
  books: string[];
  t: (key: string) => string;
}

export default function EmptyState({
  selectedBook,
  selectedChapter,
  selectedVersion,
  loadingBooks,
  loadingChapters,
  loadingVersions,
}: EmptyStateProps) {
  if (selectedBook && selectedChapter && selectedVersion) return null;
  if (loadingBooks || loadingChapters) return null;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: 'rgba(13,148,136,0.08)' }}
      >
        <BookOpen className="h-7 w-7" style={{ color: '#0D9488' }} />
      </div>

      <h3 className="text-base font-semibold mb-1.5" style={{ color: '#111827' }}>
        {loadingVersions ? 'Bijbelvertalingen laden...' : 'Klaar om te studeren'}
      </h3>

      <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#6B7280' }}>
        {loadingVersions
          ? 'Even geduld...'
          : !selectedVersion
          ? 'Selecteer een vertaling om je studie te beginnen.'
          : !selectedBook
          ? 'Kies een Bijbelboek om verder te gaan.'
          : 'Selecteer een hoofdstuk.'}
      </p>
    </div>
  );
}
