import React from 'react';

/**
 * Variant 4 - "Rust". The shared type vocabulary.
 *
 * The premise of this variant is that a bible-study product should look like a
 * well-set book: no banners, no generated scenes, no gradients. Everything a
 * thumbnail was doing is done here by size, weight, measure, rhythm and one
 * hairline of colour.
 *
 * Three rules the whole variant obeys:
 *
 *  1. Serif is for the things you read - scripture, study titles, lesson
 *     titles, the reflection question. Sans is for the furniture: labels,
 *     counts, controls, meta.
 *  2. Colour means something or it is not used. Teal marks the current thing
 *     and the actions you can take; everything else is grey.
 *  3. Numbers that line up are tabular. A register of 76 studies with jittering
 *     lesson counts is not a register.
 *
 * Preview surface: nothing here reads a database, a session or a user.
 */

/** Brand teal. Hardcoded, never a Tailwind token. */
export const TEAL = '#0D9488';

/** ~68 characters at the body size. Prose is never wider than this. */
export const MEASURE = 'max-w-[68ch]';

/** ~62 characters. Scripture is set one step narrower than prose. */
export const SCRIPTURE_MEASURE = 'max-w-[62ch]';

/**
 * The small-caps label above a block.
 *
 * Never teal: an eyebrow says what something is, and "what something is" is not
 * a thing you can act on.
 */
export function Eyebrow({
  children,
  className = '',
  as: Tag = 'p',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'p' | 'h2' | 'h3' | 'span';
}) {
  return (
    <Tag
      className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground ${className}`}
    >
      {children}
    </Tag>
  );
}

/**
 * The one piece of colour a study gets.
 *
 * This is the whole of the argument against the banner: a 2px rule under a
 * title, in the product's own teal, marking where the study begins. It is not a
 * picture of anything and does not pretend to be.
 */
export function StudyRule({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`h-[2px] w-14 ${className}`} style={{ backgroundColor: TEAL }} />
  );
}

/**
 * The primary action: filled teal, one per screen.
 *
 * Rendered as a span so a Link can wrap it, or used on a button directly.
 */
export const ACTION_CLASS =
  'press inline-flex items-center justify-center h-10 px-5 rounded-md text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90 disabled:opacity-40';

/** The quiet second action. A text link, never a second button. */
export const QUIET_LINK_CLASS =
  'text-[13px] text-muted-foreground no-underline underline-offset-4 transition-colors hover:text-foreground hover:underline';
