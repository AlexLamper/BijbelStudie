import { useState, useEffect, useCallback } from 'react';

export interface ReadingPreferences {
  fontSize: string;
  fontFamily: string;
  lineHeight: string;
  letterSpacing: string;
  highContrast: boolean;
  showVerseNumbers: boolean;
}

const defaultPreferences: ReadingPreferences = {
  fontSize: 'base',
  // Lora. Scripture is set in the serif face and the UI in Inter - never the
  // other way round (design_handoff_web/TOKENS.md). This is only the fallback
  // for a reader with nothing stored; `/api/user/preferences` still wins, so an
  // account that has explicitly chosen "Schreefloos" keeps it.
  fontFamily: 'serif',
  lineHeight: 'relaxed',
  letterSpacing: 'normal',
  highContrast: false,
  showVerseNumbers: true,
};

export function useReadingPreferences() {
  const [preferences, setPreferences] = useState<ReadingPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (res.ok) {
          const data = await res.json();
          if (data.preferences) {
            setPreferences((prev) => ({
              ...prev,
              fontSize: data.preferences.fontSize || prev.fontSize,
              fontFamily: data.preferences.fontFamily || prev.fontFamily,
              lineHeight: data.preferences.lineHeight || prev.lineHeight,
              letterSpacing: data.preferences.letterSpacing || prev.letterSpacing,
              highContrast: data.preferences.highContrast !== undefined ? data.preferences.highContrast : prev.highContrast,
              showVerseNumbers: data.preferences.showVerseNumbers !== undefined ? data.preferences.showVerseNumbers : prev.showVerseNumbers,
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch reading preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<ReadingPreferences>) => {
    // Optimistic update
    setPreferences((prev) => ({ ...prev, ...newPreferences }));

    try {
      const res = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });

      if (!res.ok) {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save reading preferences:', error);
      // Revert on error (optional, but good practice)
    }
  }, []);

  return {
    preferences,
    loading,
    updatePreferences,
  };
}
