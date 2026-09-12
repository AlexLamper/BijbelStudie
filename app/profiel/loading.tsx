import AppShell from "../../components/shell/AppShell"
import { Skeleton } from "../../components/kit/primitives"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function ProfielLoading() {
  return (
    <AppShell title="Profiel">
      <div role="status" aria-label="Profiel laden" className="flex min-h-full gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Skeleton className="h-[152px] rounded-card" />
          <div className="flex gap-[13px]">
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} className="h-[84px] flex-1 rounded-card" />
            ))}
          </div>
          <Skeleton className="min-h-[240px] flex-1 rounded-card" />
        </div>
        <aside className="flex w-[326px] flex-none flex-col gap-[13px]">
          <Skeleton className="h-[280px] rounded-card" />
          <Skeleton className="h-[180px] rounded-card" />
          <Skeleton className="h-[170px] rounded-card" />
          <Skeleton className="h-[160px] rounded-card" />
        </aside>
      </div>
    </AppShell>
  )
}
