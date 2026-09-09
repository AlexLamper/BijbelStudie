import { SceneSkeleton } from "../../components/scene/pieces"
import { SCENE_X_EDGE, TILE } from "../../components/scene/tokens"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * It is the scene's ground rather than a white page: /studies is now a
 * full-bleed landscape, and a light card grid in front of it flashed a white
 * screen on every navigation into the route. `bg-[#0B1220]` is written out
 * rather than built from SCENE_BG because Tailwind reads class names as
 * literal text and never generates one spliced in from a constant.
 */
export default function StudiesLoading() {
  return (
    <div
      className={`min-h-screen w-full bg-[#0B1220] pb-20 pt-16 ${SCENE_X_EDGE}`}
      role="status"
      aria-label="Studies laden"
    >
      <div className="max-w-[46rem] space-y-4">
        <SceneSkeleton className="h-3 w-28" />
        <SceneSkeleton className="h-12 w-full max-w-[34rem]" />
        <SceneSkeleton className="h-4 w-full max-w-[30rem]" />
        <SceneSkeleton className="h-12 w-full max-w-[26rem] rounded-full" />
      </div>

      <div className="mt-14 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className={`px-5 py-4 ${TILE}`}>
            <SceneSkeleton className="h-3 w-20" />
            <SceneSkeleton className="mt-2.5 h-7 w-14" />
          </div>
        ))}
      </div>

      <ul className="m-0 mt-14 grid grid-cols-1 gap-x-10 p-0 xl:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map(index => (
          <li key={index} className="flex list-none items-center gap-4 border-b border-white/10 py-3.5">
            <SceneSkeleton className="h-[70px] w-28 flex-none rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <SceneSkeleton className="h-4 w-2/3" />
              <SceneSkeleton className="h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
