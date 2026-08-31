'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Square, Volume2, Settings2, Loader2, Cloud, Monitor, Sparkles, AlertCircle, X } from 'lucide-react';
import { useTTS, type SelectedVoice } from '../../hooks/useTTS';
import { useSpokenTextPublisher } from './SpokenText';
import type { CloudVoice } from '../../lib/cloudVoices';
import { cn } from '../../lib/utils';

interface SpeakButtonProps {
  getText: () => string;
  label?: string;
  compact?: boolean;
  showSettings?: boolean;
  className?: string;
}

const TEAL = '#0D9488';
const RATES: { value: number; label: string }[] = [
  { value: 0.85, label: 'Langzaam' },
  { value: 1,    label: 'Normaal' },
  { value: 1.2,  label: 'Vlot' },
  { value: 1.5,  label: 'Snel' },
];

export default function SpeakButton({
  getText,
  label = 'Voorlezen',
  compact = false,
  showSettings = true,
  className,
}: SpeakButtonProps) {
  const tts = useTTS();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  // The string this button last read out loud. The hook reports the reader's
  // position as offsets into it, and the verses on screen can only make sense of
  // those offsets if they are told which string they count into.
  const spokenTextRef = useRef<string | null>(null);
  const publishSpoken = useSpokenTextPublisher();
  // The compact error toast is portalled to <body>, so it has to wait for the
  // client. See the toast itself for why a portal and not an inline panel.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!settingsOpen) return;
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [settingsOpen]);

  // Hand the reader's position to whatever is rendering this text. Publishing
  // from an effect rather than from the hook itself keeps useTTS free of any
  // knowledge of the page: the hook only says where in the string the voice is,
  // and this is the component that knows which string that was.
  useEffect(() => {
    publishSpoken(spokenTextRef.current, tts.spokenRange);
  }, [publishSpoken, tts.spokenRange]);

  // A button can be unmounted mid-sentence - the verse list rebuilds when the
  // chapter changes - and a highlight nobody is speaking to would stay lit.
  useEffect(() => () => publishSpoken(null, null), [publishSpoken]);

  if (!tts.isSupported && !tts.cloudAvailable) return null;

  /** The one way this component starts a voice, so the text is never unrecorded. */
  const startSpeaking = (text: string, voiceOverride?: SelectedVoice) => {
    spokenTextRef.current = text;
    tts.speak(text, voiceOverride);
  };

  const handlePlayPause = () => {
    if (tts.isSpeaking && !tts.isPaused) {
      tts.pause();
    } else if (tts.isPaused) {
      tts.resume();
    } else {
      // No `if (text.trim())` guard any more - an empty passage is a fault worth
      // reporting, and swallowing it here was one of the ways the button could
      // look dead. `speak` raises the Dutch message for it.
      startSpeaking(getText());
    }
  };

  const isPlaying = tts.isSpeaking && !tts.isPaused;
  const browserDutch = tts.browserVoices.filter(v => v.lang.toLowerCase().startsWith('nl'));

  const handleFallbackToBrowser = () => {
    const fallback = browserDutch[0] ?? tts.browserVoices[0];
    if (fallback) {
      tts.setSelected({ kind: 'browser', voice: fallback });
    }
    tts.clearError();
  };

  if (compact) {
    return (
      <>
        <button
          onClick={handlePlayPause}
          title={tts.error ? tts.error : isPlaying ? 'Pauzeren' : tts.isPaused ? 'Hervatten' : label}
          aria-label={label}
          disabled={tts.isLoading}
          className={cn(
            'inline-flex items-center justify-center rounded-md p-1.5 transition-colors disabled:opacity-50',
            tts.error
              ? 'text-[#E11D48] bg-[rgba(225,29,72,0.08)]'
              : isPlaying
                ? 'bg-[rgba(13,148,136,0.15)] text-[#0D9488]'
                : 'text-gray-500 hover:text-[#0D9488] hover:bg-[rgba(13,148,136,0.08)]',
            className,
          )}
        >
          {tts.isLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : tts.error
              ? <AlertCircle className="h-3.5 w-3.5" />
              : isPlaying
                ? <Pause className="h-3.5 w-3.5" />
                : <Play className="h-3.5 w-3.5" />
          }
        </button>

        {/* Portalled, not inline. In the study flow this button lives inside a
            hover-only `opacity-0 group-hover:opacity-100` overlay and a header
            row with no space to grow, so an inline panel would either be
            invisible or wreck the layout - which is how a real failure (Google
            refusing the key) reached the reader as "nothing happens". */}
        {mounted && tts.error && createPortal(
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-[420px] px-0">
            <SpeakErrorPanel
              message={tts.error}
              onFallback={browserDutch.length > 0 ? handleFallbackToBrowser : undefined}
              onDismiss={tts.clearError}
              className="shadow-lg"
            />
          </div>,
          document.body,
        )}
      </>
    );
  }

  return (
    <div className={cn('inline-flex flex-col items-end gap-1', className)}>
    <div className="inline-flex items-center gap-1">
      <button
        onClick={handlePlayPause}
        disabled={tts.isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border disabled:opacity-60',
          tts.isSpeaking
            ? 'text-white border-transparent'
            : 'bg-white dark:bg-card text-gray-700 dark:text-foreground border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-secondary',
        )}
        style={tts.isSpeaking ? { backgroundColor: TEAL } : undefined}
      >
        {tts.isLoading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Laden…</>
        ) : isPlaying ? (
          <><Pause className="h-3.5 w-3.5" /> Pauze</>
        ) : tts.isPaused ? (
          <><Play className="h-3.5 w-3.5" /> Hervat</>
        ) : (
          <><Volume2 className="h-3.5 w-3.5" /> {label}</>
        )}
      </button>

      {tts.isSpeaking && (
        <button
          onClick={tts.stop}
          title="Stoppen"
          className="inline-flex items-center justify-center rounded-lg p-1.5 border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-600 dark:text-foreground hover:bg-gray-50 dark:hover:bg-secondary transition-colors"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
      )}

      {showSettings && (
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            title="Stem & snelheid"
            className={cn(
              'inline-flex items-center justify-center rounded-lg p-1.5 border transition-colors',
              settingsOpen
                ? 'bg-[rgba(13,148,136,0.1)] text-[#0D9488] border-[rgba(13,148,136,0.3)]'
                : 'bg-white dark:bg-card text-gray-600 dark:text-foreground border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-secondary',
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>

          {settingsOpen && (
            <SettingsPopover
              tts={tts}
              browserDutch={browserDutch}
              onSpeak={startSpeaking}
            />
          )}
        </div>
      )}
    </div>

    {tts.error && (
      <SpeakErrorPanel
        message={tts.error}
        onFallback={browserDutch.length > 0 ? handleFallbackToBrowser : undefined}
        onDismiss={tts.clearError}
        className="max-w-[360px]"
      />
    )}
    </div>
  );
}

/**
 * The one place voorlezen failures are worded, shared by the inline panel and
 * the compact toast so the two can never drift apart.
 *
 * The heading stays generic ("Voorlezen lukt niet") because `message` now covers
 * browser voices, empty passages and blocked autoplay as well - it is no longer
 * only about the cloud stem.
 */
function SpeakErrorPanel({
  message, onFallback, onDismiss, className,
}: {
  message: string;
  onFallback?: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('flex items-start gap-2 p-2.5 rounded-lg text-[11px] leading-snug bg-white dark:bg-card', className)}
      style={{ backgroundColor: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.25)' }}
    >
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: '#E11D48' }} />
      <div className="flex-1 text-gray-700 dark:text-foreground/90">
        <p className="font-semibold mb-0.5">Voorlezen lukt niet</p>
        <p className="text-gray-600 dark:text-muted-foreground">{message}</p>
        {onFallback && (
          <button
            onClick={onFallback}
            className="mt-1.5 text-[11px] font-semibold underline hover:no-underline"
            style={{ color: TEAL }}
          >
            Wissel naar browser-stem
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-700 dark:hover:text-foreground flex-shrink-0"
        title="Sluiten"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function SettingsPopover({
  tts,
  browserDutch,
  onSpeak,
}: {
  tts: ReturnType<typeof useTTS>;
  browserDutch: SpeechSynthesisVoice[];
  onSpeak: (text: string, voiceOverride?: SelectedVoice) => void;
}) {
  const selectedCloudId = tts.selected?.kind === 'cloud' ? tts.selected.voice.id : null;
  const selectedBrowserName = tts.selected?.kind === 'browser' ? tts.selected.voice.name : null;

  return (
    <div className="absolute right-0 top-full mt-1.5 w-80 max-h-[70vh] overflow-y-auto z-50 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl shadow-lg p-4 space-y-4">
      {/* Speed */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground mb-1.5">
          Snelheid
        </p>
        <div className="grid grid-cols-4 gap-1">
          {RATES.map(r => (
            <button
              key={r.value}
              onClick={() => tts.setRate(r.value)}
              className={cn(
                'rounded-md py-1.5 text-[11px] font-medium transition-colors',
                tts.rate === r.value
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-secondary text-gray-700 dark:text-foreground hover:bg-gray-200 dark:hover:bg-secondary/70',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cloud voices */}
      {tts.cloudAvailable && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground inline-flex items-center gap-1">
              <Cloud className="h-2.5 w-2.5" /> Cloud-stemmen
            </p>
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(13,148,136,0.1)', color: TEAL }}>
              <Sparkles className="h-2 w-2" /> Hoge kwaliteit
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {tts.cloudVoices.map(v => (
              <CloudVoiceRow
                key={v.id}
                voice={v}
                selected={selectedCloudId === v.id}
                onSelect={() => tts.setSelected({ kind: 'cloud', voice: v })}
                onPreview={() => previewCloudVoice(v, tts, onSpeak)}
                isLoading={tts.isLoading && selectedCloudId === v.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Browser voices */}
      {browserDutch.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground mb-2 inline-flex items-center gap-1">
            <Monitor className="h-2.5 w-2.5" /> Browser-stemmen
          </p>
          <div className="space-y-1">
            {browserDutch.map(v => (
              <BrowserVoiceRow
                key={v.name}
                voice={v}
                selected={selectedBrowserName === v.name}
                onSelect={() => tts.setSelected({ kind: 'browser', voice: v })}
              />
            ))}
          </div>
        </div>
      )}

      {!tts.cloudAvailable && browserDutch.length === 0 && (
        <p className="text-[11px] text-gray-500 dark:text-muted-foreground leading-relaxed">
          Geen Nederlandse stem gevonden. Voor de beste kwaliteit: gebruik Chrome of Edge,
          of vraag de beheerder om cloud-stemmen te activeren.
        </p>
      )}

      {!tts.cloudAvailable && (
        <p className="text-[10px] text-gray-400 dark:text-muted-foreground leading-relaxed border-t border-gray-100 dark:border-border pt-2.5">
          Tip: cloud-stemmen (mannen- en vrouwenstemmen, neuraal) worden geactiveerd zodra de beheerder
          een Google TTS sleutel configureert.
        </p>
      )}
    </div>
  );
}

function CloudVoiceRow({
  voice, selected, onSelect, onPreview, isLoading,
}: {
  voice: CloudVoice;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  isLoading: boolean;
}) {
  const genderColor = voice.gender === 'F' ? '#E11D48' : '#3B82F6';
  const genderBg   = voice.gender === 'F' ? 'rgba(225,29,72,0.1)' : 'rgba(59,130,246,0.1)';
  return (
    <div className={cn(
      'flex items-center gap-2 px-2 py-2 rounded-lg border transition-colors',
      selected
        ? 'border-[#0D9488] bg-[rgba(13,148,136,0.06)]'
        : 'border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-secondary/50',
    )}>
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 min-w-0 text-left"
      >
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: genderBg, color: genderColor }}>
          {voice.gender === 'F' ? 'V' : 'M'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900 dark:text-foreground truncate">
            {voice.name}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-muted-foreground truncate">
            {voice.description}
          </p>
        </div>
        {selected && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'rgba(13,148,136,0.1)', color: TEAL }}>
            Actief
          </span>
        )}
      </button>
      <button
        onClick={onPreview}
        disabled={isLoading}
        title={`Probeer ${voice.name}`}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:text-[#0D9488] hover:bg-[rgba(13,148,136,0.1)] transition-colors flex-shrink-0 disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function BrowserVoiceRow({
  voice, selected, onSelect,
}: {
  voice: SpeechSynthesisVoice;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left transition-colors border',
        selected
          ? 'border-[#0D9488] bg-[rgba(13,148,136,0.06)]'
          : 'border-transparent hover:bg-gray-50 dark:hover:bg-secondary/50',
      )}
    >
      <span className="text-xs text-gray-700 dark:text-foreground truncate">
        {voice.name}
      </span>
      <span className="text-[10px] text-gray-400 dark:text-muted-foreground flex-shrink-0">
        {voice.lang}
      </span>
    </button>
  );
}

function previewCloudVoice(
  voice: CloudVoice,
  tts: ReturnType<typeof useTTS>,
  onSpeak: (text: string, voiceOverride?: SelectedVoice) => void,
) {
  const sample = `Hallo, ik ben ${voice.name}. Zo klink ik wanneer ik de Bijbel voorlees.`;
  tts.setSelected({ kind: 'cloud', voice });
  // Handing `speak` the voice instead of waiting a tick for `selected` to land:
  // this `tts` belongs to the render the click came from, so its `speak` closes
  // over the *previous* voice and the preview played the wrong stem. Dropping
  // the setTimeout also keeps play() inside the user gesture.
  //
  // It goes through the button's own `onSpeak` so the sample sentence replaces
  // whatever passage was recorded last; a preview highlights nothing, and it
  // must not leave the previous passage's offsets standing either.
  onSpeak(sample, { kind: 'cloud', voice });
}
