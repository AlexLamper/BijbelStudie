'use client';

import { useMemo } from 'react';
import type { GrowthFloor } from '../../lib/levensboom/growth';

/**
 * The growth floor, with an identity that only changes when its numbers do.
 *
 * Every refresh of the payload hands over a new `floor` object with the same
 * two numbers. TreeCanvas treats a new `from` as a new tween, so a `from` built
 * on the raw object would restart the level-up growth the moment the refresh
 * that a level-up triggers lands.
 */
export function useStableFloor(floor: GrowthFloor | null | undefined): GrowthFloor | null {
  const from = floor?.from ?? null;
  const to = floor?.to ?? null;
  return useMemo(() => (from != null && to != null ? { from, to } : null), [from, to]);
}
