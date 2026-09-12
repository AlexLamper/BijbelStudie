'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CloudOff, RotateCcw } from 'lucide-react';

import LessonLayout, { FOCUS_RING, INK, INK_FAINT, INK_MUTED, Marginal } from './lesson-layout';

/**
 * The recovery notice's amber, and the one place the lesson uses a colour that
 * is not a token: this is a warning, and it has to read on the white page AND
 * on the night one. #B45309 clears 4.5:1 on both, and white on it is 5.9:1 for
 * the button fill.
 */
const AMBER = '#B45309';
const AMBER_DEEP = '#B45309';
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
  eyebrow,
  passageReference,
}: {
  studyId: string;
  lessonDay: number;
  reflection: ReflectionContentProps;
  initialText: string;
  serverUpdatedAt: string | null;
  onSave: (text: string) => Promise<boolean>;
  eyebrow?: string;
  passageReference?: string;
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
      // Flush, do not merely cancel. This component unmounts on every step
      // change, and a touch swipe to the next step never blurs the textarea -
      // so cancelling the pending timer here threw away up to 1.5s of typing.
      if (timer.current) {
        clearTimeout(timer.current);
        void persist(latest.current);
      }
    };
  }, [persist]);

  return (
    <LessonLayout
      eyebrow={eyebrow ?? 'Reflectie'}
      heading={reflection.question}
      headingClassName="max-w-[30ch] sm:text-[27px] leading-[1.3] tracking-[-0.4px]"
      padTop={30}
      aside={
        <>
          {reflection.prompts && reflection.prompts.length > 0 ? (
            <Marginal label="Als je vastloopt">
              <ul className="space-y-2">
                {reflection.prompts.map((prompt, index) => (
                  <li key={index}>{prompt}</li>
                ))}
              </ul>
            </Marginal>
          ) : null}

          {passageReference ? (
            <Marginal label="Gelezen">
              <p className="tabular-nums">{passageReference}</p>
            </Marginal>
          ) : null}
        </>
      }
    >
      {recovered && (
        <div
          className="mt-5 rounded-lg border p-3 text-sm"
          style={{ borderColor: 'rgba(217,119,6,0.45)', backgroundColor: 'rgba(217,119,6,0.10)' }}
        >
          <p className={`mb-2 ${INK}`}>
            Er staat een nieuwere versie van je antwoord op dit apparaat, die niet is opgeslagen.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                handleChange(recovered.text);
                setRecovered(null);
              }}
              className={`press inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
              style={{ backgroundColor: AMBER_DEEP }}
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
              className={`rounded-md border border-les-card-line px-2.5 py-1.5 text-xs font-medium ${INK} transition-colors hover:bg-les-card ${FOCUS_RING}`}
            >
              Negeren
            </button>
          </div>
        </div>
      )}

      {/* The writing surface: the lesson's card token, 250 px tall
          (design_handoff_web/PAGES-STUDIE-EN-LES.md §13), not a hole cut in the
          ground. */}
      <label
        htmlFor="study-reflection"
        className={`mt-7 block text-[10.5px] font-semibold uppercase tracking-[1.1px] ${INK_FAINT}`}
      >
        Jouw aantekening
      </label>
      <textarea
        id="study-reflection"
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={() => void persist(latest.current)}
        maxLength={MAX_CHARS}
        placeholder={reflection.placeholder ?? 'Schrijf hier je antwoord...'}
        aria-label="Je reflectie"
        className={`mt-2 h-[250px] w-full resize-y rounded-[12px] border border-les-card-line bg-les-card px-[17px] py-[15px] text-[14.5px] leading-[1.7] text-les-ink placeholder:text-les-faint ${FOCUS_RING}`}
      />

      <div className={`mt-2 flex items-center justify-between text-[12px] ${INK_FAINT}`}>
        <span aria-live="polite">
          {saveState === 'saving' && 'Opslaan...'}
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1 text-les-accent">
              <Check size={12} /> Opgeslagen
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1" style={{ color: AMBER }}>
              <CloudOff size={12} /> Niet opgeslagen - je tekst staat nog op dit apparaat
            </span>
          )}
        </span>
        <span className="tabular-nums">
          {text.length}/{MAX_CHARS}
        </span>
      </div>

      <p className={`mt-2 max-w-[30rem] text-[12px] leading-[1.55] ${INK_MUTED}`}>
        Als je de les afrondt wordt dit bewaard als notitie, terug te vinden bij Notities.
      </p>
    </LessonLayout>
  );
}
