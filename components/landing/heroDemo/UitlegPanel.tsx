import type { CSSProperties } from 'react';
import { HD, HERO_DEMO, type PanelProps } from './shared';

/**
 * The side panel of scene `uitleg`: the explanation that sits beside the verse,
 * a miniature of the commentary column in the study flow. It arrives in reading
 * order - heading, the two paragraphs, then the verse that says the same thing
 * elsewhere - and is complete well inside the scene, so there is time to read.
 * Below `sm` the panel is short, so the second paragraph is left out.
 */
export default function UitlegPanel({ reduce }: PanelProps) {
  const { eyebrow, title, body, crossRef } = HERO_DEMO.uitleg;
  const [first, second] = body;

  const enter = (ms: number, colour: string): CSSProperties =>
    reduce ? { color: colour } : { color: colour, animationDelay: `${ms}ms` };
  const rise = reduce ? '' : 'hd-rise';

  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-hidden px-3.5 py-2.5 sm:gap-3 sm:p-4">
      <div className={`flex flex-none items-baseline gap-2 sm:block ${rise}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: HD.tealText }}>
          {eyebrow}
        </p>
        <p className="text-[13px] font-bold leading-snug sm:mt-0.5 sm:text-[14px]" style={{ color: HD.text }}>
          {title}
        </p>
      </div>

      <p className={`flex-none text-[12px] leading-[1.55] sm:text-[12.5px] ${rise}`} style={enter(150, HD.text)}>
        {first}
      </p>

      <p className={`hidden flex-none text-[12.5px] leading-[1.55] sm:block ${rise}`} style={enter(400, HD.text)}>
        {second}
      </p>

      <figure
        className={`flex-none rounded-r-lg border border-l-[3px] px-2.5 py-2 ${reduce ? '' : 'hd-pop'}`}
        style={{
          borderColor: HD.border,
          borderLeftColor: HD.teal,
          backgroundColor: HD.surface,
          ...(reduce ? null : { animationDelay: '900ms' }),
        }}
      >
        <figcaption className="text-[10.5px] font-semibold" style={{ color: HD.tealText }}>
          {crossRef.reference}
        </figcaption>
        <blockquote className="mt-0.5 font-serif text-[11.5px] leading-normal" style={{ color: HD.muted }}>
          {crossRef.text}
        </blockquote>
      </figure>
    </div>
  );
}
