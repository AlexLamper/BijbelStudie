import type { CSSProperties } from "react"

import { SCENE_BG } from "../../components/scene/tokens"

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
 * Two mechanisms do the whole job, and neither costs a byte of JavaScript:
 *
 *  1. `dark` on the frame. Tailwind's dark mode is class-based, so scoping the
 *     class there flips every theme token in the subtree to its light-on-dark
 *     value - the same trick `Header variant="scene"` and `StudyRail` already
 *     use. That is what stops a reader in the light theme from getting a white
 *     box: the landscape is a night landscape in EITHER setting, so the room
 *     is too.
 *  2. These variables. `dark` alone lands on the app's neutral near-black
 *     (#171717), which is a grey panel, not a place. Re-pointing the tokens at
 *     the scene's navy makes every surface the shared components already paint
 *     - `dark:bg-background`, `dark:bg-card`, `dark:border-border` - part of
 *     the same picture, without editing one of them.
 *
 * The numbers are chosen against the ground they actually land on, because
 * legibility is the whole task here and atmosphere loses every tie:
 *
 *   --foreground        #F9FAFB on #0B1220 = 18.1:1  (scripture, commentary)
 *   --muted-foreground  #A0ABBB on #0B1220 =  8.1:1  (captions, attribution)
 *   --card              #161E2C, so #F9FAFB on a panel = 16.0:1
 *   --secondary         #222B3A, so a control's label  = 13.7:1
 *   --ring              #2BD4BD, the focus outline globals.css draws
 *
 * #F9FAFB is not an invented white: it is the literal the scene's `PLATE`
 * surface is made of, used here as type rather than as a page.
 *
 * `colorScheme: dark` is not decoration. `BibleSelector` uses native `<select>`
 * elements, and without it the browser paints their popup lists - and the
 * scrollbars - in the light scheme over a night room.
 *
 * The wash is the same still radial `app/studie/layout.tsx` lights its window
 * with, at half the strength and kept in the top band so it belongs to the
 * toolbars rather than to the passage. One layer, no animation, no canvas -
 * the shell already owns the only animated thing this page is allowed.
 *
 * Plain data with a type-only React import, so `app/lezen/loading.tsx` can
 * wear the identical room while streaming without pulling the page's client
 * module into a server component.
 */
export const READING_ROOM = {
  colorScheme: "dark",
  backgroundColor: SCENE_BG,
  backgroundImage:
    "radial-gradient(120% 60% at 8% 0%, rgba(45,212,191,0.07) 0%, rgba(13,148,136,0.04) 34%, rgba(11,18,32,0) 70%)",
  "--background": "220 49% 8%",
  "--foreground": "210 20% 98%",
  "--card": "219 34% 13%",
  "--card-foreground": "210 20% 98%",
  "--popover": "219 34% 13%",
  "--popover-foreground": "210 20% 98%",
  "--muted": "219 34% 13%",
  "--muted-foreground": "215 16% 68%",
  "--secondary": "218 27% 18%",
  "--secondary-foreground": "210 18% 92%",
  "--accent": "218 27% 20%",
  "--accent-foreground": "210 20% 98%",
  "--border": "215 20% 26%",
  "--input": "215 20% 26%",
  "--ring": "172 66% 50%",
} as CSSProperties

/**
 * The room's own height, spelled out because there is no `h-full` chain to
 * inherit: the navbar is 3.5rem, and below `lg` the rail is a sticky strip of
 * pills that takes another 3rem of flow before the content starts. `dvh`, so a
 * phone's collapsing address bar cannot cut the frame off - the same unit
 * app/studie/layout.tsx uses for the same reason.
 */
export const ROOM_HEIGHT = "h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3.5rem)]"

/**
 * The column the rail stands in.
 *
 * This page does NOT take `SCENE_X`. The shell's gutter pads all four sides -
 * `px-5 sm:px-8 lg:pl-48 lg:pr-10 xl:pl-52 xl:pr-16` - and four-sided padding
 * is the exact thing the room was rebuilt to remove: it is what made the reader
 * a card with margins instead of a place. `gutter="none"` in the layout, and
 * the room runs to every edge.
 *
 * What the room still owes the rail is the ONE inset that is not decoration.
 * The rail is `fixed left-0`, rests at 64px and opens to 176px (`hover:w-44`
 * in SceneRail.tsx) onto an opaque ground, so anything under it while it is
 * open is not dimmed, it is gone. So the scripture column - and only the
 * scripture column - is inset past the rail's OPEN width; the room's ground
 * runs on underneath, which is what keeps it one continuous surface rather
 * than a margin.
 *
 * 176px plus the pane's own `px-4 sm:px-6` puts the first glyph at 200px at
 * `lg` and 208px at `xl`, which is `SCENE_X`'s 192/208px content start or
 * better. The inset itself now lives in `components/scene/tokens.ts` beside
 * `SCENE_X` and the rail's own width, so the three numbers that have to agree
 * are stated once rather than copied into this route.
 */
export { RAIL_COLUMN } from "../../components/scene/tokens"
