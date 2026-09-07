'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LevensboomPayload } from '../lib/levensboom/summary';

/**
 * The tree's state on the web, straight from `GET /api/v1/gamification`.
 *
 * The same endpoint the app uses, so the two cannot disagree about level, XP or
 * health. Local XP events are applied optimistically through [applyXp] - the
 * action endpoints already return the `GrantResult`, so the bar can move and
 * leaves can unfurl without a second round trip; the next fetch reconciles.
 */

export type GamificationSummary = {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercentage: number;
  badges: string[];
  streak: number;
  freezes: number;
  lessonsCompleted: number;
  studiesCompleted: number;
  plansCompleted: number;
  plansActive: number;
  levensboom: LevensboomPayload;
  xpTable: { event: string; value: number; label: string }[];
};

export type GrantResult = {
  xp: number;
  level: number;
  levelledUp: boolean;
  awarded: number;
  newBadges: string[];
};

/** Mirrors lib/gamification.ts. Duplicated rather than imported: this file is a
 * client component and the lib module pulls in Mongoose. */
function xpForLevel(level: number): number {
  return level <= 1 ? 0 : 50 * (level - 1) * level;
}

function levelForXp(xp: number): number {
  let level = 1;
  while (level < 200 && xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

export function describeLevel(xp: number) {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const span = Math.max(1, ceiling - floor);
  return {
    xp,
    level,
    xpIntoLevel: xp - floor,
    xpForNextLevel: ceiling - floor,
    progressPercentage: Math.min(100, Math.round(((xp - floor) / span) * 100)),
  };
}

export type UseLevensboom = {
  data: GamificationSummary | null;
  loading: boolean;
  /** Set when an XP event has just crossed a level and nothing has shown it yet. */
  celebrate: number | null;
  refresh: () => Promise<void>;
  applyXp: (grant: GrantResult | null | undefined) => void;
  dismissCelebration: () => Promise<void>;
  setPrefs: (prefs: { reducedMotion?: boolean; disabled?: boolean }) => Promise<void>;
};

export function useLevensboom(): UseLevensboom {
  const [data, setData] = useState<GamificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/gamification');
      if (!response.ok) return;
      const next = (await response.json()) as GamificationSummary;
      if (!mounted.current) return;
      setData(next);
      // A level-up earned on the phone is celebrated once here too - the marker
      // is on the account, not on the device.
      if (next.levensboom && next.level > next.levensboom.lastSeenLevel) {
        setCelebrate(next.level);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyXp = useCallback((grant: GrantResult | null | undefined) => {
    if (!grant || grant.awarded <= 0) return;
    setData((current) => (current ? { ...current, ...describeLevel(grant.xp) } : current));
    if (grant.levelledUp) setCelebrate(grant.level);
  }, []);

  const dismissCelebration = useCallback(async () => {
    const level = celebrate;
    setCelebrate(null);
    if (level == null) return;
    try {
      await fetch('/api/v1/gamification/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });
    } catch {
      // Worst case the celebration shows once more on the next load; losing the
      // marker must never block dismissing the dialog.
    }
    setData((current) =>
      current ? { ...current, levensboom: { ...current.levensboom, lastSeenLevel: level } } : current,
    );
  }, [celebrate]);

  const setPrefs = useCallback(async (prefs: { reducedMotion?: boolean; disabled?: boolean }) => {
    setData((current) =>
      current ? { ...current, levensboom: { ...current.levensboom, ...prefs } } : current,
    );
    try {
      await fetch('/api/v1/gamification/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
    } catch {
      /* the toggle is cosmetic; a failed write is retried by the next toggle */
    }
  }, []);

  return { data, loading, celebrate, refresh, applyXp, dismissCelebration, setPrefs };
}
