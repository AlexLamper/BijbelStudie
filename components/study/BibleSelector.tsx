import React from 'react';
import { ChevronDown } from 'lucide-react';
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

/**
 * One control of the reader's toolbar: a native `<select>` with its own arrow
 * hidden and the design's chevron drawn beside it, so the three read as one row
 * of 36 px boxes (design_handoff_web/PAGES.md §3) while keeping the native
 * dropdown - which is what makes a 66-item book list usable and accessible.
 */
function SelectBox({
  width,
  bold = false,
  value,
  onChange,
  disabled,
  title,
  children,
}: {
  width: number;
  bold?: boolean;
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative flex h-9 flex-none items-center rounded-[9px] border border-line bg-white ${
        disabled ? 'opacity-50' : ''
      }`}
      style={{ width }}
    >
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        title={title}
        aria-label={title}
        className={`h-full w-full cursor-pointer appearance-none truncate rounded-[9px] bg-transparent pl-[11px] pr-7 text-[13px] text-ink-body outline-none ${
          bold ? 'font-semibold' : 'font-medium'
        }`}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        strokeWidth={2}
        className="pointer-events-none absolute right-[9px] text-ink-muted"
      />
    </div>
  );
}

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
    <>
      <SelectBox
        width={176}
        value={selectedVersion ?? ''}
        onChange={onVersionChange}
        disabled={loadingVersions || versions.length === 0}
        title="Bijbelvertaling"
      >
        {versions.length === 0 && <option value="" disabled>Laden...</option>}
        {sortedLangs.map(lang => (
          <optgroup key={lang} label={languageNames[lang] ?? lang.toUpperCase()}>
            {grouped[lang].map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </optgroup>
        ))}
      </SelectBox>

      <SelectBox
        width={140}
        bold
        value={selectedBook}
        onChange={onBookChange}
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
      </SelectBox>

      <SelectBox
        width={62}
        bold
        value={selectedChapter}
        onChange={value => onChapterChange(Number(value))}
        disabled={loadingChapters || chapters.length === 0}
        title="Hoofdstuk"
      >
        {(loadingChapters || chapters.length === 0) && (
          <option value={0} disabled>{loadingChapters ? '...' : '-'}</option>
        )}
        {chapters.map(c => <option key={c} value={c}>{c}</option>)}
      </SelectBox>
    </>
  );
}
