'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { describeLevel, type GamificationSummary, type GrantResult } from '../../lib/levensboom/client';
import { stageForLevel } from '../../lib/levensboom/stages';
import type { AvatarChoice } from '../../lib/levensboom/catalog';
import type { LevensboomPayload } from '../../lib/levensboom/summary';

/**
 * The tree's state on the web, once per page load, for every surface.
 *
 * The navbar, the profile circle, the studio and the lesson card all draw the
 * same account; before this each of them fetched `/api/v1/gamification` on
 * mount. One fetch here, a short session cache so client navigations do not
 * refetch, and the same endpoint the app uses - so the two clients cannot
 * disagree about level, XP or what the reader picked.
 *
 * Local XP events are applied optimistically through [applyXp]: the action
 * endpoints already return the `GrantResult`, so the bar can move and leaves
 * can unfurl without a second round trip; a level-up triggers a refresh, since
 * it may have unlocked something only the server can confirm.
 */

const CACHE_TTL_MS = 60_000;
const CACHE_PREFIX = 'levensboom:v2:';

export type SaveResult = { ok: true } | { ok: false; error: string; label?: string };

export type LevensboomContextValue = {
  enabled: boolean;
  data: GamificationSummary | null;
  loading: boolean;
  /** Set when an XP event has just crossed a level and nothing has shown it yet. */
  celebrate: number | null;
  refresh: () => Promise<void>;
  applyXp: (grant: GrantResult | null | undefined) => void;
  dismissCelebration: () => Promise<void>;
  setPrefs: (prefs: { reducedMotion?: boolean; disabled?: boolean; timeOfDay?: string }) => Promise<void>;
  /** The studio's write. Optimistic; rolls back and reports the rule on a 403. */
  setAvatar: (patch: Partial<AvatarChoice>) => Promise<SaveResult>;
  /** Onboarding's "Planten": species plus the planted marker. */
  plant: (species: AvatarChoice['species']) => Promise<SaveResult>;
  markIntroSeen: () => Promise<void>;
  markItemsSeen: (keys: string[]) => Promise<void>;
  setPublicProfile: (value: boolean) => Promise<SaveResult>;
};

const IDLE: LevensboomContextValue = {
  enabled: false,
  data: null,
  loading: false,
  celebrate: null,
  refresh: async () => {},
  applyXp: () => {},
  dismissCelebration: async () => {},
  setPrefs: async () => {},
  setAvatar: async () => ({ ok: false, error: 'DISABLED' }),
  plant: async () => ({ ok: false, error: 'DISABLED' }),
  markIntroSeen: async () => {},
  markItemsSeen: async () => {},
  setPublicProfile: async () => ({ ok: false, error: 'DISABLED' }),
};

const LevensboomContext = createContext<LevensboomContextValue>(IDLE);

function readCache(key: string): GamificationSummary | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: GamificationSummary };
    if (!parsed?.data || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: GamificationSummary | null) {
  try {
    if (!data) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* private mode, quota: the next load simply fetches */
  }
}

async function patchLevensboom(body: Record<string, unknown>): Promise<
  { ok: true; levensboom: LevensboomPayload } | { ok: false; error: string; label?: string }
> {
  try {
    const response = await fetch('/api/v1/levensboom', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as {
      levensboom?: LevensboomPayload;
      error?: string;
      label?: string;
    };
    if (!response.ok || !json.levensboom) {
      return { ok: false, error: json.error ?? `HTTP_${response.status}`, label: json.label };
    }
    return { ok: true, levensboom: json.levensboom };
  } catch {
    return { ok: false, error: 'NETWORK' };
  }
}

export function LevensboomProvider({
  enabled,
  userKey,
  children,
}: {
  /** False when nobody is signed in: the provider then does nothing at all. */
  enabled: boolean;
  /** Something stable per account (the email), so a shared tab never shows another account's cached tree. */
  userKey?: string | null;
  children: React.ReactNode;
}) {
  const cacheKey = `${CACHE_PREFIX}${userKey ?? 'anon'}`;
  const [data, setData] = useState<GamificationSummary | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const mounted = useRef(true);
  const inflight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    if (inflight.current) return inflight.current;
    const run = (async () => {
      try {
        const response = await fetch('/api/v1/gamification');
        if (!response.ok) return;
        const next = (await response.json()) as GamificationSummary;
        if (!mounted.current) return;
        setData(next);
        writeCache(cacheKey, next);
        // A level-up earned on the phone is celebrated once here too - the
        // marker is on the account, not on the device.
        if (next.levensboom && !next.levensboom.disabled && next.level > next.levensboom.lastSeenLevel) {
          setCelebrate(next.level);
        }
      } catch {
        /* keep whatever is on screen; a failed refresh must never blank the tree */
      } finally {
        if (mounted.current) setLoading(false);
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, [enabled, cacheKey]);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      return;
    }
    const cached = readCache(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      if (cached.levensboom && !cached.levensboom.disabled && cached.level > cached.levensboom.lastSeenLevel) {
        setCelebrate(cached.level);
      }
      return;
    }
    void refresh();
  }, [enabled, cacheKey, refresh]);

  const update = useCallback(
    (fn: (current: GamificationSummary) => GamificationSummary) => {
      setData((current) => {
        if (!current) return current;
        const next = fn(current);
        writeCache(cacheKey, next);
        return next;
      });
    },
    [cacheKey],
  );

  const applyXp = useCallback(
    (grant: GrantResult | null | undefined) => {
      if (!grant || grant.awarded <= 0) return;
      update((current) => {
        const level = describeLevel(grant.xp);
        return {
          ...current,
          ...level,
          badges: Array.from(new Set([...current.badges, ...grant.newBadges])),
          levensboom: {
            ...current.levensboom,
            // Earning XP means the reader is here today, so the tree perks up.
            health: 1,
            wilting: false,
            daysSinceActive: 0,
            stage: stageForLevel(level.level),
          },
        };
      });
      if (grant.levelledUp) {
        setCelebrate(grant.level);
        // The new level may have unlocked an item; only the server knows the
        // full list, and it is cheap to ask.
        void refresh();
      }
    },
    [update, refresh],
  );

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
    update((current) => ({ ...current, levensboom: { ...current.levensboom, lastSeenLevel: level } }));
  }, [celebrate, update]);

  const setPrefs = useCallback(
    async (prefs: { reducedMotion?: boolean; disabled?: boolean; timeOfDay?: string }) => {
      update((current) => ({ ...current, levensboom: { ...current.levensboom, ...prefs } }));
      try {
        await fetch('/api/v1/gamification/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prefs),
        });
      } catch {
        /* the toggle is cosmetic; a failed write is retried by the next toggle */
      }
    },
    [update],
  );

  const applyPatch = useCallback(
    async (body: Record<string, unknown>, optimistic?: (tree: LevensboomPayload) => LevensboomPayload): Promise<SaveResult> => {
      let previous: LevensboomPayload | null = null;
      if (optimistic) {
        update((current) => {
          previous = current.levensboom;
          return { ...current, levensboom: optimistic(current.levensboom) };
        });
      }
      const result = await patchLevensboom(body);
      if (result.ok === true) {
        if (mounted.current) update((current) => ({ ...current, levensboom: result.levensboom }));
        return { ok: true };
      }
      if (mounted.current && previous) {
        const rollback = previous;
        update((current) => ({ ...current, levensboom: rollback }));
      }
      return { ok: false, error: result.error, label: result.label };
    },
    [update],
  );

  const setAvatar = useCallback(
    (patch: Partial<AvatarChoice>) =>
      applyPatch(patch, (tree) => ({
        ...tree,
        chosen: { ...tree.chosen, ...patch },
        avatar: { ...tree.avatar, ...patch },
      })),
    [applyPatch],
  );

  const plant = useCallback(
    (species: AvatarChoice['species']) =>
      applyPatch({ species, planted: true, introSeen: true }, (tree) => ({
        ...tree,
        chosen: { ...tree.chosen, species },
        avatar: { ...tree.avatar, species },
        planted: true,
        introSeen: true,
      })),
    [applyPatch],
  );

  const markIntroSeen = useCallback(async () => {
    await applyPatch({ introSeen: true }, (tree) => ({ ...tree, introSeen: true }));
  }, [applyPatch]);

  const markItemsSeen = useCallback(
    async (keys: string[]) => {
      if (keys.length === 0) return;
      await applyPatch({ seenItems: keys }, (tree) => ({
        ...tree,
        seenItems: Array.from(new Set([...tree.seenItems, ...keys])),
      }));
    },
    [applyPatch],
  );

  const setPublicProfile = useCallback(
    (value: boolean) => applyPatch({ publicProfile: value }, (tree) => ({ ...tree, publicProfile: value })),
    [applyPatch],
  );

  const value = useMemo<LevensboomContextValue>(
    () => ({
      enabled,
      data,
      loading,
      celebrate,
      refresh,
      applyXp,
      dismissCelebration,
      setPrefs,
      setAvatar,
      plant,
      markIntroSeen,
      markItemsSeen,
      setPublicProfile,
    }),
    [enabled, data, loading, celebrate, refresh, applyXp, dismissCelebration, setPrefs, setAvatar, plant, markIntroSeen, markItemsSeen, setPublicProfile],
  );

  return <LevensboomContext.Provider value={value}>{children}</LevensboomContext.Provider>;
}

export function useLevensboomContext(): LevensboomContextValue {
  return useContext(LevensboomContext);
}
