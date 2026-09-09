import { SkeletonBlock } from '../../../components/ui/skeletons';
import { LevelProgressSkeleton } from '../../../components/levensboom/studio/LevelProgress';

/**
 * The studio's own shape while the route segment streams in: the stage frame,
 * the progress block beneath it and the tab row, so nothing shifts when the
 * real tree and its numbers land.
 */
export default function BoomLoading() {
  return (
    <div className="flex h-full flex-col" role="status" aria-label="Je boom laden">
      <div className="flex flex-shrink-0 items-center gap-3 px-5 pb-3 pt-5 lg:px-8">
        <SkeletonBlock className="h-8 w-8 flex-shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3.5 w-56" />
        </div>
        <SkeletonBlock className="h-8 w-28 flex-shrink-0 rounded-lg" />
      </div>

      <div className="px-5 pb-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] xl:grid-cols-[minmax(0,1.4fr)_minmax(400px,0.6fr)] lg:items-start">
          <div>
            <SkeletonBlock className="aspect-[16/10] w-full rounded-[28px] lg:aspect-auto lg:h-[min(62vh,640px)]" />
            <LevelProgressSkeleton className="mt-4" />
          </div>

          <div className="min-w-0">
            <div className="flex gap-3 border-b border-black/10 pb-2 dark:border-white/10">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-4 w-16" />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
