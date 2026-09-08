'use client';

import { useLevensboomContext, type LevensboomContextValue } from '../components/providers/levensboom-provider';

/**
 * The tree's state on the web. A thin reader of `LevensboomProvider`, which
 * the root layout mounts for every signed-in page - so every surface (navbar,
 * profile, studio, lesson card) shares one fetch and one optimistic state.
 */
export type { GamificationSummary, GrantResult } from '../lib/levensboom/client';
export { describeLevel, fracOf } from '../lib/levensboom/client';

export type UseLevensboom = LevensboomContextValue;

export function useLevensboom(): UseLevensboom {
  return useLevensboomContext();
}
