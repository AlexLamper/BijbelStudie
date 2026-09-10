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
 * The page's own ground colour, behind the scene - and on the screens that
 * deliberately have NO landscape (the /studie window) or only a muted one
 * (/lezen, see SceneBackdrop's `muted`) very nearly the whole screen.
 *
 * The hue was settled first and has not moved since: 189, so the ground sits
 * between slate-900 and teal-950 rather than in blue, and shares its family
 * with every accent that lands on it (#2DD4BF, the #0D9488 brand, the focus
 * ring) instead of arguing with them. It replaced #0B1220, a cold near-black
 * navy that read as a different product from the slate-and-teal the rest of the
 * app is built in.
 *
 * WHAT MOVED, AND WHY IT IS THE ONLY HONEST PLACE TO MOVE IT.
 *
 * The value was #081A1D, which is very nearly black. Behind a landscape that
 * hardly shows, so the dashboard never complained; but /lezen and the /studie
 * window have no picture at all, and there this colour IS the screen for
 * twenty minutes at a time. It read as heavy - not as night, as unlit.
 *
 * #0C2429 is the same hue and the same family at about 1.7x the luminance: a
 * room with some light in it, still unmistakably night. Every ink that lands on
 * it keeps a wide margin over the 4.5:1 floor -
 *
 *   #FFFFFF (scripture, headings)        16.2:1   (was 17.8)
 *   #BFC9CC (verse numbers)               9.6:1   (was 11.0)
 *   #A6B3B5 (captions, the attribution)   7.5:1   (was  8.6)
 *   #2DD4BF (accents, never a fill)       8.7:1   (was  9.7)
 *
 * IT WENT TOO FAR ONCE - #102E33, 2.6x - AND THAT IS THE USEFUL PART.
 *
 * At that value nothing failed a contrast check and the screens still looked
 * wrong: lifting the ground and lightening the scrims in the same pass took the
 * atmosphere out with the murk, and the pages stopped reading as a place and
 * started reading as flat dark chrome. The lesson is that the ground and the
 * scrims are not two dials for one quality. The ground decides whether a
 * reading screen is comfortable; the SCRIMS decide whether the app has any
 * depth. Lighten the ground, keep the scrims - see the scrim section at the
 * foot of this file, where the same mistake is recorded from the other side.
 *
 * Change it HERE and nowhere else. Tailwind reads class names as literal text,
 * so a class built from this constant is a class it never generates - a page
 * that needs the colour sets it through `style`, or uses SCENE_ROOM below. The
 * two places that must repeat the hex by hand are RAIL_OPEN in this file and
 * PANEL_SOLID in components/study/flow/lesson-layout.tsx; both say so.
 */
export const SCENE_BG = "#0C2429"

/**
 * The same colour as bare channels, for the one thing `style` cannot express
 * with a hex: a gradient that has to fade to nothing without going grey.
 * `rgba(${SCENE_BG_RGB}, 0)` is transparent AND the right hue; the keyword
 * `transparent` is transparent black and fades through soot.
 */
export const SCENE_BG_RGB = "12, 36, 41"

/**
 * The still wash that lights the /studie window's SURROUND.
 *
 * One layer, no animation, nothing to wait for - the light the window is
 * standing in, so the frame belongs to a world rather than to grey app chrome.
 *
 * It goes under a frame and never under a column of type. A wash of this
 * strength costs white about two points of contrast where it is strongest, so a
 * reading screen (`backdrop="none"`, the inside of the window) gets the bare
 * ground and nothing else - which is also what "calm and still" means. All the
 * figures above are measured on that bare colour. (/lezen is the one reading
 * screen with a picture, and its own figures are at MUTED_PICTURE_OPACITY.)
 */
export const SCENE_WASH =
  `radial-gradient(120% 90% at 8% 0%, rgba(45,212,191,0.10) 0%, rgba(13,148,136,0.05) 32%, rgba(${SCENE_BG_RGB},0) 68%)`

/* -- Type ------------------------------------------------------ */

/** The small capitalised label above a heading or a figure. */
export const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65"

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
 *
 * THE FLOOR AND THIS FILL ARE ONE SUM - DO NOT LIGHTEN EITHER ALONE.
 *
 * White on this tile is worst over the brightest sky the backdrop can draw, and
 * what it lands on there is SCRIM_FLOOR and this fill multiplied together. At
 * the old pair (floor 25%, fill 40%) that was 5.2:1; at floor 20% and fill 35%
 * it is 4.9:1, which is the lightest the two go together while a caption still
 * clears the floor with room to spare. Lightening the scrim and the tile in the
 * same pass, each by "just a little", is exactly how this lands at 3.5:1 and
 * fails - so if either number moves again, recompute the product, not the part.
 */
export const TILE = "rounded-2xl border border-white/22 bg-black/38 backdrop-blur-md"

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
export const PANEL_DEEP = "rounded-2xl bg-black/75 ring-1 ring-white/12 backdrop-blur-md"

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
 * THE RAIL IS NOT THE MARGIN. THE MARGIN GOES BESIDE IT.
 *
 * The left inset is built out of two things that are added, never merged:
 *
 *     RAIL_W (13rem, and it has exactly one)  +  the page's own side margin
 *
 * and that second term is the SAME margin the right edge gets. So at `lg` the
 * right is 2.5rem and the left is 13 + 2.5 = 15.5rem; at `xl` the right is 4rem
 * and the left is 13 + 4 = 17rem. The content column is then symmetrically
 * inset in the space the rail leaves, which is what it looks like it should be.
 *
 * Below `lg` there is no rail - it becomes a sticky strip of pills - so the
 * gutter is plainly symmetrical and the arithmetic does not apply.
 *
 * The history, because every one of these was tried and rejected by the owner.
 * The rail first OPENED on hover from 64px to 176px over a 96px gutter, as a
 * film of white over a blur, ghosting over every heading. Then it opened to
 * exactly its gutter (96/112px) with the labels under the icons. Then it stayed
 * 64px and floated ONE label out over the scene on hover. All three made the
 * reader hover to find out what an icon is, and the verdict was "not the
 * expanding - just the labels". So the rail has one width, wide enough for an
 * icon and its full Dutch label side by side, and never changes it. The page
 * pays that width once, forever, and nothing about the rail can ever cover a
 * glyph, because there is no state in which it is wider than the strip it
 * stands in.
 *
 * SceneShell applies it for you - reach for the constant only when a page opts
 * out (`gutter="none"`) to lay out full-bleed sections itself. /lezen is the
 * one page that does, and it stays on the bare RAIL_GUTTER below: the reader
 * runs to every edge on purpose, so it wants the inset that is exactly the
 * rail's own width and nothing more - the pane starts where the rail stops.
 */
export const SCENE_X = "px-5 sm:px-8 lg:pl-[15.5rem] lg:pr-10 xl:pl-[17rem] xl:pr-16"

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
 * The rail's one and only width: a 13rem (208px) strip of glass standing in the
 * left scrim, with every icon AND its label on show. There is no second value -
 * no hover width, no focus width - see SCENE_X for why that is the whole fix.
 *
 * 13rem is measured, not guessed: the longest label is "Instellingen", which at
 * 13.5px medium runs about 84px; add an 18px glyph, the 12px gap between them,
 * the row's 12px side padding on each side and the rail's own 8px padding and
 * the row needs about 150px. 208px leaves room for a bolder weight, a wider
 * font fallback and the Beheer item without a single label ever truncating.
 *
 * Written as literal class text: Tailwind reads class names as text and never
 * generates one spliced together from a constant. SCENE_X and RAIL_GUTTER
 * repeat the 13rem by hand, and say so.
 */
export const RAIL_W = "w-52"

/**
 * The scene's own ground as an opaque fill: the same SCENE_BG the shell paints
 * behind the landscape, for a surface that must stop the picture dead rather
 * than filter it.
 *
 * It is named for the rail because the rail is what it was cut for - the rail
 * used to widen on hover and needed an opaque ground while it was open, since
 * anything still showing through a piece of navigation reads as a fault rather
 * than as depth. The rail no longer changes width (see SceneRail.tsx), but the
 * fill outlived the state: the lesson flow's PANEL_SOLID is the same need in a
 * different shape, so the name stays where its consumer already points.
 *
 * Written out rather than spliced in from SCENE_BG because Tailwind reads class
 * names as literal text and never generates a class built from a variable: if
 * SCENE_BG moves, this moves with it by hand.
 */
export const RAIL_OPEN = "bg-[#0C2429]"

/**
 * The left inset alone, for a page that opts out of `SCENE_X` because it owns
 * its own space.
 *
 * `SCENE_X` pads all four sides, which is the wrong shape for a full-bleed page
 * like the reader: there the room runs to every edge and only the one column
 * the rail stands in is inset. Literal class text, because Tailwind reads class
 * names as text and never generates one spliced together from a constant.
 *
 * This is deliberately NOT `SCENE_X`'s left inset, and the difference is the
 * whole point of each. 13rem is the rail's own width (RAIL_W) and NOTHING else:
 * the reading pane's left edge sits exactly on the rail's right edge, with no
 * gap between them. It was 14rem for a while - the rail plus a 1rem "breathing"
 * gap - and the owner's verdict was that the strip of ground between the rail
 * and the pane read as wasted width on the one screen where width is the whole
 * task. `SCENE_X` adds the page's full side margin instead, so a column of
 * panels sits evenly between the rail and the right edge. A reader is the first
 * kind of page; every overview screen is the second.
 *
 * /lezen's split-pane lean is computed from this number (see app/lezen/page.tsx)
 * - if this moves, that moves with it.
 */
export const RAIL_GUTTER = "lg:pl-52"

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
 *   --foreground        #FFFFFF on #0C2429 = 16.2:1  (scripture, commentary)
 *   --muted-foreground  #A6B3B5 on #0C2429 =  7.5:1  (captions, attribution)
 *   --card              #1E3033, so #FFFFFF on a panel = 13.8:1
 *   --secondary         #2A3E41, so a control's label   = 11.4:1
 *   --ring              #2BD4BD, the focus outline globals.css draws
 *
 * These all move whenever SCENE_BG moves, and they have to: --card is the panel
 * that sits ON the ground, so if the ground ever rises past it the panels invert
 * and every card on the reading screens becomes a hole instead of a surface.
 * (It came within one point of that once, at --background 13% under a --card of
 * 12%.) The order is the invariant, not the numbers - background < card <
 * secondary < accent < border - and the lightness steps here (10 / 16 / 21 / 24
 * / 30) keep it with room between each pair.
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
  "--background": "189 55% 10.4%",
  "--foreground": "0 0% 100%",
  "--card": "189 26% 16%",
  "--card-foreground": "0 0% 100%",
  "--popover": "189 26% 16%",
  "--popover-foreground": "0 0% 100%",
  "--muted": "189 26% 16%",
  "--muted-foreground": "189 9% 70%",
  "--secondary": "189 22% 21%",
  "--secondary-foreground": "0 0% 96%",
  "--accent": "189 22% 24%",
  "--accent-foreground": "0 0% 100%",
  "--border": "189 16% 30%",
  "--input": "189 16% 30%",
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
 *
 * THESE ARE THE DEPTH. THEY ARE NOT THE BRIGHTNESS DIAL.
 *
 * This is the vignette - the dark that pools at the left edge and under the
 * fold and gathers behind the working panels. It is what makes a page read as a
 * landscape someone is standing in rather than as flat dark chrome.
 *
 * It was cut hard once, in a pass meant to make the app lighter: floor 25 -> 20,
 * both washes 85 -> 72, the veil 55 -> 42, the top band 55 -> 48. Nothing failed
 * a contrast check and the result was still wrong - the atmosphere went out with
 * the murk and the pages flattened. The ground had ALSO been lifted in the same
 * pass, and that was the actual fix; these layers were paying for a problem they
 * did not cause.
 *
 * So they are back near where they were, a shade off it: floor 22, the washes
 * 80, the veil 50, the top band 52. If a screen ever reads as too dark again,
 * move SCENE_BG and leave this section alone. That is the whole rule.
 *
 * What holds them down from the other side is the type that sits ON them, and it
 * is not the same type in each case. The floor is the one with a real ceiling,
 * because TILE's fill multiplies with it - see the note on TILE, and move the
 * two together or not at all. The two washes carry a heading and a primary
 * action, both large, so they have more slack. The veil is pure atmosphere:
 * nothing reads directly on it that is not already inside a panel of its own.
 */

/** A constant floor of dark over the whole picture, so copy is legible from the first frame. */
export const SCRIM_FLOOR = "absolute inset-0 bg-black/22"

/** The left wash, which carries the rail, the heading and the primary action. */
export const SCRIM_LEFT =
  "absolute inset-y-0 left-0 w-[min(46rem,78%)] bg-gradient-to-r from-black/80 via-black/42 to-transparent"

/** The bottom wash, which carries whatever breaks the fold. */
export const SCRIM_BOTTOM = "absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent"

/** The veil: the scene goes deep as the working panels arrive. */
export const SCRIM_VEIL = "absolute inset-0 bg-black/50"

/** A permanent band of dark under the top edge, so a bar over a noon sky stays legible. */
export const SCRIM_TOP =
  "pointer-events-none fixed inset-x-0 top-0 z-40 h-24 bg-gradient-to-b from-black/52 via-black/24 to-transparent"

/** The same band, deepening as the page scrolls. */
export const SCRIM_TOP_VEIL =
  "pointer-events-none fixed inset-x-0 top-14 z-40 h-8 bg-gradient-to-b from-black/42 to-transparent"

/* -- The muted backdrop ---------------------------------------- */

/*
 * /lezen wants the dashboard's landscape behind the chapter - the same tree,
 * the same scene - but as a presence rather than a picture: "very subtle, a
 * real background, not obvious, must not hinder reading". Two numbers do it,
 * and they are one sum, so move them together or not at all.
 *
 * The picture is drawn at MUTED_PICTURE_OPACITY over the bare ground, and then
 * MUTED_SCRIM - the ground's own colour at partial alpha - is laid over it, so
 * whatever the landscape does it is pulled back towards SCENE_BG rather than
 * towards black (a black scrim turns a dusk sky to soot; the ground's own hue
 * turns it to a deeper dusk). The landscape's effective weight in the final
 * pixel is 0.30 x (1 - 0.30) = 0.21 - about a quarter of what the dashboard
 * shows once its own black/22 floor is counted, which is the range asked for.
 *
 * What that costs the type, measured on the worst pixel the palette can draw
 * (a near-white band of dusk sky, #FFF0D0): the ground there becomes about
 * #3F4F4C and white measures 8.6:1 on it. A bright ochre sky lands at 10:1,
 * and everywhere the picture is land, water or trunk the ground stays within a
 * step of SCENE_BG and white keeps its 16:1. The floor for this screen is 7:1,
 * so the picture can never be turned up past 0.30 without recomputing this.
 * None of the standard scrims are drawn in this mode: they are the depth of a
 * page that scrolls, and this one does not.
 */

/** How much of the landscape survives, before the scrim. */
export const MUTED_PICTURE_OPACITY = 0.3

/** The ground's own colour, laid back over the faint picture. */
export const MUTED_SCRIM = `rgba(${SCENE_BG_RGB}, 0.3)`
