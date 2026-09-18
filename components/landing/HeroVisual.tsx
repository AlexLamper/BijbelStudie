import Image from 'next/image';

/** The 30px browser chrome shared by both frames. */
function BrowserBar() {
  return (
    <div
      className="flex h-[30px] items-center gap-3 border-b px-3"
      style={{ backgroundColor: '#f4f6f5', borderColor: '#e6ebe9' }}
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: '#d5dbd8' }} />
        ))}
      </div>
      <div className="rounded-md bg-white px-2.5 py-[3px] text-[11px]" style={{ color: '#64748b' }}>
        bijbelstudie.io
      </div>
    </div>
  );
}

function BrowserFrame({
  src,
  alt,
  width,
  height,
  style,
  priority,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  style: React.CSSProperties;
  priority?: boolean;
}) {
  return (
    <div
      className="absolute overflow-hidden rounded-[14px] border bg-white"
      style={{
        ...style,
        width,
        borderColor: '#dfe5e2',
        boxShadow: '0 30px 60px -26px rgba(15,42,36,0.35)',
      }}
    >
      <BrowserBar />
      <Image
        src={src}
        alt={alt}
        width={width * 2}
        height={height * 2}
        style={{ width, height: 'auto', display: 'block' }}
        priority={priority}
        sizes={`${width}px`}
      />
    </div>
  );
}

type LessonStep = { label: string; status: 'done' | 'current' | 'todo' };

const LESSON_STEPS: LessonStep[] = [
  { label: 'Inleiding', status: 'done' },
  { label: 'Bijbelse context', status: 'done' },
  { label: 'Het Woord lezen', status: 'done' },
  { label: 'Verdieping', status: 'current' },
  { label: 'Toetsing', status: 'todo' },
  { label: 'Reflectie', status: 'todo' },
  { label: 'Gebed', status: 'todo' },
];

function StepRow({ label, status }: LessonStep) {
  if (status === 'done') {
    return (
      <div className="flex items-center gap-2.5 text-[13px] font-medium" style={{ color: '#334155' }}>
        <span
          className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: '#0d7a66' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-10" />
          </svg>
        </span>
        <span>{label}</span>
      </div>
    );
  }
  if (status === 'current') {
    return (
      <div className="flex items-center gap-2.5 text-[13px] font-bold" style={{ color: '#0f172a' }}>
        <span
          className="h-[18px] w-[18px] flex-shrink-0 rounded-full bg-white"
          style={{ border: '3px solid #0d7a66', boxSizing: 'border-box' }}
        />
        <span>{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 text-[13px] font-medium" style={{ color: '#64748b' }}>
      <span
        className="h-[18px] w-[18px] flex-shrink-0 rounded-full"
        style={{ border: '2px solid #cbd5d1', boxSizing: 'border-box' }}
      />
      <span>{label}</span>
    </div>
  );
}

/** The floating "Les van vandaag" card. Decorative: the real progress lives in the app. */
function LessonCard() {
  return (
    <div
      aria-hidden
      className="absolute flex flex-col gap-2.5 rounded-2xl border bg-white p-4"
      style={{
        left: 470,
        top: 36,
        width: 210,
        borderColor: '#e3e8e5',
        boxShadow: '0 24px 48px -20px rgba(15,42,36,0.4)',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10.5px] font-bold uppercase"
          style={{ letterSpacing: '0.08em', color: '#64748b' }}
        >
          Les van vandaag
        </span>
        <span className="text-[11px] font-semibold" style={{ color: '#64748b' }}>
          ± 15 min
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {LESSON_STEPS.map((step) => (
          <StepRow key={step.label} {...step} />
        ))}
      </div>
    </div>
  );
}

/**
 * The right side of the desktop/tablet hero: two overlapping browser-window
 * screenshots plus the floating lesson card, in a fixed 700x600 box that the
 * caller scales down between 1024 and 1279px so the composition keeps its
 * proportions instead of reflowing.
 */
export function HeroVisual() {
  return (
    <div className="relative" style={{ width: 790, height: 600 }}>
      <BrowserFrame
        src="/images/hero/screenshot-studies-overzicht.png"
        alt="Het studie-overzicht van BijbelStudie met 76 studies"
        width={640}
        height={333}
        style={{ left: 150, top: 0 }}
        priority
      />
      <BrowserFrame
        src="/images/hero/screenshot-lezer-commentaar.png"
        alt="Genesis 7 in de Statenvertaling met het commentaar van Matthew Henry ernaast"
        width={620}
        height={322}
        style={{ left: 0, top: 196 }}
        priority
      />
      <LessonCard />
    </div>
  );
}
