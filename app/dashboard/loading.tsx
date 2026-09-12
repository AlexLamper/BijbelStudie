import AppShell from "../../components/shell/AppShell";
import { Card, Skeleton } from "../../components/kit/primitives";

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * It draws the real shell, so the sidebar and the bar do not appear a beat
 * after the body: only the two columns inside are grey.
 */
export default function DashboardLoading() {
  return (
    <AppShell title="Dashboard">
      <div role="status" aria-label="Dashboard laden" className="flex min-h-full gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
          <Skeleton className="h-[218px] rounded-card" />
          <Skeleton className="h-[188px] rounded-card" />
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-3 gap-[14px]">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-[160px] rounded-card" />
            ))}
          </div>
        </div>
        <aside className="flex w-[320px] flex-none flex-col gap-4">
          <Card className="flex-none p-[18px]">
            <Skeleton className="h-16 w-full" />
          </Card>
          <Card className="flex-none p-[18px]">
            <Skeleton className="h-[110px] w-full" />
          </Card>
          <Card className="flex-none p-[18px]">
            <Skeleton className="h-[260px] w-full" />
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
