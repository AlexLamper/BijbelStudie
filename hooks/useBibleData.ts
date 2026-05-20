'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { bookNameMap, CANONICAL_NL, normalizeBookName, BIBLE_BOOKS_ORDER } from '../lib/book-mapping';

/* ─── Static data — never changes ───────────────────────────── */
const VERSIONS = [
  { id: 'statenvertaling', name: 'Statenvertaling', language: 'nl' },
  { id: 'basisbijbel',     name: 'BasisBijbel',     language: 'nl' },
] as const;

// Flat-file translations: stored as a single JSON, no per-book directory.
// Chapters must be fetched via API instead of /data/bibles/{version}/{book}/chapters.json
const FLAT_FILE_VERSIONS = new Set(['basisbijbel']);

type VersionId = typeof VERSIONS[number]['id'];

/* ─── Module-level caches (survive component re-mounts) ─────── */
let _booksIndex: Record<string, string[]> | null = null;
let _booksIndexPromise: Promise<Record<string, string[]> | null> | null = null;
const _chaptersCache = new Map<string, number[]>();

function getBooksIndex(): Promise<Record<string, string[]> | null> {
  if (_booksIndex) return Promise.resolve(_booksIndex);
  if (!_booksIndexPromise) {
    // no-store ensures we always get the latest file, not a browser-cached stale copy
    _booksIndexPromise = fetch('/data/books-index.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) _booksIndex = data; return data; })
      .catch(() => null);
  }
  return _booksIndexPromise;
}

/** Returns display-language book list for a version. */
function resolveBooksFromIndex(index: Record<string, string[]>, version: string): string[] {
  const key = version.replace('.json', '');
  const raw = index[key];
  if (!raw || raw.length === 0) return [];

  const books = [...raw];

  // Sort by canonical order
  books.sort((a, b) => {
    const ai = BIBLE_BOOKS_ORDER.indexOf(normalizeBookName(a));
    const bi = BIBLE_BOOKS_ORDER.indexOf(normalizeBookName(b));
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  // English-named translations: map to canonical Dutch names (matching statenvertaling)
  const ENGLISH_NAMED = new Set(['basisbijbel']);
  if (ENGLISH_NAMED.has(key)) {
    return books.map(b => CANONICAL_NL[b] || b);
  }
  return books;
}

/**
 * Fetch chapters.json directly from the static /public/data/ tree.
 * For HSV the display name is Dutch but the folder uses English — translate back.
 */
async function fetchChaptersDirect(version: string, bookName: string): Promise<number[]> {
  const cacheKey = `${version}/${bookName}`;
  const cached = _chaptersCache.get(cacheKey);
  if (cached) return cached;

  try {
    let sorted: number[] = [];

    if (FLAT_FILE_VERSIONS.has(version)) {
      // basisbijbel stores books with English names internally; translate Dutch display name back
      const englishBook = bookNameMap[bookName] || bookName;
      const res = await fetch(`/api/bible/chapters?version=${version}&book=${encodeURIComponent(englishBook)}`);
      if (res.ok) {
        const data: number[] = await res.json();
        sorted = Array.isArray(data) ? [...data].map(Number).sort((a, b) => a - b) : [];
      }
    } else {
      const url = `/data/bibles/${version}/${encodeURIComponent(bookName)}/chapters.json`;
      const res = await fetch(url, { cache: 'force-cache' });
      if (res.ok) {
        const data: number[] = await res.json();
        sorted = Array.isArray(data) ? [...data].map(Number).sort((a, b) => a - b) : [];
      }
    }

    if (sorted.length > 0) _chaptersCache.set(cacheKey, sorted);
    return sorted;
  } catch {
    return [];
  }
}

/* ─── Types ──────────────────────────────────────────────────── */
interface UseBibleDataOptions {
  initialBook?: string;
  initialChapter?: number;
  initialVersion?: string;
}

interface UseBibleDataReturn {
  versions: { id: string; name: string; language: string }[];
  books: string[];
  chapters: number[];
  selectedVersion: string | null;
  selectedBook: string;
  selectedChapter: number;
  selectedCommentary: string;
  maxChapter: number;
  loadingVersions: boolean;
  loadingBooks: boolean;
  loadingChapters: boolean;
  isInitialLoading: boolean;
  handleVersionChange: (version: string) => void;
  handleBookChange: (book: string) => void;
  handleChapterChange: (chapter: number) => void;
  handleCommentaryChange: (commentary: string) => void;
  handlePreviousChapter: () => void;
  handleNextChapter: () => void;
}

/* ─── Hook ───────────────────────────────────────────────────── */
export function useBibleData(lng: string, options: UseBibleDataOptions = {}): UseBibleDataReturn {
  const { initialBook, initialChapter, initialVersion } = options;

  // Versions are static — set immediately, no loading state needed
  const [books, setBooks]               = useState<string[]>([]);
  const [chapters, setChapters]         = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedCommentary, setSelectedCommentary] = useState<string>('matthew_henry_nl');
  const [maxChapter, setMaxChapter]     = useState<number>(1);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [lastReadLoaded, setLastReadLoaded] = useState(false);

  const lastBookIndexRef = useRef<number>(-1);
  const lastChapterRef   = useRef<number>(-1);

  // ── 1. Single fast startup: launch everything in parallel ──────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Case A: URL params override everything — skip network calls
      if (initialBook && initialChapter && initialVersion) {
        const versionExists = VERSIONS.some(v => v.id === initialVersion);
        if (versionExists) {
          setSelectedVersion(initialVersion);
          setSelectedBook(initialBook);
          setSelectedChapter(initialChapter);
          setLastReadLoaded(true);
          // Still need books + chapters for the selector UI
          const [index, chaps] = await Promise.all([
            getBooksIndex(),
            fetchChaptersDirect(initialVersion, initialBook),
          ]);
          if (cancelled) return;
          if (index) setBooks(resolveBooksFromIndex(index, initialVersion));
          applyChapters(chaps, initialChapter);
          setLoadingBooks(false);
          setIsInitialLoading(false);
          return;
        }
      }

      // Case B: Fetch last-read, preferences, and books-index in parallel
      const [lastReadData, prefData, index] = await Promise.all([
        fetch('/api/user/last-read').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/user/preferences').then(r => r.ok ? r.json() : null).catch(() => null),
        getBooksIndex(),
      ]);

      if (cancelled) return;

      let version: string = 'statenvertaling';
      let restoredBook = '';
      let restoredChapter = 1;
      let restoredCommentary = '';

      // Priority 1: last-read
      const lr = lastReadData?.lastReadChapter ?? lastReadData; // handle both shapes
      if (lr?.version && lr?.book && lr?.chapter && lr.book.toLowerCase() !== 'verses') {
        version          = lr.version;
        restoredBook     = lr.book;
        restoredChapter  = lr.chapter;
        restoredCommentary = lr.commentary || '';
      }
      // Priority 2: preferences (only if no last-read)
      else if (prefData?.preferences?.translation) {
        const pref = prefData.preferences.translation.toLowerCase();
        const match = VERSIONS.find(v =>
          v.name.toLowerCase() === pref ||
          v.id === pref ||
          v.name.toLowerCase().includes(pref)
        );
        if (match) version = match.id;
      }

      setSelectedVersion(version);
      if (restoredCommentary) setSelectedCommentary(restoredCommentary);

      // Resolve books from cached index (no extra fetch)
      const bookList = index ? resolveBooksFromIndex(index, version) : [];
      setBooks(bookList);
      setLoadingBooks(false);

      // Determine book to open
      let book = restoredBook;
      if (!book || !bookList.includes(book)) {
        book = bookList.includes('Genesis') ? 'Genesis' : (bookList[0] ?? '');
        restoredChapter = 1;
      }

      setSelectedBook(book);
      setLastReadLoaded(true);

      if (!book) {
        setIsInitialLoading(false);
        return;
      }

      // Fetch chapters for the resolved book
      const chaps = await fetchChaptersDirect(version, book);
      if (cancelled) return;
      applyChapters(chaps, restoredChapter);
      setIsInitialLoading(false);
    }

    function applyChapters(chaps: number[], preferred: number) {
      if (chaps.length === 0) {
        setChapters([]);
        setMaxChapter(1);
        setSelectedChapter(1);
        return;
      }
      setChapters(chaps);
      setMaxChapter(chaps[chaps.length - 1]);
      setSelectedChapter(chaps.includes(preferred) ? preferred : chaps[0]);
    }

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lng]);

  // ── 2. Re-fetch books when version changes (user interaction) ──
  useEffect(() => {
    if (!selectedVersion || !lastReadLoaded) return;

    let cancelled = false;

    async function loadBooks() {
      setLoadingBooks(true);
      const index = await getBooksIndex();
      if (cancelled) return;

      const bookList = index ? resolveBooksFromIndex(index, selectedVersion!) : [];
      setBooks(bookList);
      setLoadingBooks(false);

      // Try to keep the same book position
      const prevIdx = lastBookIndexRef.current;
      lastBookIndexRef.current = -1;

      let nextBook = selectedBook;
      if (!bookList.includes(nextBook)) {
        nextBook = prevIdx >= 0 && prevIdx < bookList.length
          ? bookList[prevIdx]
          : (bookList.includes('Genesis') ? 'Genesis' : (bookList[0] ?? ''));
      }

      if (nextBook !== selectedBook) setSelectedBook(nextBook);
    }

    loadBooks();
    return () => { cancelled = true; };
    // We intentionally exclude selectedBook from deps to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion]);

  // ── 3. Re-fetch chapters when book or version changes ──────────
  useEffect(() => {
    if (!selectedBook || !selectedVersion) return;

    let cancelled = false;

    async function loadChapters() {
      setLoadingChapters(true);
      const chaps = await fetchChaptersDirect(selectedVersion!, selectedBook);
      if (cancelled) return;

      if (chaps.length === 0) {
        setChapters([]);
        setMaxChapter(1);
        setSelectedChapter(1);
        setLoadingChapters(false);
        setIsInitialLoading(false);
        return;
      }

      setChapters(chaps);
      setMaxChapter(chaps[chaps.length - 1]);

      setSelectedChapter(prev => {
        const stored = lastChapterRef.current;
        lastChapterRef.current = -1;
        if (stored !== -1 && chaps.includes(stored)) return stored;
        return chaps.includes(prev) ? prev : chaps[0];
      });

      setLoadingChapters(false);
      setIsInitialLoading(false);
    }

    loadChapters();
    return () => { cancelled = true; };
  }, [selectedBook, selectedVersion]);

  // ── 4. Persist last-read + log reading session (debounced) ───
  useEffect(() => {
    if (!selectedBook || !selectedChapter || !selectedVersion || !lastReadLoaded) return;

    const id = setTimeout(() => {
      fetch('/api/user/last-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book: selectedBook,
          chapter: selectedChapter,
          version: selectedVersion,
          commentary: selectedCommentary,
        }),
      }).catch(() => {});
      fetch('/api/user/log-reading', { method: 'POST' }).catch(() => {});
    }, 1500);

    return () => clearTimeout(id);
  }, [selectedBook, selectedChapter, selectedVersion, selectedCommentary, lastReadLoaded]);

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleVersionChange = useCallback((version: string) => {
    if (books.length > 0 && selectedBook) {
      lastBookIndexRef.current = books.indexOf(selectedBook);
      lastChapterRef.current   = selectedChapter;
    }
    setSelectedBook('');
    setSelectedVersion(version);
  }, [books, selectedBook, selectedChapter]);

  const handleBookChange = useCallback((book: string) => {
    setSelectedBook(book);
    setSelectedChapter(1);
  }, []);

  const handleChapterChange = useCallback((chapter: number) => {
    setSelectedChapter(chapter);
  }, []);

  const handleCommentaryChange = useCallback((commentary: string) => {
    setSelectedCommentary(commentary);
  }, []);

  const handlePreviousChapter = useCallback(() => {
    setSelectedChapter(prev => {
      const idx = chapters.indexOf(prev);
      return idx > 0 ? chapters[idx - 1] : prev;
    });
  }, [chapters]);

  const handleNextChapter = useCallback(() => {
    setSelectedChapter(prev => {
      const idx = chapters.indexOf(prev);
      return idx !== -1 && idx < chapters.length - 1 ? chapters[idx + 1] : prev;
    });
  }, [chapters]);

  return {
    versions: VERSIONS as unknown as { id: string; name: string; language: string }[],
    books,
    chapters,
    selectedVersion,
    selectedBook,
    selectedChapter,
    selectedCommentary,
    maxChapter,
    loadingVersions: false, // versions are hardcoded — always available
    loadingBooks,
    loadingChapters,
    isInitialLoading,
    handleVersionChange,
    handleBookChange,
    handleChapterChange,
    handleCommentaryChange,
    handlePreviousChapter,
    handleNextChapter,
  };
}
