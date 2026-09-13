/**
 * Design constants shared by the two study blocks on the landing page
 * (`ContinueStudy`, `StudyDiscovery`).
 *
 * These mirror the `T` / `SHELL` / `EDGE` tokens defined inside
 * `LandingPage.tsx` - the landing page styles through inline styles rather than
 * Tailwind `dark:` variants, so the new sections follow the same idiom to stay
 * visually consistent with the page they live on. The teal is `#0D9488`, the brand value used everywhere.
 */
/**
 * Dark mode for the landing page. The page styles through inline `style`
 * colours, which a `dark:` class cannot reach, so the colours that have no
 * global token are scoped CSS variables set here and flipped under `.dark`.
 * The rest point at the global tokens (`--ink`, `--line`, `--surface`,
 * `--surface-sunken`), whose light values are the hex this page always used.
 * Put this class on the landing page's root element.
 */
export const LP_THEME_VARS =
  "[--lp-teal-text:#0F766E] [--lp-teal-deep:#115E59] [--lp-teal-light:#CCFBF1] [--lp-muted:#4B5563] [--lp-page:#FFFFFF] " +
  "dark:[--lp-teal-text:#2DD4BF] dark:[--lp-teal-deep:#5EEAD4] dark:[--lp-teal-light:rgba(45,212,191,0.15)] dark:[--lp-muted:#A3A3A3] dark:[--lp-page:#171717]"

export const ST = {
  teal: "#0D9488",
  tealDark: "#0F766E",
  tealText: "var(--lp-teal-text, #0F766E)",
  tealDeep: "var(--lp-teal-deep, #115E59)",
  tealLight: "var(--lp-teal-light, #CCFBF1)",
  card: "var(--surface)",
  border: "var(--line)",
  text: "var(--ink)",
  muted: "var(--lp-muted, #4B5563)",
  light: "var(--surface-sunken)",
} as const

/** One container width and gutter, identical to the landing page's `SHELL`. */
export const ST_SHELL = "mx-auto w-full max-w-6xl xl:max-w-[76rem] px-5 sm:px-6 lg:px-8"

/** The resting card elevation used across the landing page. */
export const ST_CARD_SHADOW = "0 1px 2px rgba(15,23,42,0.04)"

/** The hairline every landing section carries on its top edge. */
export const ST_EDGE = { borderTop: `1px solid ${ST.border}` }

/** Fluid heading size, matching the landing page's `TYPE.h3`. */
export const ST_HEADING = "clamp(1.375rem, 1.1rem + 0.85vw, 1.875rem)"

/** The in-lesson steps, in flow order. Mirrors `STEP_ORDER` in lib/studyFlow.ts
 *  so a resume link can carry the reader back to the exact step they left. */
export const STUDY_STEP_KEYS = ["intro", "word", "depth", "reflection", "quiz"]
