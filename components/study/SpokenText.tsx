'use client';

import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';

import type { SpokenRange } from '../../hooks/useTTS';

/**
 * What a SpeakButton broadcasts while it reads: the exact string it handed to
 * the voice, and where in that string the voice is at this moment.
 *
 * The string travels with the offsets because the components that render the
 * text never see it. One button reads a single verse, another reads the whole
 * chapter, a third scrapes the page - so an offset on its own is meaningless
 * until you know which string it counts into, and a fragment can only find
 * itself by looking for its own text inside that string.
 */
type Publication = { text: string; start: number; end: number } | null;

interface SpokenTextStore {
  get(): Publication;
  subscribe(listener: (value: Publication) => void): () => void;
  publish(ownerId: string, value: Publication): void;
}

/**
 * A deliberate step outside React state.
 *
 * The voice moves to a new word two or three times a second. Holding that
 * position in context state would re-render every verse of the chapter on every
 * word, so it lives in a mutable store and each rendered fragment subscribes for
 * itself. A fragment only calls setState when *its own* slice changes, which is
 * the verse being left and the verse being entered - not the other twenty-eight.
 */
function createSpokenTextStore(): SpokenTextStore {
  let current: Publication = null;
  let owner: string | null = null;
  const listeners = new Set<(value: Publication) => void>();

  return {
    get: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    publish(ownerId, value) {
      // Every verse carries its own hover button, so two of them can be mid
      // passage at once. The last one to start reading owns the highlight, and
      // an older one going quiet is not allowed to clear it out from under it.
      if (value === null && owner !== null && owner !== ownerId) return;
      owner = value === null ? null : ownerId;
      current = value;
      for (const listener of listeners) listener(value);
    },
  };
}

const SpokenTextStoreContext = createContext<SpokenTextStore | null>(null);

/**
 * The area in which a reading and the text it reads can find each other.
 *
 * Nested scopes are a no-op on purpose. `PassageReader` opens one so its own
 * per-verse buttons work wherever it is used, but inside the study flow the
 * button that reads the whole passage sits in `StepWord`'s header, outside the
 * reader - if the reader opened a second store there, that button would publish
 * into one store while the verses listened to another and nothing would light up.
 */
export function SpokenTextScope({ children }: { children: React.ReactNode }) {
  const inherited = useContext(SpokenTextStoreContext);
  const own = useRef<SpokenTextStore | null>(null);
  if (!own.current) own.current = createSpokenTextStore();
  if (inherited) return <>{children}</>;
  return (
    <SpokenTextStoreContext.Provider value={own.current}>
      {children}
    </SpokenTextStoreContext.Provider>
  );
}

/**
 * Announce where the voice is. Called by SpeakButton with the text it read out
 * and the range the hook reports, or with nulls when it falls silent.
 */
export function useSpokenTextPublisher(): (text: string | null, range: SpokenRange | null) => void {
  const store = useContext(SpokenTextStoreContext);
  const ownerId = useId();
  return useCallback((text: string | null, range: SpokenRange | null) => {
    if (!store) return;
    store.publish(ownerId, text && range ? { text, start: range.start, end: range.end } : null);
  }, [store, ownerId]);
}

/** Every place `needle` occurs in `haystack`, up to a sane ceiling. */
function occurrencesOf(haystack: string, needle: string): number[] {
  const hits: number[] = [];
  let from = 0;
  while (hits.length < 32) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    hits.push(at);
    from = at + needle.length;
  }
  return hits;
}

/**
 * Where the voice is inside `text`, in offsets local to `text` - or null when it
 * is somewhere else entirely, or not reading at all.
 *
 * Fragments locate themselves by searching, rather than being told, because the
 * caller of `speak` is free to build its string however it likes: joined verses,
 * commentary entries with a "Vers 4." label in front of them, or text scraped
 * back out of the DOM. Searching copes with all three; being told would mean
 * every one of those callers had to hand out an offset table as well.
 */
export function useSpokenLocalRange(text: string): SpokenRange | null {
  const store = useContext(SpokenTextStoreContext);
  const [local, setLocal] = useState<SpokenRange | null>(null);

  useEffect(() => {
    if (!store) return;

    // The rendered string may still carry whitespace the spoken one collapsed,
    // so the search runs on the trimmed body and `lead` puts the answer back.
    const needle = text.trim();
    const lead = needle ? text.indexOf(needle) : 0;

    // Worked out once per reading instead of once per word: which passage is
    // being read only changes when a new one starts.
    let anchoredTo: string | null = null;
    let anchors: number[] = [];

    const resolve = (value: Publication): SpokenRange | null => {
      if (!value || !needle) return null;
      if (anchoredTo !== value.text) {
        anchoredTo = value.text;
        anchors = occurrencesOf(value.text, needle);
      }
      if (anchors.length === 0) return null;
      // A short verse can appear twice in one chapter, so the copy the voice is
      // actually inside wins over the first one that happens to match.
      const anchor =
        anchors.find(at => value.start >= at && value.start < at + needle.length) ?? anchors[0];
      const start = value.start - anchor + lead;
      const end = value.end - anchor + lead;
      if (end <= start || end <= 0 || start >= text.length) return null;
      return { start: Math.max(0, start), end: Math.min(text.length, end) };
    };

    const apply = (value: Publication) => {
      const next = resolve(value);
      // The same word as last time means no state change, so no render either.
      setLocal(prev => (prev?.start === next?.start && prev?.end === next?.end ? prev : next));
    };

    apply(store.get());
    return store.subscribe(apply);
  }, [store, text]);

  return local;
}

/**
 * The wash itself: teal at low opacity, a little stronger in the dark theme
 * where the same alpha disappears into the background. Deliberately a tint and
 * not a solid fill - the word underneath has to stay as readable as the rest of
 * the sentence, since it is the one the reader is looking at.
 */
const MARK_CLASS =
  'rounded-[3px] box-decoration-clone bg-[rgba(13,148,136,0.18)] dark:bg-[rgba(13,148,136,0.34)] ' +
  'motion-safe:transition-colors motion-safe:duration-150';

/**
 * The padding gives the wash room around the word and the matching negative
 * margin takes that room straight back, so the line does not shuffle sideways
 * every time the mark moves on - in justified verse text that jitter is worse
 * than no highlight at all.
 */
const MARK_STYLE: React.CSSProperties = {
  color: 'inherit',
  padding: '0.05em 0.2em',
  margin: '0 -0.2em',
};

/**
 * Text that lights up word by word while it is being read aloud.
 *
 * A plain `<span>` rather than a `<mark>`: the mark moves several times a
 * second, and `<mark>` makes a screen reader announce a highlight boundary each
 * time, which is a great deal of noise for something purely visual.
 */
export function SpokenText({ text }: { text: string }) {
  const range = useSpokenLocalRange(text);
  if (!range) return <>{text}</>;
  return (
    <>
      {text.slice(0, range.start)}
      <span className={MARK_CLASS} style={MARK_STYLE}>{text.slice(range.start, range.end)}</span>
      {text.slice(range.end)}
    </>
  );
}
