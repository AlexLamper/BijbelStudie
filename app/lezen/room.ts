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
 * The room paints no background of its own. The shell it streams into draws
 * the dashboard's picture behind it, MUTED (see ../layout.tsx and
 * SceneBackdrop's `muted`): the ground colour with the reader's own tree faint
 * and still inside it, across the whole viewport, navbar included. The room
 * letting that through is what makes the bar and the page one surface instead
 * of two designs meeting at a line. There is no wash, no gradient and nothing
 * moving anywhere on this screen: it is the one someone sits on for twenty
 * minutes, and the muted picture is tuned in tokens.ts so white type never
 * drops below 8.6:1 on it and stays at 16:1 almost everywhere.
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
 * The rail is `fixed left-0` and is RAIL_W (13rem) wide, so the scripture
 * column - and only the scripture column - starts exactly where it stops; the
 * room's ground runs on underneath, which is what keeps it one continuous
 * surface rather than a margin.
 *
 * The inset has been every number the rail has been: 176px when the rail
 * opened on hover, 96/112px when it rested narrow, and 14rem - the rail plus a
 * 1rem gap - when the rail first became a fixed 13rem column. That last gap is
 * what the owner saw as "spacing between the sidebar and the content", so it
 * is gone: the inset IS the rail's width, stated once in
 * components/scene/tokens.ts beside RAIL_W.
 */
export { RAIL_GUTTER } from "../../components/scene/tokens"
