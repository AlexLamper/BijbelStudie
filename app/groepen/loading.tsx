import AppShell from "../../components/shell/AppShell"
import { Card, Skeleton } from "../../components/kit/primitives"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * It draws the real shell, so the sidebar and the bar do not appear a beat
 * after the body: only the intro, the toolbar and the list are grey.
 */
export default function GroepenLoading() {
  return (
    <AppShell title="Groepen">
      <div role="status" aria-label="Groepen laden" className="max-w-[64rem]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-11 w-40 rounded-btn" />
        </div>
        <Skeleton className="mt-6 h-[104px] rounded-card" />
        <Skeleton className="mt-8 h-4 w-40" />
        <Card className="mt-3 overflow-hidden">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`space-y-2 px-[18px] py-4 ${i === 0 ? "" : "border-t border-line-soft"}`}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  )
}
