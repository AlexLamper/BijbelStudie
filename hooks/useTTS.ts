'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CLOUD_VOICES, type CloudVoice } from '../lib/cloudVoices';

export type SelectedVoice =
  | { kind: 'browser'; voice: SpeechSynthesisVoice }
  | { kind: 'cloud'; voice: CloudVoice }
  | null;

export interface UseTTSReturn {
  speak: (text: string, voiceOverride?: SelectedVoice) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  isSupported: boolean;
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

function chunkText(text: string, maxLen: number): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const sentences = cleaned.match(/[^.!?…]+[.!?…]+|\s*[^.!?…]+$/g) ?? [cleaned];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const s = sentence.trim();
    if (!s) continue;
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current ? current + ' ' : '') + s;
    } else {
      if (current) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        const words = s.split(' ');
        let buf = '';
        for (const w of words) {
          if ((buf + ' ' + w).trim().length <= maxLen) {
            buf = (buf ? buf + ' ' : '') + w;
          } else {
            if (buf) chunks.push(buf);
            buf = w;
          }
        }
        current = buf;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
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

  const queueRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const stoppedRef = useRef(false);
  const objectUrlsRef = useRef<string[]>([]);

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

  /** Reset the queue and put a readable reason on screen. */
  const fail = useCallback((message: string) => {
    queueRef.current = [];
    idxRef.current = 0;
    setError(message);
    setIsSpeaking(false);
    setIsPaused(false);
    setIsLoading(false);
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
    const audio = audioRef.current;
    if (audio) {
      // Handlers first: dropping the source runs the media load algorithm, which
      // fires `error` on some browsers, and a stray onerror would raise a failure
      // banner for audio the reader themselves just stopped.
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      // Not `src = ''` - an empty src resolves against the page URL, so the
      // browser tries to decode the HTML document as audio. The element itself
      // is kept: it carries the gesture unlock for the next passage.
      audio.removeAttribute('src');
      audio.load();
    }
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current = [];
  }, []);

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
  }, [cleanupAudio]);

  const speakBrowserChunk = useCallback((voice: SpeechSynthesisVoice) => {
    if (typeof window === 'undefined' || stoppedRef.current) return;
    const text = queueRef.current[idxRef.current];
    if (!text) {
      setIsSpeaking(false);
      setIsPaused(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voice.lang || 'nl-NL';
    utter.voice = voice;
    utter.rate = rate;
    utter.pitch = 1;
    utter.onend = () => {
      if (stoppedRef.current) return;
      idxRef.current += 1;
      if (idxRef.current < queueRef.current.length) speakBrowserChunk(voice);
      else { setIsSpeaking(false); setIsPaused(false); }
    };
    utter.onerror = e => {
      // `interrupted`/`canceled` are what speechSynthesis.cancel() raises when
      // the reader hits stop, so those are not worth a banner.
      if (e.error === 'interrupted' || e.error === 'canceled') {
        setIsSpeaking(false);
        setIsPaused(false);
        return;
      }
      fail(ERR_BROWSER_VOICE);
    };
    window.speechSynthesis.speak(utter);
  }, [fail, rate]);

  const speakCloudChunk = useCallback(async (voice: CloudVoice) => {
    if (stoppedRef.current) return;
    const text = queueRef.current[idxRef.current];
    if (!text) {
      setIsSpeaking(false);
      setIsPaused(false);
      setIsLoading(false);
      return;
    }

    let res: Response;
    try {
      setIsLoading(true);
      res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voice.id, rate }),
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
      idxRef.current += 1;
      if (idxRef.current < queueRef.current.length) void speakCloudChunk(voice);
      else { setIsSpeaking(false); setIsPaused(false); }
    };
    audio.onerror = () => {
      if (!stoppedRef.current) fail(ERR_PLAYBACK);
    };
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
  }, [ensureAudio, fail, rate]);

  /**
   * Start the silent primer. Must be called straight from the click handler,
   * before any await, or the gesture it depends on is already spent.
   */
  const primeAudio = useCallback(() => {
    const audio = ensureAudio();
    audio.onended = null;
    audio.onerror = null;
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
    const chunks = chunkText(text, maxLen);
    if (chunks.length === 0) {
      // An empty getText() - usually a selector that stopped matching the DOM.
      setError(ERR_NO_TEXT);
      return;
    }

    stoppedRef.current = false;
    queueRef.current = chunks;
    idxRef.current = 0;
    setIsSpeaking(true);
    setIsPaused(false);
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
  }, [selected]);

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
    isSpeaking, isPaused, isLoading, isSupported,
    selected, setSelected,
    browserVoices, cloudVoices: CLOUD_VOICES, cloudAvailable,
    rate, setRate,
    error, clearError,
  };
}
