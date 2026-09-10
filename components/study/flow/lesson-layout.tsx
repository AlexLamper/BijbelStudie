'use client';

import React from 'react';

import { EYEBROW, SCENE_BG_RGB, TEAL_ON_DARK, TILE } from '../../scene/tokens';

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
 * ONE GROUND, NO PLATES. The scripture used to sit on the scene's light `PLATE`
 * as "the one lit object in the window". It was a defensible idea and it read
 * as a second design: a white page dropped into a night frame, with the margin
 * notes beside it on the night and the commentary a step darker again - a stack
 * of differently coloured boxes rather than one screen. Everything in the lesson
 * now stands on the window's own ground (SCENE_ROOM), and what separates one
 * surface from its neighbour is a hairline or a small step of elevation, never
 * a different colour. The passage gained contrast in the move: white on the
 * ground is 18.5:1 where the plate gave it 18.1:1.
 */

/**
 * The tile every marginal note, quiz card and figure sits on.
 *
 * It is `TILE` - the SAME surface the dashboard's information cards wear -
 * with one thing taken off it, and nothing added. A leeswijzer here and a
 * voortgangspaneel on /dashboard are now literally one class, so the two
 * screens cannot drift.
 *
 * What used to be here was a local invention: a 4.5% film of white, tuned to
 * land on the room's `--card`. That made the lesson's own surfaces a step
 * LIGHTER than the ground and, because `--card` is a hue-189 colour, it is
 * where the flow picked up the blue-green cast the rest of the app does not
 * have. `bg-black/35` over the same ground has no hue of its own at all - it
 * only takes light out - which is exactly why it is the shared card surface.
 *
 * The one subtraction is `backdrop-blur-md`, and it is not cosmetic: a
 * `backdrop-filter` makes an element a containing block for every `fixed`
 * descendant, and these tiles host the shared reading controls (SpeakButton,
 * ReadingPreferencesMenu) whose menus and toasts are `fixed`. There is also
 * nothing behind them to blur - this screen is a flat ground, not a
 * photograph - so the blur costs a bug and buys no glass.
 *
 * White on it measures 17.2:1 and INK_MUTED 11.3:1 - both still a step BETTER
 * than the film of white they replace, because taking light out of the ground
 * is the one way to make a tile that does not cost the type sitting on it.
 * (Those were 19.4:1 and 12.6:1 before SCENE_BG was lifted to #102E33; the
 * tile follows the ground, so it lightened by the same amount the room did and
 * kept its whole margin over the 4.5:1 floor.)
 */
export const SURFACE = TILE.replace(' backdrop-blur-md', '');

/**
 * The heavier panel - a drawer, a dialog, the assistant.
 *
 * These stand OVER the lesson rather than in it, so unlike SURFACE they have to
 * be genuinely opaque: half of them (the assistant in its `half` layout) cover a
 * column of commentary with no scrim under them, and type ghosting through a
 * panel reads as a broken render rather than as depth.
 *
 * Opaque, then, but not a second colour. It is the scene's own ground with a
 * hairline and a shadow, which is exactly what `RAIL_OPEN` does for the one
 * other piece of chrome that has to cover the page - so what separates an
 * overlay from the lesson is elevation, never a tint. It used to be #172427,
 * the room's `--card`: a lighter blue-green box punched through a darker
 * blue-green screen.
 *
 * The hex is written out rather than spliced in from SCENE_BG for the reason
 * `RAIL_OPEN` states: Tailwind reads class names as literal text and never
 * generates a class built from a constant. If SCENE_BG moves, this moves with
 * it by hand - it has moved once already, from #081A1D to #102E33 when the
 * whole scene was lifted, and this line is one of exactly two that had to be
 * edited by hand to follow it.
 *
 * No `backdrop-filter`, for SURFACE's reason and a sharper one: these are the
 * surfaces that host other people's components, and a filter traps anything
 * `fixed` inside them.
 */
export const PANEL_SOLID = 'rounded-2xl bg-[#102E33] ring-1 ring-white/15';

/** The same panel with its radius dropped, for one that sets its own corners. */
export const PANEL_FLAT = PANEL_SOLID.replace('rounded-2xl ', '');

/** Hairlines and dividers on the night ground. */
export const RULE = 'border-white/10';

/**
 * The passage, and anything else that is a long run of reading.
 *
 * Deliberately NOT a surface: no fill, no ring, no card. The scripture stands
 * straight on the window's ground, exactly the way it stands on /lezen's, and a
 * hairline plus air is what separates it from the heading above it. That is
 * what makes the reading column and the reading page the same object seen twice
 * rather than two designs, and it is the highest contrast available in the
 * window - white on the ground, 18.5:1.
 */
export const READING_SURFACE = 'border-t border-white/10 pt-7';

/** One focus ring for the whole flow: white is the only colour that reads on
 *  every surface here, and it is the ring the scene's own CTAs use. */
export const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-white';

/**
 * The dim behind a dialog, a drawer or an open menu.
 *
 * The window's own ground at low alpha, not black: what is behind an overlay
 * should recede INTO the room rather than into soot, which is the difference
 * between a lesson that dims and a lesson that gets a black sheet thrown over
 * it. Built from the token, so the day the ground moves every scrim moves with
 * it.
 */
export const scrim = (alpha: number) => `rgba(${SCENE_BG_RGB},${alpha})`;

/**
 * Body copy and its two quieter steps down, all measured on the window's own
 * ground: white is 18.5:1, /80 is 12.1:1 and /60 is 7.2:1 there, and /80 is
 * still 10.7:1 on a SURFACE tile.
 *
 * `text-white/80` and not the `/78` that used to be here. Tailwind generates
 * opacity modifiers from its own scale - 0, 5, 10 ... 95, 100 - and silently
 * emits NOTHING for a value that is not on it. So `text-white/78` set no colour
 * at all, every element wearing it inherited the already-computed `color` from
 * <body> - near-black in the light theme, because `color` is inherited as a
 * value and does not re-resolve inside a scoped `dark` - and the margin notes
 * were black type on a black tile. That is the "Straks de vraag is not
 * visible" report, and it took every Marginal, every lead and every paragraph
 * of the introduction with it.
 *
 * Anything written here must be a value Tailwind actually emits. A one-off that
 * is not on the scale goes in square brackets (`text-white/[0.78]`), which is
 * an arbitrary value and always generated.
 */
export const INK = 'text-white';
export const INK_MUTED = 'text-white/80';
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
