import AppShell from "../../components/shell/AppShell"
import { Skeleton } from "../../components/kit/primitives"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function NotitiesLoading() {
  return (
    <AppShell title="Notities">
      <div role="status" aria-label="Notities laden" className="flex min-h-full gap-5">
        <Skeleton className="min-w-0 flex-1 rounded-card" />
        <div className="flex w-[300px] flex-none flex-col gap-[14px]">
          <Skeleton className="h-11 rounded-[12px]" />
          <Skeleton className="h-[280px] rounded-card" />
          <Skeleton className="h-[140px] rounded-card" />
        </div>
      </div>
    </AppShell>
  )
}
