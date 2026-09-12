import { Skeleton } from "../../../components/kit/primitives"

/**
 * Shown while the route segment streams in, so a shared link lands on the
 * page's own shape instead of an empty frame. The page itself carries no app
 * shell - a visitor may have no account - so this repeats its ground, its top
 * bar and its column rather than borrowing AppShell.
 */
export default function PubliekeBoomLoading() {
  return (
    <div className="min-h-screen bg-line-soft">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[600px] items-center px-5">
          <span className="text-[15px] font-bold tracking-[-0.2px] text-ink">BijbelStudie</span>
        </div>
      </header>
      <div
        role="status"
        aria-label="Boom laden"
        className="mx-auto flex w-full max-w-[600px] flex-col gap-[13px] px-5 pb-16 pt-5"
      >
        <Skeleton className="h-[520px] rounded-card" />
        <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-3">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-[84px] rounded-card" />
          ))}
        </div>
        <Skeleton className="h-[230px] rounded-card" />
      </div>
    </div>
  )
}
