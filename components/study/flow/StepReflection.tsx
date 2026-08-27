'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PenLine, Check, CloudOff, RotateCcw } from 'lucide-react';

const TEAL = '#0D9488';
const AUTOSAVE_DELAY_MS = 1500;
const MAX_CHARS = 8000;

export interface ReflectionContentProps {
  question: string;
  prompts?: string[];
  placeholder?: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Where the crash buffer lives. Per lesson, so two lessons never collide. */
function mirrorKey(studyId: string, lessonDay: number) {
  return `bijbelstudie_reflection_${studyId}_${lessonDay}`;
}

interface Mirror {
  text: string;
  savedAt: number;
}

function readMirror(key: string): Mirror | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Mirror;
    return typeof parsed?.text === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Step 4. The personal question, and the answer to it.
 *
 * Two things this component is careful about, because losing someone's written
 * reflection is the worst thing this feature could do:
 *
 *  - It autosaves on a debounce AND on `visibilitychange`, so closing the tab
 *    mid-sentence still lands the text on the server.
 *  - It keeps a local mirror as a crash buffer. If that mirror turns out to be
 *    newer than what the server returned - a failed PATCH, a lost connection -
 *    it OFFERS the local copy rather than silently overwriting either version.
 */
export default function StepReflection({
  studyId,
  lessonDay,
  reflection,
  initialText,
  serverUpdatedAt,
  onSave,
}: {
  studyId: string;
  lessonDay: number;
  reflection: ReflectionContentProps;
  initialText: string;
  serverUpdatedAt: string | null;
  onSave: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(initialText);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [recovered, setRecovered] = useState<Mirror | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initialText);
  const lastSaved = useRef(initialText);

  const key = mirrorKey(studyId, lessonDay);

  // Offer the crash buffer when it is newer than what the server had.
  useEffect(() => {
    const mirror = readMirror(key);
    if (!mirror || mirror.text.trim() === initialText.trim()) return;

    const serverTime = serverUpdatedAt ? new Date(serverUpdatedAt).getTime() : 0;
    if (mirror.savedAt > serverTime) setRecovered(mirror);
  }, [key, initialText, serverUpdatedAt]);

  const persist = useCallback(
    async (value: string) => {
      if (value === lastSaved.current) return;
      setSaveState('saving');
      const ok = await onSave(value);
      if (ok) {
        lastSaved.current = value;
        setSaveState('saved');
        try {
          localStorage.removeItem(key);
        } catch {
          /* private mode - the mirror was best-effort anyway */
        }
      } else {
        setSaveState('error');
      }
    },
    [onSave, key],
  );

  const handleChange = useCallback(
    (value: string) => {
      const next = value.slice(0, MAX_CHARS);
      setText(next);
      latest.current = next;

      // Mirror first, immediately: this is the copy that survives a crash
      // between keystroke and autosave.
      try {
        localStorage.setItem(key, JSON.stringify({ text: next, savedAt: Date.now() }));
      } catch {
        /* ignore */
      }

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void persist(next), AUTOSAVE_DELAY_MS);
    },
    [key, persist],
  );

  // Closing or hiding the tab is the moment most likely to lose text.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') void persist(latest.current);
    };
    document.addEventListener('visibilitychange', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [persist]);

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex items-center gap-2 mb-3">
        <PenLine size={14} style={{ color: TEAL }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
          Reflectie
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug mb-4">
        {reflection.question}
      </h2>

      {reflection.prompts && reflection.prompts.length > 0 && (
        <ul className="mb-5 space-y-1.5">
          {reflection.prompts.map((prompt, index) => (
            <li
              key={index}
              className="flex gap-2.5 text-sm text-gray-500 dark:text-muted-foreground leading-relaxed"
            >
              <span aria-hidden className="mt-2 h-1 w-1 rounded-full flex-none bg-current opacity-50" />
              {prompt}
            </li>
          ))}
        </ul>
      )}

      {recovered && (
        <div
          className="mb-4 rounded-lg border p-3 text-sm"
          style={{ borderColor: 'rgba(217,119,6,0.35)', backgroundColor: 'rgba(217,119,6,0.07)' }}
        >
          <p className="text-foreground mb-2">
            Er staat een nieuwere versie van je antwoord op dit apparaat, die niet is opgeslagen.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                handleChange(recovered.text);
                setRecovered(null);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white"
              style={{ backgroundColor: '#D97706' }}
            >
              <RotateCcw size={12} /> Herstel die versie
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(key);
                } catch {
                  /* ignore */
                }
                setRecovered(null);
              }}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-border text-foreground"
            >
              Negeren
            </button>
          </div>
        </div>
      )}

      <textarea
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={() => void persist(latest.current)}
        rows={9}
        maxLength={MAX_CHARS}
        placeholder={reflection.placeholder ?? 'Schrijf hier je antwoord...'}
        aria-label="Je reflectie"
        className="w-full rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-4 text-[15px] leading-relaxed text-foreground resize-y focus:outline-none focus:ring-2"
        style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
      />

      <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-muted-foreground">
        <span aria-live="polite">
          {saveState === 'saving' && 'Opslaan...'}
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1" style={{ color: TEAL }}>
              <Check size={12} /> Opgeslagen
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <CloudOff size={12} /> Niet opgeslagen - je tekst staat nog op dit apparaat
            </span>
          )}
        </span>
        <span>
          {text.length}/{MAX_CHARS}
        </span>
      </div>

      <p className="mt-3 text-xs text-gray-400 dark:text-muted-foreground">
        Als je de les afrondt wordt dit bewaard als notitie, terug te vinden bij Notities.
      </p>
    </div>
  );
}
