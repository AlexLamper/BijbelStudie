'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CLOUD_VOICES, type CloudVoice } from '../lib/cloudVoices';

export type SelectedVoice =
  | { kind: 'browser'; voice: SpeechSynthesisVoice }
  | { kind: 'cloud'; voice: CloudVoice }
  | null;

/**
 * Where the voice is right now, as character offsets into the exact string that
 * was handed to `speak`.
 *
 * Offsets rather than a word index on purpose: the components that render the
 * text all chunk it differently - one verse per paragraph, one commentary entry
 * per block - and a word index only means something to whoever did the counting.
 * An offset into the string the caller passed in survives every one of those
 * layouts, because the caller is the one that built the string.
 */
export interface SpokenRange {
  start: number;
  end: number;
}

export interface UseTTSReturn {
  speak: (text: string, voiceOverride?: SelectedVoice) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  isSupported: boolean;
  spokenRange: SpokenRange | null;
  selected: SelectedVoice;
  setSelected: (v: SelectedVoice) => void;
  browserVoices: SpeechSynthesisVoice[];
  cloudVoices: CloudVoice[];
  cloudAvailable: boolean;
  rate: number;
  setRate: (r: number) => void;
  error: string | null;
  clearError: () => void;
}

const PREFERRED_VOICE_KEYWORDS = [
  'Google Nederlands',
  'Microsoft Colette',
  'Microsoft Maarten',
  'Microsoft Fenna',
  'Microsoft Frank',
  'Microsoft Hanna',
  'Xander',
  'Claire',
  'Ellen',
];

const RATE_STORAGE_KEY = 'bijbelstudie_tts_rate';
const VOICE_STORAGE_KEY = 'bijbelstudie_tts_voice_v2';
const BROWSER_CHUNK = 220;
const CLOUD_CHUNK = 4000;

/**
 * A 46-byte WAV holding one silent sample.
 *
 * Safari and iOS only let an <audio> element play if that element has already
 * started playing inside a real user gesture; the permission sticks to the
 * element, not to the page. Our MP3 only arrives several awaits after the
 * click, by which time the gesture is long gone, so the element is primed with
 * this instead - it starts and ends immediately, unlocks the element, and the
 * real audio is swapped in afterwards.
 */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==';

/**
 * Every way voorlezen can fail, in Dutch.
 *
 * All of these used to be swallowed - a bare `catch {}`, a `return` on a null
 * voice, an `onerror` that only reset the button. The reader saw a spinner flick
 * back to Play and nothing else, which is exactly the "it doesn't work" report.
 */
const ERR_VOICES_LOADING = 'De stemmen worden nog geladen. Probeer het zo nog een keer.';
const ERR_NO_VOICE =
  'Geen Nederlandse stem gevonden. Kies een stem bij de instellingen, of probeer Chrome of Edge.';
const ERR_NO_TEXT = 'Er is geen tekst gevonden om voor te lezen.';
const ERR_NETWORK = 'De voorleesdienst is niet bereikbaar. Controleer je verbinding en probeer het opnieuw.';
const ERR_BLOCKED = 'De browser blokkeerde het geluid. Tik nog een keer op voorlezen.';
const ERR_PLAYBACK = 'Het geluidsfragment kon niet worden afgespeeld.';
const ERR_EMPTY_AUDIO = 'De voorleesdienst stuurde geen audio terug.';
const ERR_BROWSER_VOICE = 'De browser-stem stopte onverwacht. Probeer een andere stem.';

// Shared across all hook instances so mounting many SpeakButtons (e.g. one per
// verse) does not fire one request per instance. Deduped to a single in-flight
// promise each.
let _cloudConfigPromise: Promise<boolean> | null = null;
let _accountVoicePromise: Promise<string | null> | null = null;

function fetchCloudConfigOnce(): Promise<boolean> {
  if (!_cloudConfigPromise) {
    _cloudConfigPromise = fetch('/api/tts')
      .then(r => (r.ok ? r.json() : null))
      .then(data => !!data?.configured)
      .catch(() => false);
  }
  return _cloudConfigPromise;
}

function fetchAccountVoiceOnce(): Promise<string | null> {
  if (!_accountVoicePromise) {
    _accountVoicePromise = fetch('/api/user/preferences')
      .then(r => (r.ok ? r.json() : null))
      .then(data => (typeof data?.preferences?.ttsVoice === 'string' ? data.preferences.ttsVoice : null))
      .catch(() => null);
  }
  return _accountVoicePromise;
}

function pickBestDutchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  for (const keyword of PREFERRED_VOICE_KEYWORDS) {
    const match = voices.find(v => v.name.toLowerCase().includes(keyword.toLowerCase()));
    if (match) return match;
  }
  const nlNL = voices.find(v => v.lang === 'nl-NL');
  if (nlNL) return nlNL;
  const nl = voices.find(v => v.lang.toLowerCase().startsWith('nl'));
  if (nl) return nl;
  return null;
}

interface Span {
  start: number;
  end: number;
}

/** One piece of the queue: what gets spoken, and where it sits in `normalized`. */
interface Chunk {
  text: string;
  normStart: number;
}

const WHITESPACE = /\s/;

/**
 * The text the engines get, plus a trail back to where every character came from.
 *
 * `map[i]` is the index in `text` of character `i` of `normalized`, and
 * `normalized` is exactly what `text.replace(/\s+/g, ' ').trim()` used to
 * produce - the engines are still handed the same string, so not a single extra
 * character is billed. The trail is what the highlight needs: the reader has to
 * see a word light up in the string the caller rendered, and that string is the
 * one with the line breaks and double spaces still in it.
 */
function normalizeWithMap(text: string): { normalized: string; map: number[] } {
  const chars: string[] = [];
  const map: number[] = [];
  // Where a run of whitespace began. It is only turned into a single space once
  // a real character follows it, which is what drops the trailing run the same
  // way `.trim()` did.
  let pendingSpaceAt = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (WHITESPACE.test(ch)) {
      if (chars.length > 0 && pendingSpaceAt === -1) pendingSpaceAt = i;
      continue;
    }
    if (pendingSpaceAt !== -1) {
      chars.push(' ');
      map.push(pendingSpaceAt);
      pendingSpaceAt = -1;
    }
    chars.push(ch);
    map.push(i);
  }

  return { normalized: chars.join(''), map };
}

/** The sentences of an already-normalised string, trimmed, as ranges. */
function sentenceRanges(normalized: string): Span[] {
  const out: Span[] = [];
  const re = /[^.!?…]+[.!?…]+|\s*[^.!?…]+$/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized)) !== null) {
    if (match[0].length === 0) { re.lastIndex += 1; continue; }
    let start = match.index;
    let end = match.index + match[0].length;
    // Only ' ' can appear here - the string is normalised - so trimming the two
    // ends is enough to reproduce the old `sentence.trim()`.
    while (start < end && normalized[start] === ' ') start += 1;
    while (end > start && normalized[end - 1] === ' ') end -= 1;
    if (end > start) out.push({ start, end });
  }
  return out;
}

/** The words inside `[from, to)` of an already-normalised string, as ranges. */
function wordRanges(normalized: string, from: number, to: number): Span[] {
  const out: Span[] = [];
  let i = from;
  while (i < to) {
    while (i < to && normalized[i] === ' ') i += 1;
    const start = i;
    while (i < to && normalized[i] !== ' ') i += 1;
    if (i > start) out.push({ start, end: i });
  }
  return out;
}

/**
 * The same chunking as before, expressed as ranges instead of strings.
 *
 * `normalized.slice(start, end)` is character for character what the previous
 * `chunkText` returned - consecutive sentences and words are separated by
 * exactly one space in a normalised string, so a run of them is a plain slice -
 * but a range also says where the chunk sits, which is what turns a boundary
 * event inside chunk 3 into an offset in the caller's own text.
 */
function chunkRanges(normalized: string, maxLen: number): Span[] {
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [{ start: 0, end: normalized.length }];

  const chunks: Span[] = [];
  let start = -1;
  let end = -1;
  const flush = () => {
    if (start !== -1) chunks.push({ start, end });
    start = -1;
    end = -1;
  };
  const take = (span: Span) => {
    if (start === -1) { start = span.start; end = span.end; }
    else { end = span.end; }
  };

  // Text the sentence pattern finds nothing in - a line of nothing but dots -
  // is one sentence, which is the same fallback the string version had.
  const sentences = sentenceRanges(normalized);
  if (sentences.length === 0) return [{ start: 0, end: normalized.length }];

  for (const sentence of sentences) {
    const fits = start === -1
      ? sentence.end - sentence.start <= maxLen
      : sentence.end - start <= maxLen;
    if (fits) { take(sentence); continue; }

    flush();
    if (sentence.end - sentence.start <= maxLen) { take(sentence); continue; }

    // A sentence longer than a whole chunk. Split it word by word; a single word
    // that is itself too long still becomes its own oversized chunk, exactly as
    // it did before, because there is nothing sensible to cut it on.
    for (const word of wordRanges(normalized, sentence.start, sentence.end)) {
      const wordFits = start === -1
        ? word.end - word.start <= maxLen
        : word.end - start <= maxLen;
      if (!wordFits) flush();
      take(word);
    }
  }
  flush();
  return chunks;
}

/**
 * The word an engine's boundary event is pointing at.
 *
 * `charLength` is only there on Chromium; Safari and Firefox leave it at 0, and
 * several engines point at the space in front of a word rather than at the word
 * itself, so both are handled by scanning rather than trusted blindly.
 */
function wordAt(text: string, charIndex: number, charLength: number): Span | null {
  const from = Math.max(0, Math.min(charIndex, text.length));
  let start = from;
  while (start < text.length && text[start] === ' ') start += 1;
  if (start >= text.length) return null;

  let end: number;
  if (charLength > 0 && start === from) {
    end = Math.min(start + charLength, text.length);
  } else {
    end = start;
    while (end < text.length && text[end] !== ' ') end += 1;
  }
  return end > start ? { start, end } : null;
}

/** Trailing quotes and brackets hide the punctuation that decides the pause. */
const TRAILING_MARKS = /["'”’»)\]]+$/;

/**
 * How long a word gets, relative to its neighbours.
 *
 * Length is the bulk of it - longer words take longer to say - and the +1 stands
 * in for the gap that follows every word. Sentence-final punctuation is weighted
 * heavily on top of that because every TTS engine draws breath there, and a
 * model that ignores those pauses runs steadily ahead of the audio.
 */
function weighWord(word: string): number {
  const bare = word.replace(TRAILING_MARKS, '');
  const last = bare.charAt(bare.length - 1);
  let weight = word.length + 1;
  if (last === '.' || last === '!' || last === '?' || last === '…' || last === ':') weight += 6;
  else if (last === ',' || last === ';') weight += 2;
  return weight;
}

interface TimedWord extends Span {
  /** Seconds into the clip at which this word is assumed to be finished. */
  until: number;
}

/**
 * An estimated word timeline for one chunk of cloud audio.
 *
 * There is no honest way to get real word timings out of the cloud voice for
 * free: Google only reports them for SSML `<mark>` elements, and it bills SSML
 * by the full length of the marked-up string, so marking every word would cost
 * roughly three times as many characters against the monthly cap. This spreads
 * the words over the clip by weight instead. It is an estimate, and it can drift
 * - most of all in a long chunk full of names the engine lingers on - but it
 * costs nothing and is rebuilt against the real `duration` of every clip, so the
 * error never carries over from one chunk to the next.
 */
function buildTimeline(text: string, duration: number): TimedWord[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const words = wordRanges(text, 0, text.length);
  if (words.length === 0) return [];

  const weights = words.map(word => weighWord(text.slice(word.start, word.end)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return [];

  let acc = 0;
  return words.map((word, i) => {
    acc += weights[i];
    return { start: word.start, end: word.end, until: (acc / total) * duration };
  });
}

/** The first word that has not finished yet at `time`. */
function wordAtTime(timeline: TimedWord[], time: number): TimedWord | null {
  if (timeline.length === 0) return null;
  let lo = 0;
  let hi = timeline.length - 1;
  let found: TimedWord | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (time < timeline[mid].until) { found = timeline[mid]; hi = mid - 1; }
    else lo = mid + 1;
  }
  // Past the end of the estimate the last word stays lit rather than the
  // highlight blinking out a moment before the audio actually stops.
  return found ?? timeline[timeline.length - 1];
}

export function useTTS(): UseTTSReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [cloudAvailable, setCloudAvailable] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selected, setSelectedState] = useState<SelectedVoice>(null);
  const [rate, setRateState] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const stored = parseFloat(window.localStorage.getItem(RATE_STORAGE_KEY) ?? '');
    return Number.isFinite(stored) && stored > 0 ? stored : 1;
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const [spokenRange, setSpokenRange] = useState<SpokenRange | null>(null);

  const queueRef = useRef<Chunk[]>([]);
  const idxRef = useRef(0);
  const stoppedRef = useRef(false);
  const objectUrlsRef = useRef<string[]>([]);
  /** Normalised index → index in the string the caller passed to `speak`. */
  const mapRef = useRef<number[]>([]);
  const timelineRef = useRef<{ chunk: Chunk; words: TimedWord[] } | null>(null);
  const rafRef = useRef<number | null>(null);

  // One element for the whole hook, deliberately not one per chunk. Reusing it
  // is what keeps the Safari unlock (see SILENT_WAV) alive across chunk 2..n:
  // those play() calls happen from an `onended` handler, nowhere near a gesture.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  /**
   * Move the highlight to `span`, which is a range inside `chunk.text`.
   *
   * Nothing is published unless the range actually changed: the cloud path asks
   * this question sixty times a second and the reader crosses a word boundary
   * perhaps three times a second, so returning the previous object lets React
   * skip the other fifty-seven renders entirely.
   */
  const markSpan = useCallback((chunk: Chunk, span: Span) => {
    const map = mapRef.current;
    const from = map[chunk.normStart + span.start];
    const to = map[chunk.normStart + span.end - 1];
    if (from === undefined || to === undefined) return;
    setSpokenRange(prev =>
      prev && prev.start === from && prev.end === to + 1 ? prev : { start: from, end: to + 1 },
    );
  }, []);

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = null;
  }, []);

  /**
   * Follow the cloud clip's own clock.
   *
   * `timeupdate` would be the obvious event to hang this on, but it only fires
   * about four times a second, which is slower than the voice speaks - the
   * highlight would visibly lag a word behind. An animation frame reads
   * `currentTime` at the refresh rate instead, costs one binary search per
   * frame, and stops on its own the moment the element is no longer playing.
   */
  const runProgressLoop = useCallback(() => {
    rafRef.current = null;
    const audio = audioRef.current;
    if (!audio || stoppedRef.current || audio.paused || audio.ended) return;
    const timeline = timelineRef.current;
    if (timeline) {
      const word = wordAtTime(timeline.words, audio.currentTime);
      if (word) markSpan(timeline.chunk, word);
    }
    rafRef.current = window.requestAnimationFrame(runProgressLoop);
  }, [markSpan]);

  const startProgressLoop = useCallback(() => {
    if (typeof window === 'undefined' || rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(runProgressLoop);
  }, [runProgressLoop]);

  /** Reset the queue and put a readable reason on screen. */
  const fail = useCallback((message: string) => {
    queueRef.current = [];
    idxRef.current = 0;
    setError(message);
    setIsSpeaking(false);
    setIsPaused(false);
    setIsLoading(false);
    setSpokenRange(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setIsSupported(true);
    const loadVoices = () => setBrowserVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const [accountVoiceId, setAccountVoiceId] = useState<string | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [configChecked, setConfigChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCloudConfigOnce()
      .then(configured => { if (!cancelled && configured) setCloudAvailable(true); })
      .finally(() => { if (!cancelled) setConfigChecked(true); });
    fetchAccountVoiceOnce()
      .then(v => { if (!cancelled && v) setAccountVoiceId(v); })
      .finally(() => { if (!cancelled) setAccountChecked(true); });
    return () => { cancelled = true; };
  }, []);

  /** Both lookups have landed, so a still-null `selected` means there is none. */
  const voicesResolved = accountChecked && configChecked;

  useEffect(() => {
    if (selected !== null) return;
    if (typeof window === 'undefined') return;
    // Waiting on the config fetch too, not just the account one: whichever
    // resolved first used to decide the voice, so a slow /api/tts GET silently
    // demoted a user with a stored cloud voice to a browser voice.
    if (!voicesResolved) return;
    const stored = window.localStorage.getItem(VOICE_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.kind === 'cloud' && parsed.id) {
          const cv = CLOUD_VOICES.find(v => v.id === parsed.id);
          if (cv && cloudAvailable) {
            setSelectedState({ kind: 'cloud', voice: cv });
            return;
          }
        }
        if (parsed.kind === 'browser' && parsed.name) {
          const bv = browserVoices.find(v => v.name === parsed.name);
          if (bv) {
            setSelectedState({ kind: 'browser', voice: bv });
            return;
          }
        }
      } catch { /* ignore */ }
    }
    if (cloudAvailable) {
      const preferred = accountVoiceId
        ? CLOUD_VOICES.find(v => v.id === accountVoiceId)
        : undefined;
      const def = preferred ?? CLOUD_VOICES.find(v => v.id === 'bram') ?? CLOUD_VOICES[0];
      setSelectedState({ kind: 'cloud', voice: def });
      return;
    }
    const browserPick = pickBestDutchVoice(browserVoices);
    if (browserPick) setSelectedState({ kind: 'browser', voice: browserPick });
  }, [browserVoices, cloudAvailable, selected, accountVoiceId, voicesResolved]);

  const setSelected = useCallback((v: SelectedVoice) => {
    setSelectedState(v);
    if (typeof window === 'undefined') return;
    if (!v) {
      window.localStorage.removeItem(VOICE_STORAGE_KEY);
      return;
    }
    if (v.kind === 'cloud') {
      window.localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify({ kind: 'cloud', id: v.voice.id }));
      fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttsVoice: v.voice.id }),
      }).catch(() => {});
    } else {
      window.localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify({ kind: 'browser', name: v.voice.name }));
    }
  }, []);

  const setRate = useCallback((r: number) => {
    setRateState(r);
    if (typeof window !== 'undefined') window.localStorage.setItem(RATE_STORAGE_KEY, String(r));
  }, []);

  const cleanupAudio = useCallback(() => {
    stopProgressLoop();
    timelineRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      // Handlers first: dropping the source runs the media load algorithm, which
      // fires `error` on some browsers, and a stray onerror would raise a failure
      // banner for audio the reader themselves just stopped.
      audio.onended = null;
      audio.onerror = null;
      audio.onplay = null;
      audio.onloadedmetadata = null;
      audio.ondurationchange = null;
      audio.pause();
      // Not `src = ''` - an empty src resolves against the page URL, so the
      // browser tries to decode the HTML document as audio. The element itself
      // is kept: it carries the gesture unlock for the next passage.
      audio.removeAttribute('src');
      audio.load();
    }
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current = [];
  }, [stopProgressLoop]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    queueRef.current = [];
    idxRef.current = 0;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    cleanupAudio();
    setIsSpeaking(false);
    setIsPaused(false);
    setIsLoading(false);
    setSpokenRange(null);
  }, [cleanupAudio]);

  const speakBrowserChunk = useCallback((voice: SpeechSynthesisVoice) => {
    if (typeof window === 'undefined' || stoppedRef.current) return;
    const chunk = queueRef.current[idxRef.current];
    if (!chunk) {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpokenRange(null);
      return;
    }
    const utter = new SpeechSynthesisUtterance(chunk.text);
    utter.lang = voice.lang || 'nl-NL';
    utter.voice = voice;
    utter.rate = rate;
    utter.pitch = 1;
    // The exact one. The browser voice tells us where it is as it goes, so this
    // path needs no estimating at all - `charIndex` counts into the string we
    // just handed it, and that string is a known slice of the caller's text.
    utter.onboundary = event => {
      // Firefox also announces sentence boundaries; only words move the mark.
      if (event.name && event.name !== 'word') return;
      const span = wordAt(chunk.text, event.charIndex, event.charLength);
      if (span) markSpan(chunk, span);
    };
    utter.onend = () => {
      if (stoppedRef.current) return;
      idxRef.current += 1;
      if (idxRef.current < queueRef.current.length) speakBrowserChunk(voice);
      else { setIsSpeaking(false); setIsPaused(false); setSpokenRange(null); }
    };
    utter.onerror = e => {
      // `interrupted`/`canceled` are what speechSynthesis.cancel() raises when
      // the reader hits stop, so those are not worth a banner.
      if (e.error === 'interrupted' || e.error === 'canceled') {
        setIsSpeaking(false);
        setIsPaused(false);
        setSpokenRange(null);
        return;
      }
      fail(ERR_BROWSER_VOICE);
    };
    window.speechSynthesis.speak(utter);
  }, [fail, markSpan, rate]);

  const speakCloudChunk = useCallback(async (voice: CloudVoice) => {
    if (stoppedRef.current) return;
    const chunk = queueRef.current[idxRef.current];
    if (!chunk) {
      setIsSpeaking(false);
      setIsPaused(false);
      setIsLoading(false);
      setSpokenRange(null);
      return;
    }

    let res: Response;
    try {
      setIsLoading(true);
      res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunk.text, voice: voice.id, rate }),
      });
    } catch {
      // Offline, DNS, blocked request. This used to land in the same bare
      // `catch {}` as everything below it and left no trace on screen.
      if (!stoppedRef.current) fail(ERR_NETWORK);
      return;
    }
    if (stoppedRef.current) return;

    if (!res.ok) {
      // The route always sends a Dutch `hint` now; Google's own English
      // `message` is deliberately no longer used as user-facing copy.
      let errMsg = `Voorlezen lukte niet (${res.status}).`;
      try {
        const data = await res.json();
        if (data?.hint) errMsg = data.hint;
        else if (data?.error) errMsg = data.error;
      } catch { /* body was not JSON - keep the status line */ }
      if (!stoppedRef.current) fail(errMsg);
      return;
    }

    let blob: Blob;
    try {
      blob = await res.blob();
    } catch {
      if (!stoppedRef.current) fail(ERR_PLAYBACK);
      return;
    }
    if (stoppedRef.current) return;
    if (blob.size === 0) {
      fail(ERR_EMPTY_AUDIO);
      return;
    }

    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.push(url);

    const audio = ensureAudio();
    audio.onended = () => {
      if (stoppedRef.current) return;
      stopProgressLoop();
      timelineRef.current = null;
      idxRef.current += 1;
      if (idxRef.current < queueRef.current.length) void speakCloudChunk(voice);
      else { setIsSpeaking(false); setIsPaused(false); setSpokenRange(null); }
    };
    audio.onerror = () => {
      if (!stoppedRef.current) fail(ERR_PLAYBACK);
    };
    // The timeline is only ever built from a duration the element has actually
    // measured, never from a guess made before the clip arrived - a guessed
    // duration would put the highlight in the wrong place from the first word
    // and stay wrong for the whole chunk. `durationchange` is listened to as
    // well because a few browsers only settle on the real length after
    // `loadedmetadata` has already fired with a rough one.
    const rebuildTimeline = () => {
      const words = buildTimeline(chunk.text, audio.duration);
      timelineRef.current = words.length > 0 ? { chunk, words } : null;
    };
    audio.onloadedmetadata = rebuildTimeline;
    audio.ondurationchange = rebuildTimeline;
    audio.onplay = startProgressLoop;
    audio.src = url;
    setIsLoading(false);

    try {
      await audio.play();
    } catch (err) {
      if (stoppedRef.current) return;
      // NotAllowedError means the autoplay policy refused us despite the primer
      // - rare, but a second tap is a fresh gesture and does work, so say so
      // rather than dying quietly.
      const blocked = err instanceof DOMException && err.name === 'NotAllowedError';
      fail(blocked ? ERR_BLOCKED : ERR_PLAYBACK);
    }
  }, [ensureAudio, fail, rate, startProgressLoop, stopProgressLoop]);

  /**
   * Start the silent primer. Must be called straight from the click handler,
   * before any await, or the gesture it depends on is already spent.
   */
  const primeAudio = useCallback(() => {
    const audio = ensureAudio();
    audio.onended = null;
    audio.onerror = null;
    // The primer would otherwise start the progress loop and hand it a duration
    // of nothing, which is the one way the highlight could get ahead of a clip
    // that has not even been fetched yet.
    audio.onplay = null;
    audio.onloadedmetadata = null;
    audio.ondurationchange = null;
    audio.src = SILENT_WAV;
    // Swapping in the MP3 aborts this play(); that rejection is expected and
    // means nothing, which is why it is the one that stays swallowed.
    void audio.play().catch(() => {});
  }, [ensureAudio]);

  /**
   * `voiceOverride` exists for the settings preview, which has to speak the row
   * it just clicked. `selected` is state, so it is still the old voice inside
   * this closure however long the caller waits.
   */
  const speak = useCallback((text: string, voiceOverride?: SelectedVoice) => {
    stop();
    setError(null);

    const voice = voiceOverride ?? selected;
    if (!voice) {
      // Voice resolution is two network round-trips deep, so a click can land
      // before it finishes. Both cases returned silently before.
      setError(voicesResolved ? ERR_NO_VOICE : ERR_VOICES_LOADING);
      return;
    }

    const maxLen = voice.kind === 'cloud' ? CLOUD_CHUNK : BROWSER_CHUNK;
    const { normalized, map } = normalizeWithMap(text);
    const ranges = chunkRanges(normalized, maxLen);
    if (ranges.length === 0) {
      // An empty getText() - usually a selector that stopped matching the DOM.
      setError(ERR_NO_TEXT);
      return;
    }

    stoppedRef.current = false;
    mapRef.current = map;
    queueRef.current = ranges.map(range => ({
      text: normalized.slice(range.start, range.end),
      normStart: range.start,
    }));
    idxRef.current = 0;
    setIsSpeaking(true);
    setIsPaused(false);
    setSpokenRange(null);
    if (voice.kind === 'cloud') {
      // Synchronous, still inside the click. Everything after this point sits
      // behind an await and no longer counts as user-initiated.
      primeAudio();
      void speakCloudChunk(voice.voice);
    } else {
      speakBrowserChunk(voice.voice);
    }
  }, [primeAudio, selected, speakBrowserChunk, speakCloudChunk, stop, voicesResolved]);

  const pause = useCallback(() => {
    if (selected?.kind === 'cloud') {
      audioRef.current?.pause();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    setIsPaused(true);
    // A word left lit while nothing is being said reads as "stuck here", so the
    // mark goes out with the sound and comes back on the first boundary or frame
    // after resume.
    setSpokenRange(null);
    stopProgressLoop();
  }, [selected, stopProgressLoop]);

  const resume = useCallback(() => {
    if (selected?.kind === 'cloud') {
      audioRef.current?.play().catch(() => setError(ERR_BLOCKED));
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    setIsPaused(false);
  }, [selected]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    speak, pause, resume, stop,
    isSpeaking, isPaused, isLoading, isSupported, spokenRange,
    selected, setSelected,
    browserVoices, cloudVoices: CLOUD_VOICES, cloudAvailable,
    rate, setRate,
    error, clearError,
  };
}
