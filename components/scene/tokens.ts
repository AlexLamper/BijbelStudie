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
 * The page's own ground colour, behind the scene. Deep navy rather than black,
 * so the frame before the landscape arrives already belongs to the picture.
 */
export const SCENE_BG = "#0B1220"

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
 * The left inset clears the rail at its OPEN width (176px), not at its resting
 * width. It used to clear only the resting 64px, on the reasoning that a rail
 * which floats costs the page nothing - but the moment someone's pointer
 * brushed the left edge the rail swelled to 224px and put a blurred film over
 * the first 128px of every panel and every heading, with the copy still faintly
 * showing through it. Content half-visible under a blur does not read as depth,
 * it reads as a rendering fault, which is exactly the complaint.
 *
 * So the rail's column is reserved rather than borrowed: 192px at `lg` and
 * 208px at `xl`, which is the open rail plus the same 16-32px of breathing room
 * the old value left beside the closed one. The rail still opens on hover and
 * on focus and still moves no content, but it now opens into the left scrim
 * instead of over the page.
 *
 * Change this and the rail's `hover:w-*`/`focus-within:w-*` in SceneRail.tsx
 * together - the gap between them IS the fix.
 *
 * SceneShell applies it for you - reach for the constant only when a page opts
 * out (`gutter="none"`) to lay out full-bleed sections itself.
 */
export const SCENE_X = "px-5 sm:px-8 lg:pl-48 lg:pr-10 xl:pl-52 xl:pr-16"

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
 * showing through a piece of navigation reads as a fault rather than as depth,
 * and on the handful of routes that set their own gutter the open rail can
 * still land on content.
 *
 * Open, the rail is therefore the page's own ground - the same #0B1220
 * SceneShell paints behind the landscape (SCENE_BG). Written out rather than
 * spliced in from the constant because Tailwind reads class names as literal
 * text and never generates a class built from a variable.
 */
export const RAIL_OPEN = "bg-[#0B1220]"

/**
 * The left inset that clears the rail at its OPEN width, for a page that opts
 * out of `SCENE_X` because it owns its own space.
 *
 * `SCENE_X` pads all four sides, which is the wrong shape for a full-bleed page
 * like the reader: there the room runs to every edge and only the one column
 * the rail could cover is inset. Both live here so the rail's open width is
 * stated in one place instead of being copied into a route and left behind the
 * next time it moves. Literal class text, for the same reason as RAIL_OPEN.
 */
export const RAIL_COLUMN = "lg:pl-44 xl:pl-[11.5rem]"

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
