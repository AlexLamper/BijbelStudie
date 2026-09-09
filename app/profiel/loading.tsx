import { SceneSkeleton } from "../../components/scene/pieces"
import { SCENE_BG, SCENE_X } from "../../components/scene/tokens"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * It stands on the scene's own ground (`SCENE_BG`, set through `style` because
 * Tailwind never generates a class built from a constant) with white-on-dark
 * blocks, so the frame
 * before the landscape arrives already belongs to the picture rather than
 * flashing a white page at the reader.
 */
export default function ProfielLoading() {
  return (
    <div role="status" aria-label="Profiel laden" className="min-h-screen w-full" style={{ backgroundColor: SCENE_BG }}>
      <div className={`${SCENE_X} pb-20 pt-24`}>
        <div className="max-w-[46rem] space-y-4">
          <SceneSkeleton className="h-3 w-24" />
          <SceneSkeleton className="h-12 w-[22rem] max-w-full" />
          <SceneSkeleton className="h-4 w-[26rem] max-w-full" />
        </div>

        <div className="mt-16 grid max-w-[34rem] grid-cols-2 gap-3">
          <SceneSkeleton className="h-[5.5rem] rounded-2xl" />
          <SceneSkeleton className="h-[5.5rem] rounded-2xl" />
        </div>

        <div className="mt-14 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
          <div className="space-y-6">
            <SceneSkeleton className="h-64 rounded-2xl" />
            <SceneSkeleton className="h-48 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <SceneSkeleton className="h-64 rounded-2xl" />
            <SceneSkeleton className="h-44 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
