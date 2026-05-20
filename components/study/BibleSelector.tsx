import React from 'react';
import { normalizeBookName, BIBLE_BOOKS_ORDER } from '../../lib/book-mapping';

type Props = {
  versions: { id: string; name: string; language?: string }[];
  books: string[];
  chapters: number[];
  selectedVersion: string | null;
  selectedBook: string;
  selectedChapter: number;
  onVersionChange: (v: string) => void;
  onBookChange: (b: string) => void;
  onChapterChange: (c: number) => void;
  loadingVersions: boolean;
  loadingBooks: boolean;
  loadingChapters: boolean;
  t: (key: string) => string;
};

const languageNames: Record<string, string> = {
  nl: 'Nederlands',
  de: 'Deutsch',
  af: 'Afrikaans',
  en: 'English',
};

const SELECT_CLS = [
  'text-[13px]',
  'border rounded-lg cursor-pointer outline-none',
  'overflow-hidden text-ellipsis whitespace-nowrap',
  // Light
  'bg-gray-50 border-gray-200 text-gray-900',
  // Dark
  'dark:bg-secondary dark:border-border dark:text-foreground',
  // Transition
  'transition-opacity',
].join(' ');

export default function BibleSelector({
  versions,
  books,
  chapters,
  selectedVersion,
  selectedBook,
  selectedChapter,
  onVersionChange,
  onBookChange,
  onChapterChange,
  loadingVersions,
  loadingBooks,
  loadingChapters,
}: Props) {
  const grouped = versions.reduce<Record<string, typeof versions>>((acc, v) => {
    const lang = v.language || 'nl';
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(v);
    return acc;
  }, {});

  const sortedLangs = Object.keys(grouped).sort(a => (a === 'nl' ? -1 : 1));

  const ot = books.filter(b => BIBLE_BOOKS_ORDER.indexOf(normalizeBookName(b)) < 39);
  const nt = books.filter(b => BIBLE_BOOKS_ORDER.indexOf(normalizeBookName(b)) >= 39);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1.4fr) 78px', gap: 6, width: '100%', alignItems: 'center' }}>

      {/* Version */}
      <select
        className={`${SELECT_CLS} ${loadingVersions ? 'opacity-50' : ''}`}
        style={{ padding: '5px 8px', appearance: 'auto' }}
        value={selectedVersion ?? ''}
        onChange={e => onVersionChange(e.target.value)}
        disabled={loadingVersions || versions.length === 0}
        title="Bijbelvertaling"
      >
        {versions.length === 0 && <option value="" disabled>Laden...</option>}
        {sortedLangs.map(lang => (
          <optgroup key={lang} label={languageNames[lang] ?? lang.toUpperCase()}>
            {grouped[lang].map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </optgroup>
        ))}
      </select>

      {/* Book */}
      <select
        className={`${SELECT_CLS} ${loadingBooks || books.length === 0 ? 'opacity-50' : ''}`}
        style={{ padding: '5px 8px', appearance: 'auto' }}
        value={selectedBook}
        onChange={e => onBookChange(e.target.value)}
        disabled={loadingBooks || books.length === 0}
        title="Bijbelboek"
      >
        {(loadingBooks || books.length === 0) && (
          <option value="" disabled>{loadingBooks ? '...' : 'Geen boeken'}</option>
        )}
        {ot.length > 0 && (
          <optgroup label="Oude Testament">
            {ot.map(b => <option key={b} value={b}>{b}</option>)}
          </optgroup>
        )}
        {nt.length > 0 && (
          <optgroup label="Nieuwe Testament">
            {nt.map(b => <option key={b} value={b}>{b}</option>)}
          </optgroup>
        )}
      </select>

      {/* Chapter */}
      <select
        className={`${SELECT_CLS} ${loadingChapters || chapters.length === 0 ? 'opacity-50' : ''}`}
        style={{ padding: '5px 8px', appearance: 'auto', textAlign: 'center' }}
        value={selectedChapter}
        onChange={e => onChapterChange(Number(e.target.value))}
        disabled={loadingChapters || chapters.length === 0}
        title="Hoofdstuk"
      >
        {(loadingChapters || chapters.length === 0) && (
          <option value={0} disabled>{loadingChapters ? '...' : '-'}</option>
        )}
        {chapters.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

    </div>
  );
}
