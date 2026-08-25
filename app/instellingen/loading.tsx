import { SkeletonBlock, SkeletonRows } from "../../components/ui/skeletons"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function InstellingenLoading() {
  return (
    <div role="status" aria-label="Instellingen laden">
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background space-y-2.5">
        <SkeletonBlock className="h-6 w-44" />
        <SkeletonBlock className="h-3.5 w-60" />
      </div>
      <div className="px-6 xl:px-10 py-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 dark:border-border p-5">
              <SkeletonBlock className="h-4 w-40 mb-2" />
              <SkeletonRows count={3} />
            </div>
          ))}
        </div>
        <SkeletonBlock className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}
