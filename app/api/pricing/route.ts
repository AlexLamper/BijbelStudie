import { NextResponse } from 'next/server';
import { getLivePrices } from '../../../lib/livePricing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pricing - what Stripe charges for each plan right now, for the
 * yearly-vs-monthly comparison on /abonnement and in the Pro offer
 * (lib/pricing.ts `annualDeal`). Public: these are the prices on the page.
 */
export async function GET() {
  const prices = await getLivePrices();
  return NextResponse.json(prices, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
