'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Volume2, Settings2, Loader2, Cloud, Monitor, Sparkles, AlertCircle, X } from 'lucide-react';
import { useTTS } from '../../hooks/useTTS';
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

  if (!tts.isSupported && !tts.cloudAvailable) return null;

  const handlePlayPause = () => {
    if (tts.isSpeaking && !tts.isPaused) {
      tts.pause();
    } else if (tts.isPaused) {
      tts.resume();
    } else {
      const text = getText();
      if (text.trim()) tts.speak(text);
    }
  };

  const isPlaying = tts.isSpeaking && !tts.isPaused;
  const browserDutch = tts.browserVoices.filter(v => v.lang.toLowerCase().startsWith('nl'));

  if (compact) {
    return (
      <button
        onClick={handlePlayPause}
        title={isPlaying ? 'Pauzeren' : tts.isPaused ? 'Hervatten' : label}
        aria-label={label}
        disabled={tts.isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-1.5 transition-colors disabled:opacity-50',
          isPlaying
            ? 'bg-[rgba(13,148,136,0.15)] text-[#0D9488]'
            : 'text-gray-500 hover:text-[#0D9488] hover:bg-[rgba(13,148,136,0.08)]',
          className,
        )}
      >
        {tts.isLoading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : isPlaying
            ? <Pause className="h-3.5 w-3.5" />
            : <Play className="h-3.5 w-3.5" />
        }
      </button>
    );
  }

  const handleFallbackToBrowser = () => {
    const fallback = browserDutch[0] ?? tts.browserVoices[0];
    if (fallback) {
      tts.setSelected({ kind: 'browser', voice: fallback });
    }
    tts.clearError();
  };

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
            />
          )}
        </div>
      )}
    </div>

    {tts.error && (
      <div className="flex items-start gap-2 max-w-[360px] p-2.5 rounded-lg text-[11px] leading-snug"
        style={{ backgroundColor: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.25)' }}>
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: '#E11D48' }} />
        <div className="flex-1 text-gray-700 dark:text-foreground/90">
          <p className="font-semibold mb-0.5">Cloud-stem niet beschikbaar</p>
          <p className="text-gray-600 dark:text-muted-foreground">{tts.error}</p>
          {browserDutch.length > 0 && (
            <button
              onClick={handleFallbackToBrowser}
              className="mt-1.5 text-[11px] font-semibold underline hover:no-underline"
              style={{ color: TEAL }}
            >
              Wissel naar browser-stem
            </button>
          )}
        </div>
        <button
          onClick={tts.clearError}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-foreground flex-shrink-0"
          title="Sluiten"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )}
    </div>
  );
}

function SettingsPopover({
  tts,
  browserDutch,
}: {
  tts: ReturnType<typeof useTTS>;
  browserDutch: SpeechSynthesisVoice[];
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
                onPreview={() => previewCloudVoice(v, tts)}
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

function previewCloudVoice(voice: CloudVoice, tts: ReturnType<typeof useTTS>) {
  const sample = `Hallo, ik ben ${voice.name}. Zo klink ik wanneer ik de Bijbel voorlees.`;
  tts.setSelected({ kind: 'cloud', voice });
  setTimeout(() => tts.speak(sample), 50);
}
