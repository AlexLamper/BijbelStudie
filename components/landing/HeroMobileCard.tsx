import Image from 'next/image';
import { Check } from 'lucide-react';

const SEGMENTS = ['done', 'done', 'done', 'current', 'todo', 'todo'] as const;

const SEGMENT_COLOR: Record<(typeof SEGMENTS)[number], string> = {
  done: '#0d7a66',
  current: '#7fcab5',
  todo: '#e3e8e5',
};

/**
 * Mobile replacement for the desktop browser-window composition: the real
 * screenshots are unreadable at 390px, so this shows one compact lesson
 * card instead. Decorative - the real progress lives in the app.
 */
export function HeroMobileCard() {
  return (
    <div
      aria-hidden
      className="mt-1 flex flex-col gap-3 rounded-2xl border bg-white p-3.5"
      style={{ borderColor: '#e3e8e5', boxShadow: '0 18px 36px -22px rgba(15,42,36,0.4)' }}
    >
      <div className="flex items-center gap-3">
        <Image
          src="/images/study-photos/u-K2jUGU6ttO0-sm.webp"
          alt=""
          width={48}
          height={48}
          className="flex-shrink-0 rounded-[10px] object-cover"
          style={{ width: 48, height: 48 }}
        />
        <div className="flex flex-grow flex-col gap-0.5">
          <div className="text-[15px] font-bold" style={{ color: '#0f172a' }}>Genesis</div>
          <div className="text-[12.5px]" style={{ color: '#64748b' }}>Les 8 van 50 · ± 15 min</div>
        </div>
        <span
          className="rounded-full px-[9px] py-1 text-[11px] font-bold"
          style={{ color: '#0b5f52', backgroundColor: '#e6f4f0' }}
        >
          Stap 4 van 7
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {SEGMENTS.map((s, i) => (
          <div key={i} className="h-1.5 rounded-[3px]" style={{ backgroundColor: SEGMENT_COLOR[s] }} />
        ))}
      </div>
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="flex items-center gap-1" style={{ color: '#64748b' }}>
          Lezen <Check className="h-[11px] w-[11px]" style={{ color: '#0d7a66' }} strokeWidth={3} />
        </span>
        <span className="font-bold" style={{ color: '#0f172a' }}>Nu: Verdieping</span>
      </div>
    </div>
  );
}
