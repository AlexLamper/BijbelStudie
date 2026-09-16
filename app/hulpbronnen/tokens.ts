/**
 * Class strings shared by the /hulpbronnen routes only - the list, a work's own
 * page and its reader - so the three files cannot drift apart.
 *
 * They replace the scene tokens (components/scene/tokens.ts) these routes used
 * to wear. Every colour is a token from tailwind.config.ts, and `teal-dark`
 * (#0F766E) rather than `teal` (#0D9488) wherever the fill carries white type or
 * the teal is small text on white: white on #0D9488 measures 3.74:1 and fails,
 * #0F766E holds 5.5:1 - the same rule app/abonnement/page.tsx follows.
 */

/** The small uppercase label above a heading. */
export const EYEBROW =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-dark dark:text-teal-400";

/** The page's one filled action. */
export const BTN_PRIMARY =
  "press group inline-flex h-11 items-center justify-center gap-2 rounded-btn bg-teal-dark px-5 text-[14px] font-semibold text-white no-underline outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2";

/** A quiet action beside or below the primary one. */
export const BTN_SECONDARY =
  "press inline-flex h-11 items-center justify-center gap-2 rounded-btn border border-line bg-surface px-5 text-[14px] font-semibold text-ink-body no-underline outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2";

/** An inline link inside running text. */
export const TEXT_LINK =
  "rounded-sm font-medium text-teal-dark underline underline-offset-4 outline-none transition-colors hover:text-ink dark:text-teal-400 dark:hover:text-teal-300 focus-visible:ring-2 focus-visible:ring-[#0D9488]";
