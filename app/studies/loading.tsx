import { SkeletonBlock, SkeletonCardGrid } from "../../components/ui/skeletons"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function StudiesLoading() {
  return (
    <div className="px-6 xl:px-10 py-8 space-y-7" role="status" aria-label="Studies laden">
      <div className="space-y-2.5">
        <SkeletonBlock className="h-6 w-64" />
        <SkeletonBlock className="h-3.5 w-full max-w-2xl" />
      </div>
      <SkeletonCardGrid count={6} />
    </div>
  )
}
