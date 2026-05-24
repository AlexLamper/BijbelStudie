'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CLOUD_VOICES, type CloudVoice } from '../lib/cloudVoices';

export type SelectedVoice =
  | { kind: 'browser'; voice: SpeechSynthesisVoice }
  | { kind: 'cloud'; voice: CloudVoice }
  | null;

export interface UseTTSReturn {
  speak: (text: string) => void;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

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

  useEffect(() => {
    let cancelled = false;
    fetchCloudConfigOnce().then(configured => {
      if (!cancelled && configured) setCloudAvailable(true);
    });
    fetchAccountVoiceOnce()
      .then(v => { if (!cancelled && v) setAccountVoiceId(v); })
      .finally(() => { if (!cancelled) setAccountChecked(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selected !== null) return;
    if (typeof window === 'undefined') return;
    if (!accountChecked) return;
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
  }, [browserVoices, cloudAvailable, selected, accountVoiceId, accountChecked]);

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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
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
    utter.onerror = () => { setIsSpeaking(false); setIsPaused(false); };
    window.speechSynthesis.speak(utter);
  }, [rate]);

  const speakCloudChunk = useCallback(async (voice: CloudVoice) => {
    if (stoppedRef.current) return;
    const text = queueRef.current[idxRef.current];
    if (!text) {
      setIsSpeaking(false);
      setIsPaused(false);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voice.id, rate }),
      });
      if (stoppedRef.current) return;
      if (!res.ok) {
        let errMsg = `Cloud-stem niet beschikbaar (${res.status})`;
        try {
          const data = await res.json();
          if (data?.hint) errMsg = data.hint;
          else if (data?.message) errMsg = data.message;
          else if (data?.error) errMsg = data.error;
        } catch { /* ignore */ }
        setError(errMsg);
        setIsSpeaking(false);
        setIsPaused(false);
        setIsLoading(false);
        return;
      }
      const blob = await res.blob();
      if (stoppedRef.current) return;
      const url = URL.createObjectURL(blob);
      objectUrlsRef.current.push(url);
      const audio = new Audio(url);
      audioRef.current = audio;
      setIsLoading(false);
      audio.onended = () => {
        if (stoppedRef.current) return;
        idxRef.current += 1;
        if (idxRef.current < queueRef.current.length) speakCloudChunk(voice);
        else { setIsSpeaking(false); setIsPaused(false); }
      };
      audio.onerror = () => { setIsSpeaking(false); setIsPaused(false); setIsLoading(false); };
      await audio.play();
    } catch {
      setIsSpeaking(false);
      setIsPaused(false);
      setIsLoading(false);
    }
  }, [rate]);

  const speak = useCallback((text: string) => {
    if (!selected) return;
    stop();
    setError(null);
    const maxLen = selected.kind === 'cloud' ? CLOUD_CHUNK : BROWSER_CHUNK;
    const chunks = chunkText(text, maxLen);
    if (chunks.length === 0) return;
    stoppedRef.current = false;
    queueRef.current = chunks;
    idxRef.current = 0;
    setIsSpeaking(true);
    setIsPaused(false);
    if (selected.kind === 'cloud') {
      speakCloudChunk(selected.voice);
    } else {
      speakBrowserChunk(selected.voice);
    }
  }, [selected, speakBrowserChunk, speakCloudChunk, stop]);

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
      audioRef.current?.play().catch(() => {});
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
