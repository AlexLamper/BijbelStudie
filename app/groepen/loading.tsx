import { SkeletonBlock } from "../../components/ui/skeletons"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function GroepenLoading() {
  return (
    <div className="px-6 xl:px-10 py-8 space-y-6" role="status" aria-label="Groepen laden">
      <div className="flex items-center justify-between gap-4">
        <SkeletonBlock className="h-6 w-36" />
        <SkeletonBlock className="h-9 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
