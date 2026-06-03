'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Loader2, Plus, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { getBibleAttribution } from '../../lib/bible-attribution';

interface Translation {
  id: string;
  name: string;
  abbreviation: string;
}

interface ChapterData {
  translation: Translation;
  verses: Record<string, string>;
  loading: boolean;
  error: string | null;
}

interface ComparisonViewProps {
  book: string;
  chapter: number;
  translations: Translation[];
  t: (key: string) => string;
}

export default function ComparisonView({ 
  book, 
  chapter, 
  translations,
  t 
}: ComparisonViewProps) {
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>([]);
  const [chaptersData, setChaptersData] = useState<Record<string, ChapterData>>({});

  // Initialize with first two translations if available
  useEffect(() => {
    if (translations.length >= 2 && selectedTranslations.length === 0) {
      setSelectedTranslations([translations[0].id, translations[1].id]);
    }
  }, [translations, selectedTranslations.length]);

  const fetchChapterData = useCallback(async (translationId: string) => {
    setChaptersData(prev => ({
      ...prev,
      [translationId]: {
        ...prev[translationId],
        loading: true,
        error: null,
        translation: translations.find(t => t.id === translationId) || { id: translationId, name: '', abbreviation: '' }
      }
    }));

    try {
      const params = new URLSearchParams({
        version: translationId,
        book,
        chapter: chapter.toString(),
      });
      const response = await fetch(`/api/bible/chapter?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${translationId}`);
      }
      
      const data = await response.json();
      const verses = data.verses || {};
      
      setChaptersData(prev => ({
        ...prev,
        [translationId]: {
          translation: translations.find(t => t.id === translationId) || { id: translationId, name: '', abbreviation: '' },
          verses,
          loading: false,
          error: null
        }
      }));
    } catch (error) {
      console.error(`Error fetching ${translationId}:`, error);
      setChaptersData(prev => ({
        ...prev,
        [translationId]: {
          ...prev[translationId],
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load translation'
        }
      }));
    }
  }, [translations, book, chapter]);

  // Fetch chapter data when translations are selected
  useEffect(() => {
    selectedTranslations.forEach(translationId => {
      if (!chaptersData[translationId] || 
          chaptersData[translationId].loading === false) {
        fetchChapterData(translationId);
      }
    });
  }, [selectedTranslations, fetchChapterData, chaptersData]);

  const addTranslation = (translationId: string) => {
    if (!selectedTranslations.includes(translationId)) {
      setSelectedTranslations(prev => [...prev, translationId]);
    }
  };

  const removeTranslation = (translationId: string) => {
    setSelectedTranslations(prev => prev.filter(id => id !== translationId));
    setChaptersData(prev => {
      const newData = { ...prev };
      delete newData[translationId];
      return newData;
    });
  };

  const getMaxVerses = () => {
    let max = 0;
    Object.values(chaptersData).forEach(data => {
      if (data.verses) {
        const count = Object.keys(data.verses).length;
        if (count > max) {
          max = count;
        }
      }
    });
    return max;
  };

  const getVerseText = (translationId: string, verseNumber: number) => {
    const data = chaptersData[translationId];
    if (!data || !data.verses) return '';
    
    return data.verses[verseNumber.toString()] || '';
  };

  const maxVerses = getMaxVerses();
  const availableToAdd = translations.filter(
    t => !selectedTranslations.includes(t.id)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{t('comparison_view')}</h3>
          <Badge variant="secondary">{selectedTranslations.length} translations</Badge>
        </div>
        
        {/* Add Translation */}
        {availableToAdd.length > 0 && selectedTranslations.length < 4 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add translation
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {availableToAdd.map(translation => (
                <DropdownMenuItem 
                  key={translation.id} 
                  onClick={() => addTranslation(translation.id)}
                >
                  {translation.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Comparison Grid */}
      {selectedTranslations.length > 0 ? (
        <div className={`grid gap-4 ${
          selectedTranslations.length === 1 ? 'grid-cols-1' :
          selectedTranslations.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
          selectedTranslations.length === 3 ? 'grid-cols-1 lg:grid-cols-3' :
          'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'
        }`}>
          {selectedTranslations.map(translationId => {
            const data = chaptersData[translationId];
            return (
              <Card key={translationId} className="h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {data?.translation.name || translationId}
                    </CardTitle>
                    {selectedTranslations.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTranslation(translationId)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-96">
                    {data?.loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : data?.error ? (
                      <div className="text-red-500 text-sm py-4">
                        {data.error}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Array.from({ length: maxVerses }, (_, i) => i + 1).map(verseNumber => {
                          const verseText = getVerseText(translationId, verseNumber);
                          if (!verseText) return null;
                          
                          return (
                            <div key={verseNumber} className="flex gap-2">
                              <span className="text-xs text-muted-foreground font-mono min-w-[2rem] mt-0.5">
                                {verseNumber}
                              </span>
                              <p className="text-sm leading-relaxed flex-1">
                                {verseText}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  {getBibleAttribution(translationId) && (
                    <p className="mt-3 pt-2 border-t border-gray-100 dark:border-border text-[11px] leading-snug text-gray-400 dark:text-muted-foreground">
                      {getBibleAttribution(translationId)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="mb-4">Select translations to compare</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Choose first translation
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {translations.map(translation => (
                    <DropdownMenuItem 
                      key={translation.id} 
                      onClick={() => addTranslation(translation.id)}
                    >
                      {translation.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
