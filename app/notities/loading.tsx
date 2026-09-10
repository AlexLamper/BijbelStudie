import { SCENE_BG, SCENE_X, TILE } from "../../components/scene/tokens"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * Deliberately dark: /notities is now a full-bleed scene, and the light
 * skeleton this replaced flashed a white screen before the landscape arrived.
 * The ground and the gutter are the shell's own (components/scene/tokens.ts),
 * so a change to either cannot leave the loading frame behind.
 */
export default function NotitiesLoading() {
  return (
    <div
      role="status"
      aria-label="Notities laden"
      className={`min-h-screen w-full min-w-0 pt-6 ${SCENE_X}`}
      style={{ backgroundColor: SCENE_BG }}
    >
      {/* the sky: eyebrow, heading, one line of copy, the one action */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6 pb-10">
        <div className="max-w-[40rem] space-y-4">
          <div className="h-3 w-24 rounded bg-white/15" />
          <div className="h-11 w-[22rem] max-w-full rounded bg-white/15" />
          <div className="h-4 w-[26rem] max-w-full rounded bg-white/10" />
        </div>
        <div className="h-14 w-56 rounded-full bg-white/15" />
      </div>

      {/* the horizon: the toolbar */}
      <div className={`h-[4.5rem] w-full ${TILE}`} />

      {/* the desk: the ledger */}
      <div className="pt-12">
        <div className="h-3.5 w-32 rounded bg-white/15" />
        <div className="mt-4 divide-y divide-white/10 border-t border-white/15">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="py-5 sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-x-6">
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-white/15" />
                <div className="h-2.5 w-20 rounded bg-white/10" />
              </div>
              <div className="mt-3 space-y-2 sm:mt-0">
                <div className="h-3.5 w-full rounded bg-white/10" />
                <div className="h-3.5 w-4/5 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
