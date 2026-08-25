import { SkeletonBlock, SkeletonCard, SkeletonStats } from "../../components/ui/skeletons"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Dashboard laden">
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background">
        <div className="space-y-2.5">
          <SkeletonBlock className="h-6 w-72" />
          <SkeletonBlock className="h-3.5 w-48" />
        </div>
      </div>
      <div className="px-6 xl:px-10 py-6 space-y-6">
        <SkeletonBlock className="h-[132px] rounded-2xl" />
        <SkeletonStats />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SkeletonCard className="lg:col-span-2" lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    </div>
  )
}
