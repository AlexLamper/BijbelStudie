'use client';

import { useEffect, useState } from 'react';
import { HD, HERO_DEMO, type VersePaneProps } from './shared';

/** How long the verse sits untouched before the marker lands on the word. */
const MARK_BEAT = 700;

const MARKER = `linear-gradient(${HD.tealLight}, ${HD.tealLight})`;
const VERSE_TINT = `color-mix(in srgb, ${HD.teal} 7%, transparent)`;

/* The word has two states only, plain and marked: nothing in the product opens
   per word, so it never looks tapped. `sweep` runs the marker animation, and is
   set only where the mark appears (scene `verse`); elsewhere the mark is simply
   there, so a scene change never sweeps it again. */
function HardWord({ marked, sweep }: { marked: boolean; sweep: boolean }) {
  return (
    <span
      className={`-mx-[3px] whitespace-nowrap rounded-[3px] px-[3px] underline decoration-dotted decoration-[1.5px] underline-offset-[3px] motion-safe:transition-[text-decoration-color] motion-safe:duration-200 ${marked && sweep ? 'hd-mark' : ''}`}
      style={{
        backgroundImage: marked ? MARKER : undefined,
        color: HD.text,
        textDecorationColor: marked ? HD.teal : 'transparent',
      }}
    >
      {HERO_DEMO.hardWord}
    </span>
  );
}

/**
 * The passage column of the hero demo: Lukas 14:25-27 set the way the reader
 * sets a chapter, in miniature.
 *
 * It stays mounted from `verse` through `ai`. The one hard word is marked
 * after a beat in `verse` and stays marked from then on. The verse carries the
 * selection: it gets the tint and the teal edge while the explanation or the
 * Greek is open, because both open per verse, not per word. Coming back to
 * `verse` plays the beat again. Below `sm` the pane is a short strip above the
 * panel, so only the focus verse is shown there.
 */
export default function VersePane({ scene, reduce }: VersePaneProps) {
  const [beat, setBeat] = useState(false);

  useEffect(() => {
    if (scene !== 'verse') {
      setBeat(false);
      return;
    }
    if (beat || reduce) return;
    const id = window.setTimeout(() => setBeat(true), MARK_BEAT);
    return () => window.clearTimeout(id);
  }, [scene, beat, reduce]);

  const marked = scene !== 'verse' || beat || reduce;
  const sweep = scene === 'verse' && !reduce;
  const selected = scene === 'uitleg' || scene === 'grondtekst';

  return (
    <div className="flex h-full w-full flex-col overflow-hidden px-3.5 py-2.5 sm:p-5">
      <div className="flex flex-none items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[12px] font-bold leading-[18px] sm:text-[15px] sm:leading-tight" style={{ color: HD.text }}>
          {HERO_DEMO.book} {HERO_DEMO.chapter}
        </p>
        <span
          className="flex-none rounded-md border px-1.5 text-[10px] font-medium leading-4 sm:px-2 sm:py-1 sm:text-[11px]"
          style={{ borderColor: HD.border, color: HD.muted }}
        >
          {HERO_DEMO.translation}
        </span>
      </div>

      <div className="mt-1.5 flex min-h-0 flex-1 flex-col gap-1 font-serif text-[12.5px] leading-[1.45] sm:mt-4 sm:text-[13.5px] sm:leading-[1.65]">
        {HERO_DEMO.verses.map((verse) => {
          const focus = verse.n === HERO_DEMO.focusVerse;
          const at = focus ? verse.text.indexOf(HERO_DEMO.hardWord) : -1;
          return (
            <p
              key={verse.n}
              className={`-mx-2 rounded-[4px] px-2 sm:py-1 motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 ${focus ? '' : 'hidden sm:block'}`}
              style={{
                color: focus ? HD.text : HD.muted,
                backgroundColor: focus && selected ? VERSE_TINT : 'transparent',
                boxShadow: `inset 2px 0 0 0 ${focus && selected ? HD.teal : 'transparent'}`,
              }}
            >
              <sup className="mr-1 font-sans text-[10px] font-semibold" style={{ color: focus ? HD.tealText : HD.faint }}>
                {verse.n}
              </sup>
              {at < 0 ? (
                verse.text
              ) : (
                <>
                  {verse.text.slice(0, at)}
                  <HardWord marked={marked} sweep={sweep} />
                  {verse.text.slice(at + HERO_DEMO.hardWord.length)}
                </>
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}
