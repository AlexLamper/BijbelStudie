import { unstable_cache } from 'next/cache';
import type { LivePrices } from './pricing';

/**
 * The prices Stripe actually charges, read from the two configured Price
 * objects - the same ids app/api/checkout uses - and cached for an hour.
 *
 * lib/stripe is imported lazily: it throws at module scope without
 * STRIPE_SECRET_KEY (see lib/billingFilters), and a page that only wants to
 * SHOW a price must not go down with it. Any failure answers null for that
 * plan, and the deal line that depends on it is simply not shown.
 */

function priceIdFor(interval: 'monthly' | 'annual'): string | undefined {
  return interval === 'annual'
    ? process.env.STRIPE_ANNUAL_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID
    : process.env.STRIPE_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
}

async function readPrices(): Promise<LivePrices> {
  const out: LivePrices = { monthly: null, annual: null };
  if (!process.env.STRIPE_SECRET_KEY) return out;
  try {
    const { default: stripe } = await import('./stripe');
    for (const interval of ['monthly', 'annual'] as const) {
      const id = priceIdFor(interval);
      if (!id) continue;
      try {
        const price = await stripe.prices.retrieve(id);
        if (typeof price.unit_amount === 'number' && price.unit_amount > 0) {
          out[interval] = { amountCents: price.unit_amount, currency: price.currency };
        }
      } catch (error) {
        console.error(`[livePricing] ${interval} price unavailable`, error);
      }
    }
  } catch (error) {
    console.error('[livePricing] Stripe unavailable', error);
  }
  return out;
}

export const getLivePrices = unstable_cache(readPrices, ['live-stripe-prices-v1'], { revalidate: 3600 });
