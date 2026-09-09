import { SceneSkeleton } from '../../../components/scene/pieces';
import { SCENE_X } from '../../../components/scene/tokens';

/**
 * The studio's own shape while the route segment streams in.
 *
 * The studio is three columns on a laptop - the heading and where-you-stand
 * down the left, an untouched window onto the reader's tree in the middle, and
 * the picking column down the right - and one column that scrolls over the tree
 * below `lg`. This is that geometry with nothing in it, so the masthead, the
 * progress block and the tile grid do not move when the real tree and its
 * numbers land.
 *
 * It stands on the scene's own ground (`#0B1220`, written out because Tailwind
 * reads class names as literal text), so the frame before the tree arrives
 * already belongs to the picture instead of flashing a white page. There is
 * deliberately no picture here at all: the only tree this route draws is the
 * reader's own, and it cannot be drawn until their data has arrived.
 */
export default function BoomLoading() {
  return (
    <div role="status" aria-label="Je boom laden" className="min-h-[100svh] w-full bg-[#0B1220]">
      <div className={`${SCENE_X} pt-14`}>
        <div className="lg:grid lg:h-[calc(100svh-3.5rem)] lg:grid-cols-[17rem_minmax(0,1fr)_21rem] lg:gap-8 2xl:grid-cols-[21rem_minmax(0,1fr)_25rem]">
          {/* The reading column: the way back and the share pill, the heading,
              then where-you-stand at the foot of the screen. */}
          <div className="flex min-w-0 flex-col pb-6">
            <div className="flex items-center justify-between gap-4 pt-5">
              <SceneSkeleton className="h-7 w-24 rounded-lg" />
              <SceneSkeleton className="h-7 w-28 rounded-lg" />
            </div>
            <SceneSkeleton className="mt-5 h-3 w-24" />
            <SceneSkeleton className="mt-2 h-11 w-44" />

            <div className="min-h-[34svh] flex-1 lg:min-h-[4rem]" />

            <SceneSkeleton className="mt-6 h-52 rounded-2xl" />
          </div>

          {/* The window onto the tree. */}
          <div aria-hidden className="hidden lg:block" />

          {/* The picking column. */}
          <div className="min-w-0 pb-20 lg:pb-6">
            <div className="mt-6 rounded-xl border border-white/15 bg-black/70 px-3 py-3 lg:mt-0">
              <div className="flex gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SceneSkeleton key={i} className="h-4 w-14" />
                ))}
              </div>
              <SceneSkeleton className="mt-3 h-3 w-full" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
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
