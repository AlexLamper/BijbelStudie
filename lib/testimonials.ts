import Feedback from '../models/Feedback';
import connectMongoDB from './mongodb';

/**
 * The published web testimonials: what readers wrote on the site, as opposed to
 * what they wrote in the App Store (`lib/storeReviews.ts`).
 *
 * This is a read API and nothing else. Both halves of the write path already
 * exist elsewhere and are deliberately not touched here:
 *  - a reader who rates a finished study 4 or 5 AND writes a note may tick a
 *    consent box, which `resolvePublishConsent` in `lib/feedbackPrompts.ts`
 *    re-validates server-side (`mayPublish`, `displayName`);
 *  - an admin then publishes it by hand from /beheer/feedback, which sets
 *    `publishedAt`. Nothing publishes itself, and clearing `publishedAt` takes
 *    the quote down again.
 *
 * Two rules this file exists to hold:
 *
 * 1. BOTH flags are required. `mayPublish` is the reader's consent and
 *    `publishedAt` is the admin's decision; neither on its own may put a word
 *    on the site. The filter is never relaxed to just one of them.
 * 2. `name` is null when `displayName` is empty, and there is no fallback.
 *    A reader who agreed to be quoted did not thereby agree to be named, so the
 *    account name, the email and an initial are all off limits. Empty means the
 *    quote runs without a credit.
 *
 * Shaped like the read API at the bottom of `lib/storeReviews.ts`: it connects
 * itself, swallows failure and returns [] so a widget can never 500 the page it
 * sits on, and keeps a small in-process cache in front of the query because per
 * request CPU is a standing constraint on this project.
 */

export type PublicTestimonial = {
  id: string;
  quote: string;
  /** Null means "no credit", never "Anoniem" - see rule 2 above. */
  name: string | null;
  rating: number;
  publishedAt: string;
};

/**
 * The publishable query, exported so the one thing that must never drift is
 * asserted in a test rather than re-typed at each call site.
 */
export const PUBLISHED_TESTIMONIAL_FILTER = {
  publishedAt: { $ne: null },
  mayPublish: true,
};

/**
 * Only the four fields the cards render. A Feedback document carries the
 * author's name and email, the reply thread, the triage notes and the whole
 * analytics context; none of that belongs in a public read, and pulling the
 * documents whole would drag it through memory on every render.
 */
const PUBLIC_FIELDS = { message: 1, displayName: 1, rating: 1, publishedAt: 1 };

/** Matches `lib/storeReviews.ts`: not correctness, just CPU. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

export function clearTestimonialCache(): void {
  cache.clear();
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** A row as the projection above returns it. Exported for the mapper's tests. */
export type TestimonialRow = {
  _id: unknown;
  message?: string | null;
  displayName?: string | null;
  rating?: number | null;
  publishedAt?: Date | string | null;
};

/**
 * Row to card. Exported so the mapping rules can be tested without a database.
 *
 * Returns null for a row that cannot be rendered honestly:
 *  - no quote text, which the consent rules already prevent (a bare 5 is a
 *    score, not a testimonial) but which would otherwise render an empty card;
 *  - no usable 1-5 rating, because the card draws stars and a missing rating
 *    must not become a zero or a guess.
 * Dropping the row is the only option that invents nothing.
 */
export function toPublicTestimonial(row: TestimonialRow): PublicTestimonial | null {
  const quote = typeof row.message === 'string' ? row.message.trim() : '';
  if (!quote) return null;

  const rating = Math.round(Number(row.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;

  const publishedAt = new Date(row.publishedAt ?? 0);
  if (Number.isNaN(publishedAt.getTime())) return null;

  // The one mapping this module exists for. No `|| name`, no initial.
  const displayName = typeof row.displayName === 'string' ? row.displayName.trim() : '';

  return {
    id: String(row._id),
    quote,
    name: displayName === '' ? null : displayName,
    rating,
    publishedAt: publishedAt.toISOString(),
  };
}

/**
 * The published testimonials, newest first.
 *
 * Never throws: an unreachable database degrades to an empty section, which the
 * page renders as nothing at all rather than a second "nog niets hier" card.
 */
export async function getPublicTestimonials(
  opts: { limit?: number } = {},
): Promise<PublicTestimonial[]> {
  const limit = Math.min(50, Math.max(1, Math.round(opts.limit ?? 12)));

  return cached(`list:${limit}`, async () => {
    try {
      const connection = await connectMongoDB();
      if (!connection) return [];

      const rows = (await Feedback.find(PUBLISHED_TESTIMONIAL_FILTER, PUBLIC_FIELDS)
        .sort({ publishedAt: -1 })
        .limit(limit)
        .lean()) as unknown as TestimonialRow[];

      return rows
        .map(toPublicTestimonial)
        .filter((testimonial): testimonial is PublicTestimonial => testimonial !== null);
    } catch (error) {
      console.error('[testimonials] list failed:', error);
      return [];
    }
  });
}
