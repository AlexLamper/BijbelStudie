'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertCircle, ExternalLink, Languages, Info, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { bookNameMap } from '../../lib/book-mapping';

interface OriginalWord {
  h: string; // Hebrew or Greek surface form
  t: string; // Transliteration
  e: string; // English gloss
  s: string; // Strong's number, e.g. "H0430" or "G2424"
}

type ChapterData = Record<string, OriginalWord[]>; // verseNumber → words

interface OriginalTextProps {
  book: string;          // Dutch book name from selector
  chapter: number;
  highlightVerses?: { start: number; end: number };
}

// Per-book metadata: which testament/language
type IndexEntry = { code: string; slug?: string; chapters: number[]; lang?: string };
let indexCache: Record<string, IndexEntry> | null = null;
let indexPromise: Promise<Record<string, IndexEntry> | null> | null = null;

async function fetchIndex(): Promise<Record<string, IndexEntry> | null> {
  if (indexCache) return indexCache;
  if (!indexPromise) {
    indexPromise = fetch('/data/original/index.json', { cache: 'force-cache' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) indexCache = data; return data; })
      .catch(() => null);
  }
  return indexPromise;
}

const chapterCache = new Map<string, ChapterData>();

async function fetchChapter(slug: string, chapter: number): Promise<ChapterData | null> {
  const key = `${slug}/${chapter}`;
  if (chapterCache.has(key)) return chapterCache.get(key)!;
  try {
    const url = `/data/original/${slug}/${chapter}.json`;
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    const data: ChapterData = await res.json();
    chapterCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

/** Strong's number → biblehub.com lexicon URL (strip leading zeros after H/G). */
function strongsUrl(s: string): string | null {
  if (!s) return null;
  const m = s.match(/^([HG])(\d+)$/);
  if (!m) return null;
  const [, prefix, digits] = m;
  const stripped = String(parseInt(digits, 10));
  return prefix === 'H'
    ? `https://biblehub.com/hebrew/${stripped}.htm`
    : `https://biblehub.com/greek/${stripped}.htm`;
}

/** Strip the leading zeros for display: "H0430" → "H430" */
function displayStrong(s: string): string {
  const m = s.match(/^([HG])(\d+)$/);
  if (!m) return s;
  return `${m[1]}${parseInt(m[2], 10)}`;
}

/** Pick a font stack for Hebrew or Greek text. */
const HEBREW_STACK =
  "'SBL Hebrew','Ezra SIL','David CLM','Frank Ruhl CLM','Times New Roman','Noto Serif Hebrew',serif";
const GREEK_STACK =
  "'SBL Greek','GFS Didot','Cardo','Gentium Plus','Times New Roman','Noto Serif',serif";

interface WordCardProps {
  word: OriginalWord;
  isHebrew: boolean;
}

function WordCard({ word, isHebrew }: WordCardProps) {
  const url = strongsUrl(word.s);
  const gloss = word.e || '-';

  return (
    <div
      className="flex flex-col items-center text-center min-w-[64px] px-2 py-1.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors"
      dir="ltr"
    >
      <div
        className="text-2xl leading-snug text-gray-900 dark:text-gray-50 font-medium"
        dir={isHebrew ? 'rtl' : 'ltr'}
        lang={isHebrew ? 'he' : 'el'}
        style={{ fontFamily: isHebrew ? HEBREW_STACK : GREEK_STACK }}
      >
        {word.h}
      </div>
      <div className="text-[10.5px] italic text-gray-500 dark:text-gray-400 mt-0.5 max-w-[140px] truncate" title={word.t}>
        {word.t || ' '}
      </div>
      <div
        className="text-[11px] text-gray-700 dark:text-gray-300 leading-tight mt-0.5 max-w-[140px] line-clamp-2"
        title={gloss}
      >
        {gloss}
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-[9.5px] tabular-nums tracking-wide px-1.5 py-0.5 rounded font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors inline-flex items-center gap-0.5"
          title="Bekijk in Strong's lexicon (biblehub.com)"
        >
          {displayStrong(word.s)}
          <ExternalLink size={8} className="opacity-60" />
        </a>
      ) : (
        <span className="mt-1 text-[9.5px] text-gray-400">-</span>
      )}
    </div>
  );
}

interface VerseRowProps {
  verseNum: number;
  words: OriginalWord[];
  isHebrew: boolean;
  highlighted: boolean;
}

function VerseRow({ verseNum, words, isHebrew, highlighted }: VerseRowProps) {
  return (
    <div
      className={[
        'border-b last:border-b-0 border-gray-100 dark:border-gray-800 py-3 px-1',
        highlighted ? 'bg-amber-50/60 dark:bg-amber-950/20 -mx-2 px-3 rounded-md' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-full text-[10.5px] font-bold tabular-nums bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
          {verseNum}
        </span>
        <span className="text-[10.5px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {words.length} {words.length === 1 ? 'woord' : 'woorden'}
        </span>
      </div>
      <div
        className={[
          'flex flex-wrap gap-x-1 gap-y-2',
          isHebrew ? 'justify-end' : 'justify-start',
        ].join(' ')}
        dir={isHebrew ? 'rtl' : 'ltr'}
      >
        {words.map((w, i) => <WordCard key={i} word={w} isHebrew={isHebrew} />)}
      </div>
    </div>
  );
}

export default function OriginalText({ book, chapter, highlightVerses }: OriginalTextProps) {
  const englishBook = bookNameMap[book] || book;
  const [data, setData] = useState<ChapterData | null>(null);
  const [meta, setMeta] = useState<IndexEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const isSubscribed = session?.user?.isSubscribed;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      const index = await fetchIndex();
      if (cancelled) return;

      if (!index) {
        setError('Kon de grondtekst-index niet laden.');
        setLoading(false);
        return;
      }

      const entry = index[englishBook];
      if (!entry) {
        setMeta(null);
        setError(`Geen grondtekst beschikbaar voor "${book}". Originele tekst is alleen beschikbaar voor de 66 protocanonieke boeken.`);
        setLoading(false);
        return;
      }

      setMeta(entry);

      if (!entry.chapters.includes(chapter)) {
        setError(`Hoofdstuk ${chapter} is niet beschikbaar in de grondtekst van ${book}.`);
        setLoading(false);
        return;
      }

      const slug = entry.slug || englishBook.replace(/ /g, '_');
      const ch = await fetchChapter(slug, chapter);
      if (cancelled) return;

      if (!ch) {
        setError('Kon de grondtekst voor dit hoofdstuk niet laden.');
        setLoading(false);
        return;
      }

      setData(ch);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [englishBook, chapter, book]);

  const isHebrew = meta?.lang === 'heb';
  const langLabel = isHebrew ? 'Hebreeuws' : 'Grieks';
  const testamentLabel = isHebrew ? 'Oude Testament' : 'Nieuwe Testament';

  const verses = useMemo(() => {
    if (!data) return [] as Array<[number, OriginalWord[]]>;
    return Object.keys(data)
      .map(Number)
      .sort((a, b) => a - b)
      .map(n => [n, data[String(n)]] as [number, OriginalWord[]]);
  }, [data]);

  return (
    <div className="h-full overflow-y-auto px-4 py-4 pb-20">
      {/* Intro panel */}
      <div className="mb-4 rounded-lg border border-teal-200/70 dark:border-teal-900/50 bg-gradient-to-br from-teal-50/70 to-white dark:from-teal-950/30 dark:to-background p-3">
        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
            <Languages size={16} className="text-teal-700 dark:text-teal-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Grondtekst - {langLabel}
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                {testamentLabel}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              De originele woorden van {book} {chapter} in het {langLabel}, met transliteratie, betekenis
              en Strong-nummer. Klik op een Strong-nummer voor uitgebreide lexicale informatie.
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
          <Loader2 size={28} className="animate-spin text-teal-600 mb-3" />
          <span className="text-sm">Grondtekst laden…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-2.5 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">{error}</div>
        </div>
      )}

      {/* Verses */}
      {!loading && !error && verses.length > 0 && (() => {
        const displayVerses = isSubscribed ? verses : verses.slice(0, 1);
        const showPaywall = !isSubscribed && verses.length > 0;
        return (
          <div className="space-y-0">
            <div
              style={showPaywall ? {
                WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
              } : undefined}
            >
              {displayVerses.map(([num, words]) => {
                const highlighted = !!(highlightVerses && num >= highlightVerses.start && num <= highlightVerses.end);
                return (
                  <VerseRow
                    key={num}
                    verseNum={num}
                    words={words}
                    isHebrew={isHebrew}
                    highlighted={highlighted}
                  />
                );
              })}
            </div>

            {showPaywall && (
              <div className="mt-6 max-w-[340px] mx-auto rounded-xl border border-gray-200 dark:border-border bg-gradient-to-br from-gray-50 to-white dark:from-card dark:to-background p-5 text-center shadow-sm">
                <Sparkles className="h-5 w-5 mx-auto mb-2.5 text-[#0D9488]" />
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1.5">
                  Bekijk de volledige grondtekst
                </h3>
                <p className="text-xs text-muted-foreground max-w-[260px] mx-auto leading-relaxed mb-4">
                  Upgrade naar Pro voor toegang tot alle verzen in het {langLabel}, met transliteratie en Strong-nummers.
                </p>
                <button
                  onClick={() => router.push('/abonnement')}
                  className="px-5 h-9 rounded-md text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0f766e] transition-colors"
                >
                  Upgrade naar Pro
                </button>
              </div>
            )}

            {isSubscribed && (
              <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed flex items-start gap-2">
                <Info size={12} className="flex-shrink-0 mt-0.5" />
                <p>
                  Brontekst: <a
                    href="https://github.com/STEPBible/STEPBible-Data"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-teal-700 dark:hover:text-teal-300"
                  >STEPBible</a> - Translators Amalgamated {isHebrew ? 'Hebrew OT (TAHOT)' : 'Greek NT (TAGNT)'} ·
                  Tyndale House Cambridge · <span className="font-medium">CC BY 4.0</span>.
                  Lexicon-links via <a
                    href="https://biblehub.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-teal-700 dark:hover:text-teal-300"
                  >biblehub.com</a>.
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
