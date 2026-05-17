"use client"

import { useEffect, useState } from 'react'
import React from 'react'
import { useSearchParams } from 'next/navigation'
import BibleSelector from '../../components/study/BibleSelector'
import ChapterViewer from '../../components/study/ChapterViewer'
import GeoImages from '../../components/study/GeoImages'
import { useTranslation } from '../i18n/client'

export default function ReadPage() {
  const { t, i18n } = useTranslation('study');
  const lng = i18n.resolvedLanguage;
  const searchParams = useSearchParams();
  
  const [versions, setVersions] = useState<{id: string, name: string, language?: string}[]>([])
  const [books, setBooks] = useState<string[]>([])
  const [chapters, setChapters] = useState<number[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState('Genesis')
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [loadingChapters, setLoadingChapters] = useState(false)
  const [fromPlan, setFromPlan] = useState<string | null>(null)
  const [planDay, setPlanDay] = useState<number | null>(null)

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

  // Fetch versions and books on load
  useEffect(() => {
    const fetchData = async () => {
      setLoadingVersions(true);
      setLoadingBooks(true);
      try {
        // Check URL parameters for Bible reference
        const bookParam = searchParams.get('book');
        const chapterParam = searchParams.get('chapter');
        const planParam = searchParams.get('plan');
        const dayParam = searchParams.get('day');

        if (planParam) {
          setFromPlan(planParam);
        }
        if (dayParam) {
          setPlanDay(parseInt(dayParam));
        }

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

  // Save last read chapter whenever user changes book, chapter, or version (except when from plan)
  useEffect(() => {
    // Don't save if reading from a plan or if we don't have valid data
    if (fromPlan || !selectedBook || !selectedChapter || !selectedVersion) {
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
  }, [selectedBook, selectedChapter, selectedVersion, fromPlan]);

  const handleMarkComplete = async () => {
    if (!fromPlan || !planDay) return;

    try {
      const response = await fetch('/api/bible-plans/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          planId: fromPlan, 
          day: planDay 
        }),
      });

      if (response.ok) {
        // Show success message and redirect back
        alert(t('day_marked_complete', { 
          defaultValue: `Day ${planDay} marked as complete!` 
        }));
        window.history.back();
      } else {
        alert(t('error_marking_complete', { 
          defaultValue: 'Error marking day as complete' 
        }));
      }
    } catch (error) {
      console.error('Error marking day complete:', error);
      alert(t('error_marking_complete', { 
        defaultValue: 'Error marking day as complete' 
      }));
    }
  };

  return (
    <div className="min-h-screen dark:bg-gray-900">
      {/* Main Content */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          {fromPlan && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {t('reading_plan_context', { defaultValue: 'Reading from plan' })}
                  </p>
                  {planDay && (
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      {t('day', { defaultValue: 'Day' })} {planDay}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => window.history.back()}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  {t('back_to_plan', { defaultValue: 'Back to plan' })}
                </button>
              </div>
            </div>
          )}
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            {fromPlan ? t('daily_reading', { defaultValue: 'Daily Reading' }) : t('read_scripture')}
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            {fromPlan ? t('follow_plan_reading', { defaultValue: 'Follow your reading plan' }) : t('explore_bible')}
          </p>
        </div>

        {/* Bible Selector */}
        <div className="mb-6 lg:mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border p-4 lg:p-6">
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

        {/* Chapter Viewer */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border">
          <ChapterViewer
            version={selectedVersion}
            book={selectedBook}
            chapter={selectedChapter}
            maxChapter={Math.max(...chapters)}
          />
          
          {/* Plan Progress Controls */}
          {fromPlan && planDay && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('reading_progress', { defaultValue: 'Reading Progress' })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMarkComplete()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    {t('mark_complete', { defaultValue: 'Mark Complete' })}
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                  >
                    {t('back_to_plan', { defaultValue: 'Back to Plan' })}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Geo Images */}
        <GeoImages book={selectedBook} chapter={selectedChapter} />
      </div>
    </div>
  )
}

