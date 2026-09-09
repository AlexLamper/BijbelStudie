import { SceneSkeleton } from '../../../components/scene/pieces';
import { SCENE_X } from '../../../components/scene/tokens';

/**
 * The studio's own shape while the route segment streams in: the masthead, the
 * stage frame, the progress block beneath it and the tab row, so nothing shifts
 * when the real tree and its numbers land.
 *
 * It stands on the scene's own ground (`#0B1220`, written out because Tailwind
 * reads class names as literal text), so the frame before the landscape arrives
 * already belongs to the picture instead of flashing a white page.
 */
export default function BoomLoading() {
  return (
    <div role="status" aria-label="Je boom laden" className="min-h-screen w-full bg-[#0B1220]">
      <div className={`${SCENE_X} pb-20 pt-24`}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <SceneSkeleton className="h-8 w-8 flex-shrink-0 rounded-lg" />
              <SceneSkeleton className="h-3 w-24" />
            </div>
            <SceneSkeleton className="h-9 w-56" />
            <SceneSkeleton className="h-3.5 w-44" />
          </div>
          <SceneSkeleton className="h-8 w-28 flex-shrink-0 rounded-lg" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] lg:items-start xl:grid-cols-[minmax(0,1.4fr)_minmax(400px,0.6fr)]">
          <div>
            <SceneSkeleton className="aspect-[16/10] w-full rounded-[28px] lg:aspect-auto lg:h-[min(62vh,640px)]" />
            <SceneSkeleton className="mt-4 h-44 rounded-2xl" />
          </div>

          <div className="min-w-0">
            <div className="flex gap-3 border-b border-white/15 pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <SceneSkeleton key={i} className="h-4 w-16" />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SceneSkeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
