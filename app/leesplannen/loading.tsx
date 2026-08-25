import { SkeletonBlock, SkeletonCardGrid } from "../../components/ui/skeletons"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function LeesplannenLoading() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-7 space-y-7" role="status" aria-label="Leesplannen laden">
      <div className="space-y-2.5">
        <SkeletonBlock className="h-6 w-52" />
        <SkeletonBlock className="h-3.5 w-80" />
      </div>
      <SkeletonCardGrid count={3} imageClassName="h-24" />
    </div>
  )
}
