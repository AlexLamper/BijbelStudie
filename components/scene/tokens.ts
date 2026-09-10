/**
 * The scene design system, in one file.
 *
 * Every immersive page draws on the same picture: one fixed, full-bleed
 * landscape that never moves, with the content travelling over it. That means
 * every surface, every colour and every gutter on such a page has to be honest
 * about sitting ON a photograph rather than on a page, so nothing here is a
 * theme token. A theme token flips with the reader's light/dark setting; the
 * landscape does not - it can be a noon sky in dark mode and a midnight one in
 * light mode. Literal whites, literal blacks, and the page's own scrims and
 * `--veil` do the contrast work.
 *
 * No imports and no "use client": this file is plain strings, so a server
 * component may import it without pulling a single client module into its
 * graph.
 */

/* -- Colour ---------------------------------------------------- */

/**
 * Brand teal, hardcoded as the project requires (never `bg-brand`).
 *
 * Fills that carry no type: bars, dots, rings, the ramp on a progress field.
 */
export const TEAL = "#0D9488"

/**
 * The brand one step down, for a SOLID button that carries white type.
 *
 * White on #0D9488 measures 3.74:1 and therefore does not clear 4.5:1 at
 * button-label size; on #0F766E it measures 5.5:1. This is the same value the
 * live site's buttons and the landing page already use (`bg-teal-700`), so
 * nothing about the brand shifts - it is the darker end of the same swatch.
 * Use this, not TEAL, the moment white type sits on the fill.
 */
export const TEAL_DEEP = "#0F766E"

/**
 * The brand on a dark ground, for accents and for type: an eyebrow, a link
 * inside a panel, the active marker on the rail. Never a fill under white type
 * - it is far too light for that.
 */
export const TEAL_ON_DARK = "#2DD4BF"

/**
 * The page's own ground colour, behind the scene - and on the two screens that
 * deliberately have NO landscape (/lezen and the /studie window) the whole
 * screen.
 *
 * It used to be #0B1220, a cold near-black navy. Behind a landscape that is
 * almost invisible, which is why it passed on the dashboard; on a reading
 * screen it is everything you look at for twenty minutes, and it read as a
 * different product from the slate-and-teal the rest of the app is built in.
 *
 * #081A1D is the same weight of dark in a different family: hue 189 instead of
 * 222, so it sits between slate-900 and teal-950 rather than in blue, and it
 * shares its hue with the accents that land on it (#2DD4BF, the #0D9488 brand,
 * the focus ring) instead of arguing with them.
 *
 * It is a fraction lighter than the navy it replaces, and everything measured
 * against the old value still clears its number:
 *
 *   #FFFFFF (scripture, headings)        18.5:1
 *   #BFC9CC (verse numbers)              11.0:1
 *   #A6B2B5 (captions, the attribution)   8.5:1
 *   #2DD4BF (accents, never a fill)       9.7:1
 *
 * Change it HERE and nowhere else. Tailwind reads class names as literal text,
 * so a class built from this constant is a class it never generates - a page
 * that needs the colour sets it through `style`, or uses SCENE_ROOM below.
 */
export const SCENE_BG = "#081A1D"

/**
 * The same colour as bare channels, for the one thing `style` cannot express
 * with a hex: a gradient that has to fade to nothing without going grey.
 * `rgba(${SCENE_BG_RGB}, 0)` is transparent AND the right hue; the keyword
 * `transparent` is transparent black and fades through soot.
 */
export const SCENE_BG_RGB = "8, 26, 29"

/**
 * The still wash that lights the /studie window's SURROUND.
 *
 * One layer, no animation, nothing to wait for - the light the window is
 * standing in, so the frame belongs to a world rather than to grey app chrome.
 *
 * It goes under a frame and never under a column of type. A wash of this
 * strength costs white about two points of contrast where it is strongest, so a
 * reading screen (`backdrop="none"`, /lezen, the inside of the window) gets the
 * bare ground and nothing else - which is also what "calm and still" means. All
 * the figures above are measured on that bare colour.
 */
export const SCENE_WASH =
  `radial-gradient(120% 90% at 8% 0%, rgba(45,212,191,0.10) 0%, rgba(13,148,136,0.05) 32%, rgba(${SCENE_BG_RGB},0) 68%)`

/* -- Type ------------------------------------------------------ */

/** The small capitalised label above a heading or a figure. */
export const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60"

/**
 * Skeletons on these surfaces. The shared `SkeletonBlock` carries
 * `dark:bg-secondary`, which is invisible against a panel that is dark in BOTH
 * themes, so the dark branch is overridden here rather than left to the token.
 */
export const SKEL = "bg-white/20 dark:bg-white/20"

/* -- Surfaces -------------------------------------------------- */

/**
 * One surface for everything that sits on the scene.
 *
 * Dark enough that white type clears 4.5:1 over a noon sky (a frosted
 * `bg-white/10` measured about 2.8:1 there), light enough that the sky and the
 * land keep running through it. The page's `--veil` does the rest of the
 * contrast work as the reader scrolls.
 */
export const TILE = "rounded-2xl border border-white/20 bg-black/40 backdrop-blur-md"

/**
 * Kept as a separate name so a page can say "panel" where it means a panel;
 * the surface is deliberately identical to TILE. If a page needs a heavier one
 * - a long ledger, a table, a twelve-question accordion - reach for PANEL_DEEP
 * rather than inventing a third value.
 */
export const PANEL = TILE

/**
 * The heavier panel, for a block of copy long enough that the reader stops
 * seeing the picture behind it. White type clears 12:1 on this whatever is
 * underneath. Use it sparingly: three in a row and the scene is gone.
 */
export const PANEL_DEEP = "rounded-2xl bg-black/80 ring-1 ring-white/10 backdrop-blur-md"

/**
 * The light plate.
 *
 * Some existing components are drawn for a white page - their captions, chips
 * and borders are #4B5563 on white and would fail outright on a dark panel.
 * Rather than fork them, lay them on the scene as lit objects. The dashboard
 * does exactly this with the daily-verse card. It also puts the things that
 * show the product working into the only light surfaces on the page, which is
 * where the eye goes first.
 */
export const PLATE =
  "rounded-3xl bg-[#F9FAFB] ring-1 ring-black/5 shadow-[0_40px_80px_-32px_rgba(0,0,0,0.85)]"

/* -- Calls to action ------------------------------------------- */

/**
 * The primary action ON the scene: white, because white is the only fill
 * guaranteed to separate from whatever is behind it. The focus ring is brand
 * teal, which reads against the white pill.
 */
export const CTA_PRIMARY =
  "press group inline-flex items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-base font-semibold text-gray-900 no-underline shadow-xl shadow-black/30 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488]"

/**
 * The same action INSIDE a panel, where the brand fill has a dark ground to sit
 * on. Set the fill yourself: `style={{ backgroundColor: TEAL_DEEP }}` - see
 * TEAL_DEEP for why it is not TEAL. The focus ring flips to white, the only
 * thing that reads on the fill.
 */
export const CTA_BRAND =
  "press inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white"

/** A quiet second action: type only, underlined on hover, with a real focus ring. */
export const CTA_QUIET =
  "inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-white/85 no-underline underline-offset-4 outline-none transition-colors hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white"

/* -- Gutters --------------------------------------------------- */

/**
 * The content gutter on a page that shows the rail.
 *
 * THREE NUMBERS HAVE TO AGREE, AND THEY ARE ALL IN THIS SECTION: the rail's
 * resting width (RAIL_REST, 64px), the rail's open width (RAIL_WIDE, 96px at
 * `lg` and 112px at `xl`), and this gutter. The rule that ties them together:
 *
 *     RAIL_REST  <  RAIL_WIDE  <=  the gutter
 *
 * which is what lets the rail float over the page - reserving nothing beyond
 * the strip it already occupies - while making it impossible for it to cover a
 * glyph, at rest or open.
 *
 * The history, because both mistakes are easy to make again. The rail first
 * opened to 176px over a 96px gutter, as a film of white over a blur: it put
 * 80px of translucent panel over every heading with the copy ghosting through,
 * which reads as a broken render rather than as depth. The cure was worse: the
 * gutter was widened to 192/208px to RESERVE the open rail, which pushed every
 * page's content a fifth of the way across the screen and left /lezen a dead
 * band beside the rail.
 *
 * Neither was necessary. The ghosting was an opacity problem - fixed by
 * RAIL_OPEN, the opaque ground the rail now paints while it is open - and the
 * overlap is a width problem, fixed by opening into the gutter instead of past
 * it. The rail carries its labels under the icons rather than beside them,
 * which is what makes 96px enough.
 *
 * SceneShell applies it for you - reach for the constant only when a page opts
 * out (`gutter="none"`) to lay out full-bleed sections itself.
 */
export const SCENE_X = "px-5 sm:px-8 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-16"

/**
 * The gutter on a page with no rail. Symmetrical, and wider than a reading
 * measure on purpose: on a scene page a wide monitor should get more
 * landscape, not more margin.
 */
export const SCENE_X_EDGE = "px-5 sm:px-8 lg:px-14 xl:px-20"

/** One vertical rhythm for a section below the fold. */
export const SECTION_Y = "py-[clamp(3.5rem,6vw,6rem)]"

/* -- The rail -------------------------------------------------- */

/**
 * The rail's ground once it is open.
 *
 * A film of white over a blur is the right surface for a 64px strip standing in
 * the left scrim: the sky and the land keep running under it and it costs the
 * picture nothing. It is the wrong surface for an open panel. Anything still
 * showing through a piece of navigation reads as a fault rather than as depth.
 *
 * Open, the rail is therefore the page's own ground - the same SCENE_BG the
 * shell paints behind the landscape. Written out rather than spliced in from
 * the constant because Tailwind reads class names as literal text and never
 * generates a class built from a variable: if SCENE_BG moves, this moves with
 * it by hand.
 */
export const RAIL_OPEN = "bg-[#081A1D]"

/** The rail at rest: a 64px strip of glass standing in the left scrim. */
export const RAIL_REST = "w-16"

/**
 * The rail open, on hover and on keyboard focus.
 *
 * Exactly the gutter, never a pixel more - see SCENE_X for why that is the
 * whole fix. 96px at `lg` and 112px at `xl` is enough for an icon with its
 * label set under it, which is the trade that buys the page its width back.
 */
export const RAIL_WIDE = "hover:w-24 focus-within:w-24 xl:hover:w-28 xl:focus-within:w-28"

/**
 * The left inset alone, for a page that opts out of `SCENE_X` because it owns
 * its own space.
 *
 * `SCENE_X` pads all four sides, which is the wrong shape for a full-bleed page
 * like the reader: there the room runs to every edge and only the one column
 * the rail stands in is inset. The two live together so the number is stated
 * once instead of being copied into a route and left behind the next time it
 * moves. Literal class text, for the same reason as RAIL_OPEN.
 */
export const RAIL_GUTTER = "lg:pl-24 xl:pl-28"

/* -- The room -------------------------------------------------- */

/**
 * The palette a screen wears when it has NO landscape behind it: /lezen and the
 * /studie window.
 *
 * Both of those screens host components that were drawn for a white page - the
 * chapter viewer, the commentary, the grondtekst, the notes, the assistant -
 * and forking every one of them is not an option. Two mechanisms do the whole
 * job instead, and neither costs a byte of JavaScript:
 *
 *  1. `dark` on the frame. Tailwind's dark mode is class-based, so scoping the
 *     class there flips every theme token in the subtree to its light-on-dark
 *     value - the same trick `Header variant="scene"` and `StudyRail` use. That
 *     is what stops a reader in the light theme from getting a white box.
 *  2. These variables. `dark` alone lands on the app's neutral near-black
 *     (#171717), which is a grey panel, not a place. Re-pointing the tokens at
 *     the scene's own ground makes every surface the shared components already
 *     paint - `dark:bg-background`, `dark:bg-card`, `dark:border-border` - part
 *     of the same picture, without editing one of them.
 *
 * The numbers are chosen against the ground they actually land on, because
 * legibility is the whole task on these two screens and atmosphere loses every
 * tie:
 *
 *   --foreground        #FFFFFF on #081A1D = 18.5:1  (scripture, commentary)
 *   --muted-foreground  #A6B3B5 on #081A1D =  8.6:1  (captions, attribution)
 *   --card              #172427, so #FFFFFF on a panel = 15.9:1
 *   --secondary         #223235, so a control's label   = 13.3:1
 *   --ring              #2BD4BD, the focus outline globals.css draws
 *
 * The ink is a literal white rather than the #F9FAFB it used to be, which is
 * the one the rest of the scene already writes in (`text-white` everywhere in
 * `pieces.tsx` and the lesson flow). One white, one ground, one world.
 *
 * `colorScheme: dark` is not decoration: both screens use native `<select>`
 * elements, and without it the browser paints their popup lists - and the
 * scrollbars - in the light scheme over a night room.
 *
 * Typed as a plain string map rather than as `CSSProperties` so this file keeps
 * its promise of importing nothing; a consumer casts it at the `style` prop.
 */
export const SCENE_ROOM: Record<string, string> = {
  colorScheme: "dark",
  "--background": "189 57% 7.2%",
  "--foreground": "0 0% 100%",
  "--card": "189 26% 12%",
  "--card-foreground": "0 0% 100%",
  "--popover": "189 26% 12%",
  "--popover-foreground": "0 0% 100%",
  "--muted": "189 26% 12%",
  "--muted-foreground": "189 9% 68%",
  "--secondary": "189 22% 17%",
  "--secondary-foreground": "0 0% 96%",
  "--accent": "189 22% 19%",
  "--accent-foreground": "0 0% 100%",
  "--border": "189 16% 25%",
  "--input": "189 16% 25%",
  "--ring": "172 66% 50%",
}

/**
 * The two inks the reading screens pin rather than leave on a token, because a
 * superscript and a required copyright notice are the two places where "one
 * step quieter" must not become "one step unreadable".
 *
 * #BFC9CC measures 11.0:1 on the ground and #A6B3B5 measures 8.6:1 - a clear
 * step below the passage's 18.5:1 and well above the 4.5:1 floor.
 */
export const VERSE_NUMBER_INK = "#BFC9CC"
export const ATTRIBUTION_INK = "#A6B3B5"

/* -- Scrims ---------------------------------------------------- */

/*
 * The layers that make the landscape safe to read on, in paint order.
 * SceneBackdrop stacks them; they are exported because a page that draws its
 * own local scrim should use this vocabulary rather than pick a new black.
 *
 * SCRIM_VEIL and SCRIM_TOP_VEIL are driven by `--veil` and need
 * `style={{ opacity: "var(--veil, 0)" }}` from whoever renders them.
 */

/** A constant floor of dark over the whole picture, so copy is legible from the first frame. */
export const SCRIM_FLOOR = "absolute inset-0 bg-black/25"

/** The left wash, which carries the rail, the heading and the primary action. */
export const SCRIM_LEFT =
  "absolute inset-y-0 left-0 w-[min(46rem,78%)] bg-gradient-to-r from-black/85 via-black/45 to-transparent"

/** The bottom wash, which carries whatever breaks the fold. */
export const SCRIM_BOTTOM = "absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent"

/** The veil: the scene goes deep as the working panels arrive. */
export const SCRIM_VEIL = "absolute inset-0 bg-black/55"

/** A permanent band of dark under the top edge, so a bar over a noon sky stays legible. */
export const SCRIM_TOP =
  "pointer-events-none fixed inset-x-0 top-0 z-40 h-24 bg-gradient-to-b from-black/55 via-black/25 to-transparent"

/** The same band, deepening as the page scrolls. */
export const SCRIM_TOP_VEIL =
  "pointer-events-none fixed inset-x-0 top-14 z-40 h-8 bg-gradient-to-b from-black/45 to-transparent"
