'use client';

import { useEffect, useState } from 'react';
import type { LivePrices } from '../lib/pricing';

/**
 * The prices Stripe charges right now (GET /api/pricing), once per page load.
 * Null until known and on failure - a caller shows no comparison then, never
 * one computed from the constants in lib/pricing.ts.
 */
let pricesPromise: Promise<LivePrices | null> | null = null;

function fetchPrices(): Promise<LivePrices | null> {
  if (!pricesPromise) {
    pricesPromise = fetch('/api/pricing')
      .then((res) => (res.ok ? (res.json() as Promise<LivePrices>) : null))
      .catch(() => null)
      .then((prices) => {
        if (!prices) pricesPromise = null;
        return prices;
      });
  }
  return pricesPromise;
}

export function useLivePrices(): LivePrices | null {
  const [prices, setPrices] = useState<LivePrices | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchPrices().then((next) => {
      if (!cancelled) setPrices(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return prices;
}
