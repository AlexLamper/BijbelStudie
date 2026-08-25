import { SkeletonBlock, SkeletonNotes, SkeletonStats } from "../../components/ui/skeletons"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function ProfielLoading() {
  return (
    <div role="status" aria-label="Profiel laden">
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background space-y-2.5">
        <SkeletonBlock className="h-6 w-36" />
        <SkeletonBlock className="h-3.5 w-52" />
      </div>
      <div className="px-6 xl:px-10 py-6 space-y-7">
        <div className="flex items-center gap-5">
          <SkeletonBlock className="h-20 w-20 rounded-full flex-shrink-0" />
          <div className="space-y-2.5 flex-1 min-w-0">
            <SkeletonBlock className="h-5 w-48" />
            <SkeletonBlock className="h-3.5 w-64" />
          </div>
        </div>
        <SkeletonStats />
        <SkeletonNotes count={3} />
      </div>
    </div>
  )
}
