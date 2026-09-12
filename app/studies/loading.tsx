import AppShell from "../../components/shell/AppShell"
import { Card, Skeleton } from "../../components/kit/primitives"

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
        <Skeleton className="h-[46px] w-[440px] rounded-[12px]" />
        <div className="flex gap-[9px]">
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[37px] w-[110px] rounded-full" />
          ))}
        </div>
        <Skeleton className="h-[76px] rounded-card" />
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[150px] rounded-card" />
          ))}
        </div>
        <Skeleton className="h-4 w-40" />
        <Card className="min-h-0 flex-1 overflow-hidden">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-[14px] border-t border-line-soft px-[18px] py-3 first:border-t-0">
              <Skeleton className="h-[44px] w-[44px] rounded-btn" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/5" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  )
}
