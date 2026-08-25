import { SkeletonBlock, SkeletonList } from "../../components/ui/skeletons"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function NotitiesLoading() {
  return (
    <div className="px-6 xl:px-10 py-6 space-y-6" role="status" aria-label="Notities laden">
      <div className="flex items-center justify-between gap-4">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-9 w-32 rounded-lg" />
      </div>
      <SkeletonBlock className="h-10 max-w-sm rounded-lg" />
      <SkeletonList count={5} />
    </div>
  )
}
