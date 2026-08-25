import { SkeletonBlock, SkeletonList } from "../../../components/ui/skeletons"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function LeesplanDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-7 space-y-7" role="status" aria-label="Leesplan laden">
      <div className="space-y-2.5">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-6 w-72" />
        <SkeletonBlock className="h-3.5 w-52" />
      </div>
      <SkeletonBlock className="h-2.5 rounded-full" />
      <SkeletonList count={4} />
    </div>
  )
}
