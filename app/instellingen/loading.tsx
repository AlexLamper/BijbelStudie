import AppShell from "../../components/shell/AppShell"
import { Skeleton } from "../../components/kit/primitives"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 */
export default function InstellingenLoading() {
  return (
    <AppShell title="Instellingen">
      <div role="status" aria-label="Instellingen laden" className="flex min-h-full flex-col gap-[18px]">
        <Skeleton className="h-[46px] w-[560px] rounded-[12px]" />
        <div className="flex min-h-0 flex-1 gap-[18px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
            <Skeleton className="h-[180px] rounded-card" />
            <Skeleton className="h-[240px] rounded-card" />
          </div>
          <aside className="flex w-[330px] flex-none flex-col gap-[18px]">
            <Skeleton className="h-[240px] rounded-card" />
            <Skeleton className="h-[140px] rounded-card" />
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
