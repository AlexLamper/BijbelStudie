'use client';

import React from 'react';

/**
 * The shape and the palette of a lesson page.
 *
 * ONE SET OF COMPONENTS, TWO PALETTES. design_handoff_web/TOKENS-LES.md is
 * explicit that the lesson exists in light and in dark with the same sizes and
 * the same components, and only the tokens changing. So nothing in this file is
 * a literal colour any more: every surface is one of the `les-*` names, which
 * resolve through the `--les-*` custom properties in app/globals.css - white and
 * #111827 on light, #0B1E1E and #E9F1F0 under `.dark` (what the reader's Thema
 * setting stamps on <html>) or `[data-theme="dark"]`.
 *
 * What that replaced: a hard-coded night palette built on `TILE`, `SCENE_BG` and
 * `text-white/80`, from the period when every signed-in screen in the app was a
 * landscape and a white lesson would have been the odd one out. The redesign
 * inverted that, so the lesson follows the reader again.
 *
 * WATCH THE ACCENT. `#0D9488` measures 3.1:1 on white, which is under the floor
 * for small type, so `les-accent` is `#0F766E` on light and `#2DD4BF` on dark.
 * FILLS never move: the primary button and the AI pill are `#0D9488` with white
 * on them in both themes.
 */

/**
 * The tile every marginal note, quiz card and figure sits on: `--les-card` with
 * a hairline, radius 12. It is the design's rail card, and the same plate the
 * lesson uses for a field.
 *
 * Deliberately no `backdrop-filter`. A `backdrop-filter` makes an element a
 * containing block for every `fixed` descendant, and these tiles host the shared
 * reading controls (SpeakButton, ReadingPreferencesMenu) whose menus and toasts
 * are `fixed`.
 */
export const SURFACE = 'rounded-[12px] border border-les-card-line bg-les-card';

/**
 * The heavier panel - a drawer, a dialog, the assistant.
 *
 * These stand OVER the lesson rather than in it, so unlike SURFACE they have to
 * be genuinely opaque: half of them cover a column of commentary with no scrim
 * under them, and type ghosting through a panel reads as a broken render rather
 * than as depth. So it is the lesson's own ground plus a hairline and a shadow -
 * elevation, never a second colour.
 */
export const PANEL_SOLID =
  'rounded-2xl border border-les-card-line bg-les-bg shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]';

/** The same panel with its radius dropped, for one that sets its own corners. */
export const PANEL_FLAT = PANEL_SOLID.replace('rounded-2xl ', '');

/** Hairlines and dividers. */
export const RULE = 'border-les-line';

/**
 * The passage, and anything else that is a long run of reading.
 *
 * Deliberately NOT a surface: no fill, no ring, no card. The scripture stands
 * straight on the lesson's ground, exactly the way it stands on /lezen's, and a
 * hairline plus air is what separates it from the heading above it.
 */
export const READING_SURFACE = 'border-t border-les-line pt-7';

/** One focus ring for the whole flow, in the brand fill so it reads on both grounds. */
export const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-teal';

/**
 * The dim behind a dialog, a drawer or an open menu. Neutral ink rather than
 * either ground, so one value is right in both themes.
 */
export const scrim = (alpha: number) => `rgba(17,24,39,${alpha})`;

/** Body copy and its two quieter steps down. */
export const INK = 'text-les-ink';
export const INK_MUTED = 'text-les-body';
export const INK_FAINT = 'text-les-faint';

/** The 88 px wash at the foot of a lesson column, from the theme's own token. */
export function LesFade({ height = 88 }: { height?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0"
      style={{ height, background: 'var(--les-fade)' }}
    />
  );
}

/** The step eyebrow: Inter 600 · 11 px · ls 1.4 · uppercase, in the accent. */
export function StepEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[1.4px] text-les-accent">
      {children}
    </p>
  );
}

/**
 * One note in the rail: a caps label of 10 px in the accent, then the note.
 *
 * design_handoff_web/PAGES-STUDIE-EN-LES.md §11 - the same card carries the
 * translation, the question that is coming and the highlighting hint.
 */
export function Marginal({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${SURFACE} px-4 py-[14px]`}>
      <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-les-accent">
        {label}
      </p>
      <div className={`mt-[10px] text-[12.5px] leading-[1.55] ${INK_MUTED}`}>{children}</div>
    </div>
  );
}

/**
 * A lesson page: the reading column with its own scroller and fade, and the
 * 262 px rail beside it.
 *
 * The rail becomes a stacked block below `xl`, where the step panel is already
 * taking 212 px off the left and a third column would squeeze the reading
 * measure below anything worth reading.
 */
export default function LessonLayout({
  eyebrow,
  heading,
  headingClassName = '',
  lead,
  aside,
  children,
  /** The design's measure: 640 px on most steps, 660 on the quiz. */
  measure = 640,
  /** 26 px on the reading step, 30 on the ones that open with a question. */
  padTop = 26,
}: {
  eyebrow: string;
  /** The one h1 of the screen. */
  heading: React.ReactNode;
  headingClassName?: string;
  /** An optional line directly under the heading, inside the column. */
  lead?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
  measure?: number;
  padTop?: number;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col xl:flex-row">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 pb-24 sm:px-[34px]"
          style={{ paddingTop: padTop }}
        >
          <div className="min-w-0" style={{ maxWidth: measure }}>
            <StepEyebrow>{eyebrow}</StepEyebrow>
            <h1
              className={`mt-[9px] text-[26px] font-bold leading-[1.16] tracking-[-0.5px] sm:text-[30px] ${INK} ${headingClassName}`}
            >
              {heading}
            </h1>
            {lead ? <div className={`mt-[6px] ${INK_MUTED}`}>{lead}</div> : null}
            {children}
          </div>
        </div>
        <LesFade />
      </div>

      {/* What supports the text stands beside it, never under it - until there
          is no room for a third column, and then it stacks. */}
      {aside ? (
        <aside className="flex flex-none flex-col gap-[14px] border-t border-les-line px-[22px] py-5 xl:w-[262px] xl:overflow-y-auto xl:border-t-0 xl:pb-6 xl:pt-[26px]">
          {aside}
        </aside>
      ) : null}
    </div>
  );
}
