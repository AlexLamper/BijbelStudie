import { SkeletonBlock, SkeletonList } from "../../../components/ui/skeletons"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function GroepDetailLoading() {
  return (
    <div className="px-6 xl:px-10 py-8 space-y-6" role="status" aria-label="Groep laden">
      <SkeletonBlock className="h-7 w-48" />
      <SkeletonBlock className="h-32 rounded-2xl" />
      <SkeletonBlock className="h-10 rounded-xl" />
      <SkeletonList count={3} />
    </div>
  )
}
