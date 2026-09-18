import { Star } from 'lucide-react';

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
 * The trust row under the hero buttons: real avatars, real average, real
 * count. The App Store has too few ratings today to average honestly, so
 * this takes its data as a prop and renders nothing until someone supplies
 * it - never a placeholder number or a stock face standing in for a review.
 */
export function ReviewsRow({ data }: { data?: ReviewsData }) {
  if (!data || data.count <= 0) return null;

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
      <div className="flex flex-col gap-[3px]">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-[15px] w-[15px]" fill="#e0a526" stroke="#e0a526" />
          ))}
          <span className="ml-1.5 text-sm font-bold" style={{ color: '#0f172a' }}>
            {data.rating.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
        </div>
        <div className="text-sm" style={{ color: '#475569' }}>
          {data.count.toLocaleString('nl-NL')} beoordelingen in de App Store
        </div>
      </div>
    </div>
  );
}
