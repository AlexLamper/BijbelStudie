'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ChevronDown, Lock } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { useSession } from 'next-auth/react';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../app/i18n/client';

interface CommentaryComponentProps {
  book: string;
  chapter: number;
  source?: string;
  onSourceChange?: (source: string) => void;
  height?: number;
}

interface CommentarySource {
  id: string;
  name: string;
  language: string;
}

interface CommentaryData {
  [key: string]: string;
}

// ✅ Map Dutch → English book names for the commentary API
const bookNameMap: Record<string, string> = {
  // OT
  'Genesis': 'Genesis',
  'Exodus': 'Exodus',
  'Leviticus': 'Leviticus',
  'Numeri': 'Numbers',
  'Deuteronomium': 'Deuteronomy',
  'Jozua': 'Joshua',
  'Richteren': 'Judges',
  // Statenvertaling has 'Richtere' for some reason
  'Richtere': 'Judges',
  'Ruth': 'Ruth',
  '1 Samuel': '1 Samuel',
  '2 Samuel': '2 Samuel',
  '1 Koningen': '1 Kings',
  '2 Koningen': '2 Kings',
  '1 Kronieken': '1 Chronicles',
  '2 Kronieken': '2 Chronicles',
  'Ezra': 'Ezra',
  'Nehemia': 'Nehemiah',
  'Ester': 'Esther',
  'Job': 'Job',
  'Psalmen': 'Psalms',
  'Spreuken': 'Proverbs',
  'Prediker': 'Ecclesiastes',
  'Hooglied': 'Song of Solomon',
  'Jesaja': 'Isaiah',
  'Jeremia': 'Jeremiah',
  'Klaagliederen': 'Lamentations',
  'Ezechiël': 'Ezekiel',
  'Daniël': 'Daniel',
  'Hosea': 'Hosea',
  'Joël': 'Joel',
  'Amos': 'Amos',
  'Obadja': 'Obadiah',
  'Jona': 'Jonah',
  'Micha': 'Micah',
  'Nahum': 'Nahum',
  'Habakuk': 'Habakkuk',
  'Zefanja': 'Zephaniah',
  'Haggai': 'Haggai',
  'Zacharia': 'Zechariah',
  'Maleachi': 'Malachi',

  // NT
  'Mattheüs': 'Matthew',
  'Markus': 'Mark',
  'Lukas': 'Luke',
  'Johannes': 'John',
  'Handelingen': 'Acts',
  'Romeinen': 'Romans',
  '1 Korintiërs': '1 Corinthians',
  '2 Korintiërs': '2 Corinthians',
  '1 Corinthiërs': '1 Corinthians',
  '2 Corinthiërs': '2 Corinthians',
  'Galaten': 'Galatians',
  'Efeziërs': 'Ephesians',
  'Filippenzen': 'Philippians',
  'Kolossenzen': 'Colossians',
  '1 Tessalonicenzen': '1 Thessalonians',
  '2 Tessalonicenzen': '2 Thessalonians',
  '1 Timotheüs': '1 Timothy',
  '2 Timotheüs': '2 Timothy',
  'Titus': 'Titus',
  'Filemon': 'Philemon',
  'Hebreeën': 'Hebrews',
  'Jakobus': 'James',
  '1 Petrus': '1 Peter',
  '2 Petrus': '2 Peter',
  '1 Johannes': '1 John',
  '2 Johannes': '2 John',
  '3 Johannes': '3 John',
  'Judas': 'Jude',
  'Openbaring': 'Revelation',
};

function formatCommentaryText(raw: string): string {
  // Already HTML — just strip leftover markdown escapes
  if (/<[a-zA-Z][^>]*>/.test(raw)) {
    return raw.replace(/([A-Za-z0-9])\\\./g, '$1.');
  }

  // Strip markdown-escaped periods: "1\." → "1.", "a\." → "a."
  const text = raw.replace(/([A-Za-z0-9])\\\./g, '$1.');

  // Split on two or more newlines to get paragraph blocks
  const blocks = text.split(/\n{2,}/);

  return blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';

    // Collapse single newlines to spaces within a block
    const line = trimmed.replace(/\n+/g, ' ');

    // Roman numeral header: I., II., III., IV., V. etc.
    if (/^(I{1,3}|IV|VI{0,3}|IX|X{1,3})\.\s/.test(line)) {
      return `<p style="margin-top:1.5em;margin-bottom:0.25em;line-height:1.65">${line}</p>`;
    }

    // Numbered point: 1., 2., 3.
    if (/^\d+\.\s/.test(line)) {
      return `<p style="padding-left:1.25em;margin-top:0.75em;line-height:1.75">${line}</p>`;
    }

    // Capital-letter point: A., B., C.
    if (/^[A-Z]\.\s/.test(line)) {
      return `<p style="padding-left:1.25em;margin-top:0.75em;line-height:1.75">${line}</p>`;
    }

    // Lowercase lettered sub-point: a., b., c.
    if (/^[a-z]\.\s/.test(line)) {
      return `<p style="padding-left:2.5em;margin-top:0.5em;line-height:1.75">${line}</p>`;
    }

    // Parenthetical numbered sub-sub-point: (1). or (1)
    if (/^\(\d+\)[.)\s]/.test(line)) {
      return `<p style="padding-left:3.75em;margin-top:0.5em;line-height:1.75">${line}</p>`;
    }

    // Regular paragraph
    return `<p style="margin-top:0.75em;line-height:1.75">${line}</p>`;
  }).filter(Boolean).join('');
}

const CommentaryComponent: React.FC<CommentaryComponentProps> = ({
  book,
  chapter,
  source: initialSource = 'matthew-henry',
  onSourceChange,
  height
}) => {
  const [commentary, setCommentary] = useState<CommentaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSources, setAvailableSources] = useState<CommentarySource[]>([]);
  const [selectedSource, setSelectedSource] = useState(initialSource);
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation('study');
  const [notFound, setNotFound] = useState(false);

  const API_BASE_URL = '/api';

  useEffect(() => {
    setSelectedSource(initialSource);
  }, [initialSource]);

  // Fetch available commentaries
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/commentaries`);
        if (res.ok) {
          const sources = await res.json();
          setAvailableSources(sources);
        }
      } catch (e) {
        console.error("Failed to fetch commentary sources", e);
      }
    };
    fetchSources();
  }, []);

  useEffect(() => {
    const fetchCommentary = async () => {
      if (!book || !chapter) return;

      setLoading(true);
      setError(null);
      setCommentary(null);
      setNotFound(false);

      try {
        const englishBook = bookNameMap[book] || book;

        const params = new URLSearchParams({
          source: selectedSource,
          book: englishBook,
          chapter: chapter.toString(),
        });

        const url = `${API_BASE_URL}/commentary?${params.toString()}`;

        const res = await fetch(url);

        if (!res.ok) {
          if (res.status === 404) {
            setNotFound(true);
            return;
          }
          const errText = await res.text();
          throw new Error(
            `API error: ${res.status} ${res.statusText} - ${errText}`
          );
        }

        const data = await res.json();

        if (!data || Object.keys(data).length === 0) {
          setNotFound(true);
          return;
        }

        setCommentary(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error while fetching commentary.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCommentary();
  }, [book, chapter, selectedSource]);

  const formatSourceLabel = (src: string) => {
      return src.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const isLocked = (source: string) => {
    if (source === 'kingcomments' && !session?.user?.isSubscribed) {
      return true;
    }
    return false;
  };

  const languageNames: Record<string, string> = {
    en: 'English',
    nl: 'Nederlands',
    de: 'Deutsch',
    af: 'Afrikaans',
  };

  // Group sources by language
  const groupedSources = availableSources.reduce((acc, source) => {
    const lang = source.language || 'en';
    if (!acc[lang]) {
      acc[lang] = [];
    }
    acc[lang].push(source);
    return acc;
  }, {} as Record<string, CommentarySource[]>);

  const sortedLanguages = Object.keys(groupedSources).sort((a, b) => {
      if (a === 'nl') return -1;
      if (b === 'nl') return 1;
      if (a === 'en') return -1;
      if (b === 'en') return 1;
      return a.localeCompare(b);
  });

  return (
    <Card className={`border-0 shadow-none rounded-lg dark:bg-card ${height ? 'h-full flex flex-col' : ''}`}>
      {/* Source Selector */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-border flex items-center justify-between bg-gray-50 dark:bg-card">
        <span className="text-sm font-medium text-gray-600 dark:text-muted-foreground">Commentaarbron</span>
        <div className="relative">
            <select 
                value={selectedSource}
                onChange={(e) => {
                  const newSource = e.target.value;
                  setSelectedSource(newSource);
                  if (onSourceChange) {
                    onSourceChange(newSource);
                  }
                }}
                className="appearance-none bg-white dark:bg-secondary border border-gray-200 dark:border-border rounded-md py-1 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] dark:text-foreground"
            >
                {availableSources.length > 0 ? (
                    sortedLanguages.map(lang => (
                        <optgroup key={lang} label={languageNames[lang] || lang.toUpperCase()}>
                            {groupedSources[lang].map(src => (
                                <option key={src.id} value={src.id}>
                                  {src.name} {src.id === 'kingcomments' && !session?.user?.isSubscribed ? '🔒' : ''}
                                </option>
                            ))}
                        </optgroup>
                    ))
                ) : (
                    <option value={selectedSource}>{formatSourceLabel(selectedSource)}</option>
                )}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Content Area */}
      <CardContent className={`px-4 sm:px-6 pt-4 pb-24 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-secondary scrollbar-track-transparent ${height ? 'flex-1 min-h-0' : 'max-h-[600px] lg:max-h-[calc(100vh-300px)]'}`}>
        {isLocked(selectedSource) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="bg-amber-100 dark:bg-amber-900/20 p-4 rounded-full">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="font-merriweather font-bold text-xl text-gray-900 dark:text-gray-100">
                Premium Commentary
              </h3>
              <p className="text-muted-foreground text-sm">
                Unlock deep insights with King Comments and other premium study materials by subscribing to BijbelStudie Pro.
              </p>
            </div>
            <Button 
              onClick={() => router.push('/subscribe')}
              className="bg-[#0D9488] hover:bg-[#0f766e] text-white"
            >
              Upgrade to Pro
            </Button>
          </div>
        ) : loading ? (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#0D9488' }} />
                <p className="font-inter text-gray-700 text-base font-medium">
                    Commentaar laden...
                </p>
                </div>
            </div>
        ) : error ? (
            <div className="py-12 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="font-merriweather text-red-600 font-semibold mb-2 text-base dark:text-red-400">
                    Error loading commentary
                </p>
                <p className="font-inter text-gray-700 dark:text-muted-foreground text-sm">{error}</p>
            </div>
        ) : notFound ? (
            <div className="py-12 text-center text-gray-500 dark:text-muted-foreground text-sm">
                <p className="font-inter">{t('no_commentary_for_chapter', { source: formatSourceLabel(selectedSource) })}</p>
            </div>
        ) : !commentary ? (
            <div className="py-12 text-center text-gray-500 dark:text-muted-foreground text-sm">
                <p className="font-inter">Geen commentaar beschikbaar voor dit hoofdstuk.</p>
            </div>
        ) : (
            Object.entries(commentary).map(([key, text]) => (
            <div key={key} className="border-b border-gray-100 dark:border-border pb-4 last:border-0 pr-2">
                <h3 className="font-merriweather font-semibold text-gray-900 dark:text-foreground mb-2">
                {key === 'intro' || key === '0' ? 'Inleiding' : `Vers ${key}`}
                </h3>
                <div
                    className="font-inter text-gray-700 text-base dark:text-foreground max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatCommentaryText(text) }}
                />
            </div>
            ))
        )}
      </CardContent>
    </Card>
  );
};

export default CommentaryComponent;

