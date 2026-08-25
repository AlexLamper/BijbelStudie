import { SkeletonBlock, SkeletonChapter } from "../../components/ui/skeletons"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function LezenLoading() {
  return (
    <div className="px-6 xl:px-10 py-6 space-y-6" role="status" aria-label="Bijbel laden">
      <div className="space-y-2.5">
        <SkeletonBlock className="h-6 w-52" />
        <SkeletonBlock className="h-3.5 w-64" />
      </div>
      <div className="rounded-lg border border-border p-4 lg:p-6 flex flex-wrap gap-3">
        <SkeletonBlock className="h-10 w-44 rounded-md" />
        <SkeletonBlock className="h-10 w-40 rounded-md" />
        <SkeletonBlock className="h-10 w-28 rounded-md" />
      </div>
      <div className="rounded-lg border border-border p-5 lg:p-8">
        <SkeletonChapter verses={7} />
      </div>
    </div>
  )
}
