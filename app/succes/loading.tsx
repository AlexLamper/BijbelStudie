import AppShell from "../../components/shell/AppShell"
import { Skeleton } from "../../components/kit/primitives"

/**
 * Shown while the route segment streams in. The layout no longer draws any
 * chrome, so an empty fallback here would flash a blank screen at someone who
 * has just paid; this is the page's own frame and card shape instead. It
 * unmounts as soon as the page component mounts - nothing here holds it open.
 */
export default function SuccesLoading() {
  return (
    <AppShell title="Abonnement">
      <div className="flex min-h-full flex-col items-center justify-center">
        <div role="status" aria-label="Laden" className="w-full max-w-[38rem]">
          <Skeleton className="h-[26rem] w-full rounded-card" />
        </div>
      </div>
    </AppShell>
  )
}
