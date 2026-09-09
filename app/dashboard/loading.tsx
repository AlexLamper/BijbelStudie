import { SCENE_X, TILE } from "../../components/scene/tokens";

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * Deliberately dark: the dashboard is a full-bleed night scene, and the light
 * skeleton this replaced flashed a white screen before the sky arrived. The
 * ground and the gutter are the shell's own (components/scene/tokens.ts), so a
 * change to either cannot leave the loading frame behind.
 */
export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Dashboard laden"
      className={`min-h-screen w-full min-w-0 bg-[#0B1220] pt-5 ${SCENE_X}`}
    >
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-between pb-32">
        <div className="h-3.5 w-36 rounded bg-white/15" />
        <div className="max-w-[46rem] space-y-4">
          <div className="h-3 w-40 rounded bg-white/15" />
          <div className="h-14 w-[26rem] max-w-full rounded bg-white/15" />
          <div className="h-4 w-[30rem] max-w-full rounded bg-white/10" />
          <div className="h-1.5 w-[30rem] max-w-full rounded-full bg-white/15" />
          <div className="h-14 w-64 rounded-full bg-white/15" />
        </div>
        <div />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-24 ${TILE}`} />
        ))}
      </div>
    </div>
  );
}
