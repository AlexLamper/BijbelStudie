import AppShell from "../../components/shell/AppShell"
import { Skeleton } from "../../components/kit/primitives"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * It draws the real shell, so the sidebar and the bar do not appear a beat
 * after the body: only the column inside is grey.
 */
export default function StudiesLoading() {
  return (
    <AppShell title="Studies">
      <div role="status" aria-label="Studies laden" className="flex h-full flex-col gap-[13px]">
        <Skeleton className="h-[46px] w-full max-w-[440px] rounded-[12px]" />
        <Skeleton className="h-[76px] rounded-card" />
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[150px] w-[210px] flex-none rounded-card sm:w-[232px]" />
          ))}
        </div>
        <Skeleton className="h-4 w-40" />
        <div className="flex flex-wrap gap-[9px]">
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[37px] w-[110px] rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <Skeleton key={i} className="h-[160px] rounded-card" />
          ))}
        </div>
      </div>
    </AppShell>
  )
}
