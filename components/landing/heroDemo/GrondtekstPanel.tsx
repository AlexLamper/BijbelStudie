import { HD, HERO_DEMO, type PanelProps } from './shared';

/* The stack of components/study/OriginalText.tsx, copied rather than imported
   so the study page stays out of the landing bundle. Nothing is downloaded:
   it resolves to whatever polytonic serif the device already has. */
const GREEK_STACK =
  "'SBL Greek','GFS Didot','Cardo','Gentium Plus','Times New Roman','Noto Serif',Georgia,serif";

/* The one keyframe this panel adds: the word behind "haat" going from a plain
   card to the selected one. Only the start is spelled out, so it lands on the
   element's own (selected) styles - which is also what reduced motion shows. */
const CSS = `
@keyframes hd-grondtekst-select {
  from { border-color: transparent; background-color: transparent; }
  55% { transform: scale(1.05); }
}
@media (prefers-reduced-motion: no-preference) {
  .hd-grondtekst-select { animation: hd-grondtekst-select 380ms cubic-bezier(0.16, 1, 0.3, 1) 550ms both; }
}
`;

/** Below `sm` the panel is short: two rows of three, the rest is left out. */
const SHORT_COUNT = 6;

/**
 * The side panel of the `grondtekst` scene: the Greek behind the verse, word
 * for word.
 *
 * A miniature of the word-for-word row of the Grondtekst tab on the study page
 * (`WordCard` in components/study/OriginalText.tsx) and nothing more: per word
 * the Greek as it stands in the verse, its transliteration, the gloss and the
 * Strong number. The glosses are English because the product's are - this
 * shows the tab as it is, not a Dutch lexicon it does not have. The card of
 * the word behind "haat" becomes the selected one shortly after the row is in.
 *
 * No timers: every entrance is a CSS animation that runs from mount, and all
 * of them are left off under reduced motion, which leaves the finished panel.
 * Every line has a fixed line height and stays on one line, so the panel is
 * the same height whichever Greek font the device picks.
 */
export default function GrondtekstPanel({ reduce }: PanelProps) {
  const { eyebrow, language, tokens, focus, hint } = HERO_DEMO.grondtekst;
  const rise = reduce ? '' : 'hd-rise';
  const delay = (ms: number) => (reduce ? undefined : { animationDelay: `${ms}ms` });

  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-hidden px-3.5 py-2.5 sm:gap-3 sm:p-4">
      <style>{CSS}</style>

      <div className={`flex flex-none items-start justify-between gap-2 ${rise}`}>
        <div className="flex min-w-0 items-baseline gap-2 sm:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: HD.tealText }}>
            {eyebrow}
          </p>
          <p className="text-[13px] font-bold leading-snug sm:mt-0.5 sm:text-[14px]" style={{ color: HD.text }}>
            {HERO_DEMO.reference}
          </p>
        </div>
        <span
          className="flex-none rounded-md border px-1.5 text-[10px] font-medium leading-4 sm:px-2 sm:py-1 sm:text-[11px]"
          style={{ borderColor: HD.border, color: HD.muted }}
        >
          {language}
        </span>
      </div>

      {/* The words of the verse, in reading order. */}
      <ol className="grid flex-none grid-cols-3 gap-1.5">
        {tokens.map((token, index) => {
          const selected = index === focus;
          return (
            <li
              key={index}
              className={`min-w-0 ${index >= SHORT_COUNT ? 'hidden sm:block' : ''} ${rise}`}
              style={delay(index * 50)}
            >
              <div
                className={`flex flex-col items-center rounded-lg border px-1 py-1 text-center ${
                  selected && !reduce ? 'hd-grondtekst-select' : ''
                }`}
                style={
                  selected
                    ? { borderColor: HD.teal, backgroundColor: HD.surface }
                    : { borderColor: 'transparent' }
                }
              >
                <span
                  lang="el"
                  className="whitespace-nowrap text-[16px] font-medium leading-5 sm:text-[17px] sm:leading-[22px]"
                  style={{ fontFamily: GREEK_STACK, color: HD.text }}
                >
                  {token.word}
                </span>
                <span className="whitespace-nowrap text-[10px] italic leading-3" style={{ color: HD.muted }}>
                  {token.translit}
                </span>
                <span className="whitespace-nowrap text-[11px] leading-[14px]" style={{ color: HD.text }}>
                  {token.gloss}
                </span>
                <span
                  className="mt-1 rounded px-1.5 text-[10px] font-semibold leading-4 tabular-nums"
                  style={{ backgroundColor: HD.tealLight, color: HD.tealDeep }}
                >
                  {token.strong}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <p className={`flex-none text-[10.5px] leading-4 ${rise}`} style={{ color: HD.muted, ...delay(800) }}>
        {hint}
      </p>
    </div>
  );
}
