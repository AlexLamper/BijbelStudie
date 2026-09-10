import { SkeletonBlock, SkeletonChapter } from "../../components/ui/skeletons"
import { RAIL_GUTTER, READING_ROOM, ROOM_HEIGHT } from "./room"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * It streams into the layout's SceneShell and wears the reading room itself:
 * the same height maths, the same `dark` scope, the same ground and the same
 * palette variables, imported from `./room` rather than copied, so the frame
 * cannot drift from the one the page renders a moment later. There is no plate
 * and no gutter to draw - the room already runs to all four edges.
 *
 * The skeletons inherit the room's tokens, so `dark:bg-secondary` resolves to
 * the navy #222B3A and reads as a shape on the ground rather than disappearing
 * into it.
 */
export default function LezenLoading() {
  return (
    <div
      className={`dark relative flex ${ROOM_HEIGHT} w-full min-w-0 flex-col overflow-hidden text-foreground`}
      style={READING_ROOM}
    >
      {/* The same two nested boxes the page builds: the outer one clears the
          strip the rail stands in, the inner one carries the pane's own
          padding. Sharing RAIL_GUTTER rather than restating a number is what
          keeps the skeleton from jumping when the page lands on top of it. */}
      <div
        className={`flex min-h-0 flex-1 flex-col ${RAIL_GUTTER}`}
        role="status"
        aria-label="Bijbel laden"
      >
        {/* The toolbar band, at the height and the recessed value the real one
            uses. */}
        <div className="h-14 flex-none flex items-center gap-3 px-3 border-b border-white/10 bg-black/25">
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
          <SkeletonBlock className="h-8 w-44 rounded-md" />
          <SkeletonBlock className="h-8 w-28 rounded-md" />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6 pt-4">
          <SkeletonChapter verses={7} />
        </div>
      </div>
    </div>
  )
}
