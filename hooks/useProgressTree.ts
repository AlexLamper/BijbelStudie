'use client';

import { useProgressTreeContext, type ProgressTreeContextValue } from '../components/providers/progress-tree-provider';

/**
 * The tree's state on the web. A thin reader of `ProgressTreeProvider`, which
 * the root layout mounts for every signed-in page - so every surface (navbar,
 * profile, studio, lesson card) shares one fetch and one optimistic state.
 */
export type { GamificationSummary, GrantResult } from '../lib/progressTree/client';
export { describeLevel, fracOf } from '../lib/progressTree/client';

export type UseProgressTree = ProgressTreeContextValue;

export function useProgressTree(): UseProgressTree {
  return useProgressTreeContext();
}
