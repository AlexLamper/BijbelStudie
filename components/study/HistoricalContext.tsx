'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Info, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useTranslation } from '../../app/i18n/client';
import GeoImages from './GeoImages';
import { Separator } from '../ui/separator';

interface HistoricalContextProps {
  book: string;
  chapter: number;
  t: (key: string) => string;
}

export default function HistoricalContext({ book, chapter, t }: HistoricalContextProps) {
  const { i18n } = useTranslation('study');
  const lng = i18n.resolvedLanguage;
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
        if (!book) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const res = await fetch(`/api/summary?book=${encodeURIComponent(book)}&lang=${lng}`);
            if (res.ok) {
                const data = await res.json();
                setSummary(data.summary);
            } else {
                setSummary(null);
            }
        } catch (e) {
            console.error('Error fetching summary', e);
            setError('Failed to load summary');
        } finally {
            setIsLoading(false);
        }
    };

    fetchSummary();
  }, [book, lng]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#798777] dark:text-[#9aaa98] mx-auto mb-4" />
          <p className="font-inter text-gray-700 text-base font-medium dark:text-muted-foreground">
            {t('historical.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-none rounded-lg dark:bg-card h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-merriweather text-gray-900 dark:text-foreground">
          <Info className="w-6 h-6 text-[#798777] dark:text-[#9aaa98]" />
          {t('historical.general_info_title').replace('{{book}}', book)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-secondary scrollbar-track-transparent">
        {error ? (
             <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-500">{error}</p>
             </div>
        ) : summary ? (
            <div className="prose dark:prose-invert max-w-none font-inter text-gray-700 dark:text-foreground whitespace-pre-wrap leading-loose">
                {summary}
            </div>
        ) : (
            <p className="text-gray-500 dark:text-muted-foreground italic">
                {t('historical.no_info')}
            </p>
        )}

        <Separator className="my-6" />
        
        <div className="pb-8">
          <GeoImages book={book} chapter={chapter} className="mt-0" />
        </div>
      </CardContent>
    </Card>
  );
}

