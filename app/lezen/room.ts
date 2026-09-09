import type { CSSProperties } from "react"

import { SCENE_ROOM } from "../../components/scene/tokens"

/**
 * The reading room's ground, and the palette every pane inside it inherits.
 *
 * The room used to be a lit `PLATE` - a white page floating on the landscape
 * with a gutter of scene around it. That put the one screen someone sits on for
 * twenty minutes behind glass: a card, with margins, in the middle of a world
 * it did not belong to. The room is the world now. It runs to all four edges,
 * it is the scene's own ground colour, and the rail floats on it rather than
 * beside it.
 *
 * Everything that makes that work - the `dark` scope, the re-pointed theme
 * tokens, the measured inks, `colorScheme` - now lives in `SCENE_ROOM` in
 * components/scene/tokens.ts, because the /studie window needs exactly the same
 * treatment for exactly the same reason and the two must not drift. Read the
 * note there for the reasoning and the contrast figures.
 *
 * The room paints no background of its own. The shell it streams into is on
 * `backdrop="none"`, so it is already painting the ground across the whole
 * viewport, navbar included, and the room letting that through is what makes
 * the bar and the page one surface instead of two designs meeting at a line.
 * There is deliberately no wash and no gradient anywhere on this screen: it is
 * the one someone sits on for twenty minutes, and a still ground is both the
 * calmest and the highest-contrast thing to put under a chapter.
 */
export const READING_ROOM = { ...SCENE_ROOM, backgroundColor: "transparent" } as CSSProperties

/**
 * The room's own height, spelled out because there is no `h-full` chain to
 * inherit: the navbar is 3.5rem, and below `lg` the rail is a sticky strip of
 * pills that takes another 3rem of flow before the content starts. `dvh`, so a
 * phone's collapsing address bar cannot cut the frame off - the same unit
 * app/studie/layout.tsx uses for the same reason.
 */
export const ROOM_HEIGHT = "h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3.5rem)]"

/**
 * The strip the rail stands in.
 *
 * This page does NOT take `SCENE_X`. The shell's gutter pads all four sides,
 * and four-sided padding is the exact thing the room was rebuilt to remove: it
 * is what made the reader a card with margins instead of a place.
 * `gutter="none"` in the layout, and the room runs to every edge.
 *
 * What the room still owes the rail is the ONE inset that is not decoration.
 * The rail is `fixed left-0` and rests at 64px, so the scripture column - and
 * only the scripture column - clears it; the room's ground runs on underneath,
 * which is what keeps it one continuous surface rather than a margin.
 *
 * The inset was briefly 176px, the rail's OPEN width, which left a dead band of
 * nothing beside the rail and took the width the passage is here for. The rail
 * now opens into this same 96/112px rather than past it, so the inset is the
 * resting clearance again and the number is stated once, beside the rail's own
 * two widths, in components/scene/tokens.ts.
 */
export { RAIL_GUTTER } from "../../components/scene/tokens"
