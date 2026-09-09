import { SkeletonBlock, SkeletonChapter } from "../../components/ui/skeletons"
import { EYEBROW, PLATE } from "../../components/scene/tokens"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * It streams into the layout's SceneShell, so it wears the same frame the
 * reader does: the same height maths (3.5rem of navbar, plus 3rem of pill strip
 * below `lg`), the same lit plate, the same edge-to-edge treatment on a phone.
 * The skeletons themselves stay the light-page ones - they sit INSIDE the
 * plate, not on the landscape.
 */
export default function LezenLoading() {
  return (
    <div className="flex h-[calc(100dvh-6.5rem)] flex-col pt-1 pb-2 sm:px-6 sm:pb-4 lg:h-[calc(100dvh-3.5rem)] lg:pl-24 lg:pr-10 lg:pt-5 lg:pb-5 xl:pl-28 xl:pr-16">
      <div className="flex flex-none items-center px-4 pb-1 sm:px-0">
        <span className={EYEBROW}>Lezen</span>
      </div>

      <div
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden border border-white/15 ${PLATE}`}
        role="status"
        aria-label="Bijbel laden"
      >
        <div className="h-14 flex-none flex items-center gap-3 px-3 border-b border-gray-200 dark:border-border bg-gray-50 dark:bg-card">
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
          <SkeletonBlock className="h-8 w-44 rounded-md" />
          <SkeletonBlock className="h-8 w-28 rounded-md" />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-background px-4 sm:px-6 pt-4">
          <SkeletonChapter verses={7} />
        </div>
      </div>
    </div>
  )
}
