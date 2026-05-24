import { useState, useEffect, useCallback } from 'react';

export interface GeneralSettings {
  translation: string;
  commentary: string;
  ttsVoice: string;
}

const DEFAULT_SETTINGS: GeneralSettings = {
  translation: 'statenvertaling',
  commentary: 'matthew_henry_nl',
  ttsVoice: 'bram',
};

export function useGeneralSettings() {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/preferences')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.preferences) return;
        setSettings((prev) => ({
          translation: data.preferences.translation || prev.translation,
          commentary: data.preferences.commentary || prev.commentary,
          ttsVoice: data.preferences.ttsVoice || prev.ttsVoice,
        }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(async (next: Partial<GeneralSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }));
    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  }, []);

  return { settings, updateSettings, loading };
}
