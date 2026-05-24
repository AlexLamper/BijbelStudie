'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ChevronDown, Lock, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { useSession } from 'next-auth/react';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../app/i18n/client';
import { ReadingPreferences } from '../../hooks/useReadingPreferences';
import { getPreferenceClasses, getPreferenceStyles } from '../../lib/preferenceClasses';
import SpeakButton from './SpeakButton';

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCommentaryText(commentary: Record<string, string>): string {
  return Object.entries(commentary)
    .map(([key, text]) => {
      const label = key === 'intro' || key === '0' ? 'Inleiding' : `Vers ${key}`;
      return `${label}. ${stripHtml(text)}`;
    })
    .join(' ');
}

interface CommentaryComponentProps {
  book: string;
  chapter: number;
  source?: string;
  onSourceChange?: (source: string) => void;
  height?: number;
  preferences?: ReadingPreferences;
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

// ── Dachsel formatter ─────────────────────────────────────────────
// Handles ***Bible text 1) ref...*** blocks + numbered footnotes
function formatDachselText(raw: string): string {
  const P  = 'style="margin-top:0.85em;line-height:1.8"';
  const blocks = raw.split(/\n{2,}/);

  type Footnote = { num: string; lines: string[] };
  let verseHtml = '';
  const bodyParts: string[] = [];
  const footnotes: Footnote[] = [];
  let currentFn: Footnote | null = null;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const line = trimmed.replace(/\n+/g, ' ');

    // Bible verse citation block: ***N. text***
    const verseMatch = line.match(/^\*{1,3}([\s\S]+?)\*{1,3}$/);
    if (verseMatch) {
      currentFn = null;
      // Replace inline footnote markers "N)" preceded by a space/comma
      const inner = verseMatch[1]
        .replace(/^\d+\.\s*/, '')          // strip leading "1. "
        .replace(/(?<=[\s,])(\d{1,2})\)(?=[\s,])/g,
          '<sup style="color:#0D9488;font-weight:600;margin-left:1px">$1</sup>');
      verseHtml = `<blockquote style="border-left:3px solid #0D9488;padding:0.6em 1em;margin:0.75em 0;background:rgba(13,148,136,0.05);border-radius:0 6px 6px 0;font-style:italic;line-height:1.75">${inner}</blockquote>`;
      continue;
    }

    // Footnote start: "N) text..."
    const fnMatch = line.match(/^(\d{1,2})\)\s+(.+)$/);
    if (fnMatch) {
      currentFn = { num: fnMatch[1], lines: [fnMatch[2]] };
      footnotes.push(currentFn);
      continue;
    }

    // Continuation of current footnote or regular paragraph
    if (currentFn) {
      currentFn.lines.push(line);
    } else {
      bodyParts.push(`<p ${P}>${line}</p>`);
    }
  }

  let html = verseHtml + bodyParts.join('');

  if (footnotes.length > 0) {
    const fnItems = footnotes.map(fn => {
      const text = fn.lines
        .map((l, i) => i === 0 ? l : `<p ${P} style="margin-top:0.5em;line-height:1.75">${l}</p>`)
        .join('');
      return `<div style="margin-top:0.6em;padding-left:1.5em;position:relative">
        <sup style="position:absolute;left:0;top:0.2em;color:#0D9488;font-weight:700">${fn.num}</sup>
        <p style="margin:0;line-height:1.75">${text}</p>
      </div>`;
    }).join('');
    html += `<div style="margin-top:1.5em;padding-top:1em;border-top:1px solid rgba(107,114,128,0.2);font-size:0.88em;color:inherit;opacity:0.85">${fnItems}</div>`;
  }

  return html;
}

// ── HTML commentary formatter (KingComments etc.) ─────────────────
// Cleans up HTML from MySword and adds proper spacing
function formatHtmlCommentary(raw: string): string {
  return raw
    .replace(/([A-Za-z0-9])\\\./g, '$1.')
    // <br/> directly after closing h3 tag → remove (h3 already creates block)
    .replace(/<\/h3>\s*<br\s*\/?>/gi, '</h3>')
    .replace(/<br\s*\/?>\s*<\/h3>/gi, '</h3>')
    // Internal MyBible links (#bBOOK.CH.V) → styled span (not navigable)
    .replace(
      /<a\s[^>]*href="#b[^"]*"[^>]*>(.*?)<\/a>/gi,
      '<span style="color:#0D9488;font-style:italic;font-weight:500">$1</span>'
    )
    // h3 headings: add spacing + weight
    .replace(
      /<h3>/gi,
      '<h3 style="font-size:1.05rem;font-weight:700;margin-top:1.75rem;margin-bottom:0.4rem;line-height:1.4">'
    )
    // h4 subheadings
    .replace(
      /<h4>/gi,
      '<h4 style="font-size:0.95rem;font-weight:600;margin-top:1.25rem;margin-bottom:0.3rem;line-height:1.4">'
    )
    // Paragraphs: proper spacing + line height
    .replace(/<p>/gi, '<p style="margin-top:0.85em;line-height:1.8">')
    // Bold text
    .replace(/<b>/gi, '<strong>')
    .replace(/<\/b>/gi, '</strong>');
}

// ── Generic plain-text formatter (Matthew Henry etc.) ────────────
function formatPlainText(raw: string): string {
  const text = raw.replace(/([A-Za-z0-9])\\\./g, '$1.');
  const blocks = text.split(/\n{2,}/);

  return blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    const line = trimmed.replace(/\n+/g, ' ');

    // Roman numeral section heading: I., II., III., IV. etc.
    if (/^(I{1,3}|IV|VI{0,3}|IX|X{1,3})\.\s/.test(line))
      return `<p style="font-weight:700;font-size:0.95rem;margin-top:1.6em;margin-bottom:0.15em;line-height:1.5;border-left:3px solid #0D9488;padding-left:0.75em">${line}</p>`;
    // Numbered point: 1., 2., 3.
    if (/^\d+\.\s/.test(line))
      return `<p style="padding-left:1.5em;margin-top:0.8em;line-height:1.8">${line}</p>`;
    // Capital-letter point: A., B., C.
    if (/^[A-Z]\.\s/.test(line))
      return `<p style="padding-left:1.5em;margin-top:0.8em;line-height:1.8">${line}</p>`;
    // Lowercase sub-point: a., b., c.
    if (/^[a-z]\.\s/.test(line))
      return `<p style="padding-left:2.75em;margin-top:0.5em;line-height:1.8">${line}</p>`;
    // Parenthetical: (1)
    if (/^\(\d+\)[.)\s]/.test(line))
      return `<p style="padding-left:3.75em;margin-top:0.5em;line-height:1.8">${line}</p>`;

    return `<p style="margin-top:0.85em;line-height:1.8">${line}</p>`;
  }).filter(Boolean).join('');
}

// ── Main dispatcher ───────────────────────────────────────────────
function formatCommentaryText(raw: string): string {
  if (/<[a-zA-Z][^>]*>/.test(raw)) return formatHtmlCommentary(raw);
  if (/\*{3}/.test(raw))           return formatDachselText(raw);
  return formatPlainText(raw);
}

const CommentaryComponent: React.FC<CommentaryComponentProps> = ({
  book,
  chapter,
  source: initialSource = 'matthew-henry',
  onSourceChange,
  height,
  preferences,
}) => {
  const prefClasses = getPreferenceClasses(preferences);
  const prefStyles  = getPreferenceStyles(preferences);
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

  const isLocked = () => false;

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
      <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-border flex items-center justify-between gap-2 bg-gray-50 dark:bg-card">
        <span className="text-sm font-medium text-gray-600 dark:text-muted-foreground">Commentaarbron</span>
        <div className="flex items-center gap-2">
          {commentary && Object.keys(commentary).length > 0 && (
            <SpeakButton
              getText={() => buildCommentaryText(commentary)}
              label="Lees commentaar voor"
            />
          )}
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
                                    {src.name}
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
      </div>

      {/* Content Area */}
      <CardContent className={`px-4 sm:px-6 pt-4 pb-24 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-secondary scrollbar-track-transparent ${height ? 'flex-1 min-h-0' : 'max-h-[600px] lg:max-h-[calc(100vh-300px)]'}`}>
        {isLocked() ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="bg-amber-100 dark:bg-amber-900/20 p-4 rounded-full">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="font-merriweather font-bold text-xl text-gray-900 dark:text-gray-100">
                Pro-commentaar
              </h3>
              <p className="text-muted-foreground text-sm">
                KingComments en andere premium commentaren zijn beschikbaar voor Pro-abonnees van BijbelStudie.
              </p>
            </div>
            <Button
              onClick={() => router.push('/abonnement')}
              className="bg-[#0D9488] hover:bg-[#0f766e] text-white"
            >
              Upgrade naar Pro
            </Button>
          </div>
        ) : loading ? (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#0D9488' }} />
                <p className="font-inter text-gray-700 dark:text-muted-foreground text-base font-medium">
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
        ) : (() => {
            const isSubscribed = session?.user?.isSubscribed;
            const allEntries = Object.entries(commentary);
            // KingComments is always fully free for everyone - never paywall it (covers all variants like kingcomments_nl)
            const isAlwaysFree = selectedSource.toLowerCase().startsWith('kingcomments');
            // Total content length determines whether to clip. Skip paywall for very short commentaries.
            const totalLength = allEntries.reduce((sum, [, text]) => sum + text.length, 0);
            const showPaywall = !isSubscribed && !isAlwaysFree && totalLength > 1200;
            return (
              <>
                <div
                  style={showPaywall ? {
                    maxHeight: 1100,
                    overflow: 'hidden',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
                  } : undefined}
                >
                  {allEntries.map(([key, text]) => {
                    const isHtml = /<[a-zA-Z][^>]*>/.test(text);
                    const label = key === 'intro' || key === '0'
                      ? 'Inleiding'
                      : `Vers ${key}`;
                    return (
                      <div key={key} className="border-b border-gray-100 dark:border-border pb-6 last:border-0 pr-2 mb-6 last:mb-0">
                        {isHtml ? (
                          <div className="inline-flex items-center gap-1.5 mb-1">
                            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#0D9488] dark:text-teal-400 bg-[rgba(13,148,136,0.08)] dark:bg-[rgba(13,148,136,0.15)] px-2 py-0.5 rounded-full">
                              {label}
                            </span>
                          </div>
                        ) : (
                          <h3 className="font-merriweather font-semibold text-gray-900 dark:text-foreground mb-2 mt-1">
                            {label}
                          </h3>
                        )}
                        <div
                          className={`text-gray-700 dark:text-foreground max-w-none ${prefClasses}`}
                          style={prefStyles}
                          dangerouslySetInnerHTML={{ __html: formatCommentaryText(text) }}
                        />
                      </div>
                    );
                  })}
                </div>
                {showPaywall && (
                  <div className="mt-6 max-w-[340px] mx-auto rounded-xl border border-gray-200 dark:border-border bg-gradient-to-br from-gray-50 to-white dark:from-card dark:to-background p-5 text-center shadow-sm">
                    <Sparkles className="h-5 w-5 mx-auto mb-2.5 text-[#0D9488]" />
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1.5">
                      Lees het volledige commentaar
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-[260px] mx-auto leading-relaxed mb-4">
                      Upgrade naar Pro voor toegang tot het volledige commentaar van dit hoofdstuk.
                    </p>
                    <Button
                      onClick={() => router.push('/abonnement')}
                      className="bg-[#0D9488] hover:bg-[#0f766e] text-white text-sm h-9 px-5"
                    >
                      Upgrade naar Pro
                    </Button>
                  </div>
                )}
              </>
            );
          })()
        }
      </CardContent>
    </Card>
  );
};

export default CommentaryComponent;

