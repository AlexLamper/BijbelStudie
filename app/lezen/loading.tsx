import AppShell from "../../components/shell/AppShell"
import { Skeleton } from "../../components/kit/primitives"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * Same frame as the page: the shell with no body padding, the two panes side by
 * side, the left one a hair wider with the hairline between them - so nothing
 * moves when the reader arrives.
 */
export default function LezenLoading() {
  return (
    <AppShell title="Lezen" padded={false}>
      <div
        role="status"
        aria-label="Bijbel laden"
        className="flex min-h-0 w-full flex-1 overflow-hidden bg-white"
      >
        <div className="flex min-w-0 flex-[1.05] flex-col border-r border-line">
          <div className="flex h-14 flex-none items-center gap-[9px] border-b border-line px-4">
            <Skeleton className="h-9 w-9 rounded-[9px]" />
            <Skeleton className="h-9 w-[176px] rounded-[9px]" />
            <Skeleton className="h-9 w-[140px] rounded-[9px]" />
            <Skeleton className="h-9 w-[62px] rounded-[9px]" />
          </div>
          <div className="flex-1 space-y-4 px-[30px] pt-[14px]">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 flex-none items-center gap-[14px] border-b border-line px-4">
            {[0, 1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-4 w-[78px]" />
            ))}
          </div>
          <div className="flex-1 space-y-4 px-5 pt-[18px]">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
