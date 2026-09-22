import Link from 'next/link';
import { Star } from 'lucide-react';
import type { StoreReviewSummary } from '../../lib/storeReviews';

export interface ReviewAvatar {
  src?: string;
  alt: string;
}

export interface ReviewsData {
  rating: number;
  count: number;
  avatars: ReviewAvatar[];
}

/**
 * Turn the imported App Store summary into the row's props.
 *
 * `summary.average` and `summary.count` are carried through untouched: they
 * are computed over *every* review, one-star ones included, and a displayed
 * App Store rating has to be the true one (Apple's marketing guidelines).
 * Nothing here filters, rounds up or recomputes them - /beoordelingen may
 * choose which review *cards* it shows, the number is not up for editing.
 *
 * Returns undefined when nothing has been imported yet, which is the row's
 * "render nothing" case.
 */
export function reviewsDataFromSummary(
  summary: StoreReviewSummary | null | undefined
): ReviewsData | undefined {
  if (!summary || summary.count <= 0) return undefined;

  return {
    rating: summary.average,
    count: summary.count,
    // One circle per real review, at most three. Apple publishes no reviewer
    // pictures, so they stay the anonymous silhouette below - a circle here
    // stands for a review that exists, never for a face we invented.
    avatars: Array.from({ length: Math.min(summary.count, 3) }, () => ({
      alt: 'Beoordelaar in de App Store',
    })),
  };
}

/**
 * The trust row under the hero buttons: real avatars, real average, real
 * count. It takes its data as a prop and renders nothing until someone
 * supplies it - never a placeholder number or a stock face standing in for a
 * review. The data now comes from the imported App Store reviews
 * (`reviewsDataFromSummary` above); before the first import there is still
 * nothing to show, and the row still shows nothing.
 *
 * The number links through to /beoordelingen, where the same average sits
 * above the reviews it was computed from.
 */
export function ReviewsRow({ data }: { data?: ReviewsData }) {
  if (!data || data.count <= 0) return null;

  const rating = data.rating.toLocaleString('nl-NL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <div
      className="flex w-full items-center gap-4 border-t pt-[22px]"
      style={{ borderColor: '#e6e9e7' }}
    >
      <div className="flex">
        {data.avatars.map((avatar, i) => (
          <span
            key={i}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-[2.5px]"
            style={{
              borderColor: '#fbfbf8',
              marginLeft: i === 0 ? 0 : -12,
              backgroundColor: '#e2e8f0',
            }}
          >
            {avatar.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar.src} alt={avatar.alt} className="h-full w-full object-cover" />
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#9cabb8" aria-hidden>
                <circle cx="12" cy="9" r="4.2" />
                <path d="M3.5 23c0-4.8 3.8-8 8.5-8s8.5 3.2 8.5 8z" />
              </svg>
            )}
          </span>
        ))}
      </div>
      <Link
        href="/beoordelingen"
        data-track="hero_reviews"
        aria-label={`${rating} van 5 sterren uit ${data.count.toLocaleString('nl-NL')} beoordelingen in de App Store - lees de beoordelingen`}
        className="group flex flex-col gap-[3px] no-underline"
      >
        <span className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-[15px] w-[15px]" fill="#e0a526" stroke="#e0a526" aria-hidden />
          ))}
          <span className="ml-1.5 text-sm font-bold" style={{ color: '#0f172a' }}>
            {rating}
          </span>
        </span>
        <span
          className="text-sm underline-offset-2 group-hover:underline"
          style={{ color: '#475569' }}
        >
          {data.count.toLocaleString('nl-NL')} beoordelingen in de App Store
        </span>
      </Link>
    </div>
  );
}
