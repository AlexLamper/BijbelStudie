'use client';

import React from 'react';

import { EYEBROW, PANEL_DEEP, TEAL_ON_DARK, TILE } from '../../scene/tokens';

/**
 * The shape of a lesson page, taken from the versie-b design candidate.
 *
 * Ontwerp B put a numbered step register in the left margin, a reading column of
 * about 64 characters beside it, and everything that SUPPORTS the text - the
 * leeswijzer, the translation, the word list, the question that is coming - in a
 * margin NEXT to the column rather than stacked underneath it. That is the whole
 * borrowing: the column structure, the margin, the proportions, the rhythm. None
 * of its palette came with it.
 *
 * The palette is the scene's, because this window now stands in the same world
 * as /dashboard rather than answering the reader's light/dark setting. A lesson
 * that was a white page in light mode and a grey one in dark mode was the one
 * screen in the product that had not joined the redesign.
 *
 * WHY THE SCRIPTURE IS STILL A LIGHT PLATE. See `PLATE` in
 * components/scene/tokens.ts: a light plate is how the scene carries something
 * that has to be read for twenty minutes, and it is the only surface on which
 * the pale verse highlights, the note popover and the per-verse controls - all
 * drawn for white paper - keep working. So the window is night and the passage
 * is the one lit object in it. Everything else here is a panel on that night.
 */

/**
 * The tile every marginal note sits on: `TILE`, minus its `backdrop-blur-md`.
 *
 * Nothing is behind these tiles to blur - the window is a flat ground, not a
 * photograph - and a `backdrop-filter` would make every one of them a
 * containing block for the `fixed` menus and toasts that the shared reading
 * controls (SpeakButton, ReadingPreferencesMenu) render into the margin.
 */
export const SURFACE = TILE.replace(' backdrop-blur-md', '');

/**
 * The heavier panel - a drawer, a dialog, the assistant - minus its blur, for
 * the same reason: these are the surfaces that host other people's components,
 * and a `backdrop-filter` traps anything `fixed` inside them.
 */
export const PANEL_SOLID = PANEL_DEEP.replace(' backdrop-blur-md', '');

/** The same panel with its radius dropped, for one that sets its own corners. */
export const PANEL_FLAT = PANEL_SOLID.replace('rounded-2xl ', '');

/** Hairlines and dividers on the night ground. */
export const RULE = 'border-white/10';

/** One focus ring for the whole flow: white is the only colour that reads on
 *  every surface here, and it is the ring the scene's own CTAs use. */
export const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-white';

/** Body copy and its two quieter steps down, all measured on the night ground. */
export const INK = 'text-white';
export const INK_MUTED = 'text-white/78';
export const INK_FAINT = 'text-white/60';

/** The step eyebrow: the scene's eyebrow, inked in the accent. */
export function StepEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
      {children}
    </p>
  );
}

/**
 * One note in the margin.
 *
 * Ontwerp B's `Marginal`, with its study-tinted wash swapped for the scene's
 * tile. The label stays the small capitalised line; the body is one step down
 * from the reading column, because a margin that shouts competes with the text
 * it is annotating.
 */
export function Marginal({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${SURFACE} p-3.5`}>
      <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
        {label}
      </p>
      <div className={`mt-2 text-[12.5px] leading-[1.62] ${INK_MUTED}`}>{children}</div>
    </div>
  );
}

/**
 * A lesson page: eyebrow, heading, the reading column, and the margin beside it.
 *
 * The margin becomes a second grid column at xl and drops underneath the text
 * below that - the same breakpoint ontwerp B used. Between lg and xl the shell's
 * step register is already taking 216px off the left, and a third column there
 * would squeeze the reading measure below anything worth reading.
 */
export default function LessonLayout({
  eyebrow,
  heading,
  headingClassName = '',
  lead,
  aside,
  children,
}: {
  eyebrow: string;
  /** The one h1 of the screen. */
  heading: React.ReactNode;
  headingClassName?: string;
  /** An optional line directly under the heading, inside the column. */
  lead?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid w-full max-w-[1140px] gap-x-10 gap-y-7 px-5 py-7 sm:px-8 xl:grid-cols-[minmax(0,1fr)_252px] xl:px-10">
        <article className="min-w-0 max-w-[64ch]">
          <StepEyebrow>{eyebrow}</StepEyebrow>
          <h1
            className={`mt-2 text-[26px] sm:text-[28px] font-bold leading-[1.16] ${INK} ${headingClassName}`}
          >
            {heading}
          </h1>
          {lead ? <div className={`mt-3 text-[15px] leading-[1.7] ${INK_MUTED}`}>{lead}</div> : null}
          {children}
        </article>

        {/* What supports the text stands beside it, never under it. Left out
            entirely when a step has nothing to put there, so the single-column
            layout below xl does not end on an empty row of gap. */}
        {aside ? <aside className="min-w-0 space-y-4 xl:pt-1">{aside}</aside> : null}
      </div>
    </div>
  );
}
