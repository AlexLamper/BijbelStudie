import AppShell from "../../../components/shell/AppShell"
import { Skeleton } from "../../../components/kit/primitives"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * It draws the real shell - the same one page.tsx shows while the group itself
 * is being fetched - so the frame never jumps between the two.
 */
export default function GroepDetailLoading() {
  return (
    <AppShell title="Groepen">
      <div className="max-w-[72rem]" role="status" aria-label="Groep laden">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-8 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <Skeleton className="mt-6 h-10 w-80 max-w-full" />
        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[320px] rounded-card" />
          <Skeleton className="h-[180px] rounded-card max-xl:hidden" />
        </div>
      </div>
    </AppShell>
  )
}
