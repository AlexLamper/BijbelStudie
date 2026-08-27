"use client"

import { useEffect, useState } from 'react'
import React from 'react'
import { useSearchParams } from 'next/navigation'
import BibleSelector from '../../components/study/BibleSelector'
import ChapterViewer from '../../components/study/ChapterViewer'
import StudyMaterialsSection from '../../components/study/StudyMaterialsSection'
import { ReadingPreferencesMenu } from '../../components/study/ReadingPreferencesMenu'
import { useReadingPreferences } from '../../hooks/useReadingPreferences'
import { useTranslation } from '../i18n/client'

/**
 * Free reading and reference.
 *
 * This page is now the home of the five resource panels - commentary,
 * grondtekst, historical context, notes and the AI assistant - which used to sit
 * beside the text on /studie. They were moved rather than removed: the problem
 * was never the panels, it was having all of them open during a guided lesson,
 * which made a step-by-step study read like a reference work. Looking things up
 * is a real task; it just needs its own screen.
 *
 * /studie now redirects `?book=&chapter=` here, so every reading link in the app
 * and all 66 public book pages land on this page.
 */
export default function ReadPage() {
  const { t, i18n } = useTranslation('study');
  const lng = i18n.resolvedLanguage;
  const searchParams = useSearchParams();
  const { preferences, updatePreferences } = useReadingPreferences();

  const [versions, setVersions] = useState<{id: string, name: string, language?: string}[]>([])
  const [books, setBooks] = useState<string[]>([])
  const [chapters, setChapters] = useState<number[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState('Genesis')
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [selectedCommentary, setSelectedCommentary] = useState('matthew_henry_nl')
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [loadingChapters, setLoadingChapters] = useState(false)

  const API_BASE_URL = '/api/bible';

  // Function to get default version based on language
  const getDefaultVersion = (versionList: {id: string, name: string, language?: string}[], language: string): string | null => {
    if (language === 'nl') {
      return versionList.find(v => v.id === 'statenvertaling')?.id || versionList[0]?.id || null;
    } else if (language === 'en') {
      return versionList.find(v => v.id === 'asv')?.id || versionList[0]?.id || null;
    } else {
      return versionList[0]?.id || null;
    }
  };

  // Remember the commentary choice the same way the rest of the app does.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bijbelstudie_commentary');
      if (stored) setSelectedCommentary(stored);
    } catch {
      /* private mode */
    }
  }, []);

  // Fetch versions and books on load
  useEffect(() => {
    const fetchData = async () => {
      setLoadingVersions(true);
      setLoadingBooks(true);
      try {
        // Check URL parameters for Bible reference
        const bookParam = searchParams.get('book');
        const chapterParam = searchParams.get('chapter');
        // Fetch versions
        const resVersions = await fetch(`${API_BASE_URL}/versions`);
        if (!resVersions.ok) {
          throw new Error(`Failed to fetch versions: ${resVersions.status}`);
        }
        const versionData = await resVersions.json();
        const versionNames = versionData;
        setVersions(versionNames);

        // Try to fetch user's last read chapter if no URL params provided
        let lastReadRestored = false;
        if (!bookParam && !chapterParam) {
          try {
            const lastReadRes = await fetch('/api/user/last-read');
            if (lastReadRes.ok) {
              const { lastReadChapter } = await lastReadRes.json();
              if (lastReadChapter && lastReadChapter.version && lastReadChapter.book && lastReadChapter.chapter) {
                setSelectedVersion(lastReadChapter.version);
                setSelectedBook(lastReadChapter.book);
                setSelectedChapter(lastReadChapter.chapter);
                lastReadRestored = true;
              }
            }
          } catch {
            // No last read chapter found, using defaults
          }
        }

        // Set version based on language if not restored from last read
        let currentVersion = selectedVersion;
        if (!lastReadRestored && !currentVersion) {
          const defaultVersion = getDefaultVersion(versionNames, lng);
          setSelectedVersion(defaultVersion);
          currentVersion = defaultVersion;
        }

        // Fetch books
        const booksUrl = currentVersion ? `${API_BASE_URL}/books?version=${currentVersion}` : `${API_BASE_URL}/books`;
        const resBooks = await fetch(booksUrl);
        if (!resBooks.ok) {
          throw new Error(`Failed to fetch books: ${resBooks.status}`);
        }
        const dataBooks = await resBooks.json();
        setBooks(dataBooks);

        // URL parameters take precedence over last read
        if (bookParam && dataBooks.includes(bookParam)) {
          setSelectedBook(bookParam);
        }
        if (chapterParam) {
          const chapter = parseInt(chapterParam);
          if (!isNaN(chapter) && chapter > 0) {
            setSelectedChapter(chapter);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setVersions([]);
        setBooks([]);
      } finally {
        setLoadingVersions(false);
        setLoadingBooks(false);
      }
    }

    fetchData()
  }, [lng, searchParams, selectedVersion])

  // Fetch chapters when book changes
  useEffect(() => {
    if (!selectedBook || !selectedVersion) {
      setChapters([]);
      setSelectedChapter(1);
      return;
    }

    const fetchChapters = async () => {
      setLoadingChapters(true);
      try {
        const params = new URLSearchParams({ book: selectedBook });
        if (selectedVersion && selectedVersion !== 'Staten Vertaling') {
          params.append('version', selectedVersion);
        }

        const res = await fetch(`${API_BASE_URL}/chapters?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch chapters: ${res.status}`);
        }
        const chapterStrings: string[] = await res.json();
        const chapterNumbers = chapterStrings.map(Number).sort((a, b) => a - b);
        setChapters(chapterNumbers);
      } catch (error) {
        console.error('Error fetching chapters:', error);
        setChapters([]);
      } finally {
        setLoadingChapters(false);
      }
    }

    fetchChapters();
  }, [selectedBook, selectedVersion])

  // Save last read chapter whenever user changes book, chapter, or version
  useEffect(() => {
    if (!selectedBook || !selectedChapter || !selectedVersion) {
      return;
    }

    const saveLastRead = async () => {
      try {
        await fetch('/api/user/last-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            book: selectedBook,
            chapter: selectedChapter,
            version: selectedVersion,
          }),
        });
      } catch (err) {
        console.error('Error saving last read chapter:', err);
      }
    };

    // Debounce the save to avoid too many requests
    const timeoutId = setTimeout(saveLastRead, 1000);
    return () => clearTimeout(timeoutId);
  }, [selectedBook, selectedChapter, selectedVersion]);

  const maxChapter = chapters.length > 0 ? Math.max(...chapters) : 1;

  const changeChapter = (delta: number) => {
    setSelectedChapter((current) => {
      const next = current + delta;
      if (next < 1 || next > maxChapter) return current;
      return next;
    });
  };

  const handleCommentaryChange = (commentary: string) => {
    setSelectedCommentary(commentary);
    try {
      localStorage.setItem('bijbelstudie_commentary', commentary);
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Header Section */}
        <div className="mb-5 lg:mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-1.5">
              {t('read_scripture')}
            </h1>
            <p className="text-muted-foreground text-sm lg:text-base">
              {t('explore_bible')}
            </p>
          </div>
          <ReadingPreferencesMenu
            preferences={preferences}
            onUpdate={updatePreferences}
          />
        </div>

        {/* Bible Selector */}
        <div
          data-tour="bible-selector"
          className="mb-5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border p-4 lg:p-5"
        >
          <BibleSelector
            versions={versions}
            books={books}
            chapters={chapters}
            selectedVersion={selectedVersion}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            onVersionChange={(version) => setSelectedVersion(version)}
            onBookChange={(book) => {
              setSelectedBook(book)
              setSelectedChapter(1)
            }}
            onChapterChange={setSelectedChapter}
            loadingVersions={loadingVersions}
            loadingBooks={loadingBooks}
            loadingChapters={loadingChapters}
            t={t}
          />
        </div>

        {/*
          Text and resources side by side from xl up, stacked below it. Unlike
          the old /studie layout this is a reference screen, so having both open
          is the point rather than the problem.
        */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <div
            data-tour="bible-text"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border overflow-hidden xl:h-[calc(100vh-16rem)]"
          >
            <ChapterViewer
              version={selectedVersion}
              book={selectedBook}
              chapter={selectedChapter}
              maxChapter={maxChapter}
              preferences={preferences}
            />
          </div>

          <div
            data-tour="commentary"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border overflow-hidden h-[70vh] xl:h-[calc(100vh-16rem)]"
          >
            <StudyMaterialsSection
              selectedBook={selectedBook}
              selectedChapter={selectedChapter}
              selectedVersion={selectedVersion}
              selectedCommentary={selectedCommentary}
              versions={versions}
              onNextChapter={() => changeChapter(1)}
              onPrevChapter={() => changeChapter(-1)}
              onCommentaryChange={handleCommentaryChange}
              onDownload={() => {}}
              t={t}
              preferences={preferences}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
