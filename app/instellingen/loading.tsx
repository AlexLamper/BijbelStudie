import { SkeletonBlock } from "../../components/ui/skeletons"
import { PANEL, SKEL } from "../../components/scene/tokens"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * The layout is providers only now, so this renders on the bare page: it draws
 * the scene's own ground colour itself (`#0B1220`, SCENE_BG, written out because
 * Tailwind reads class names as literal text) and dresses its blocks in the
 * scene's skeleton tint rather than the theme's, which is invisible on a dark
 * ground in dark mode.
 */
export default function InstellingenLoading() {
  return (
    <div
      role="status"
      aria-label="Instellingen laden"
      className="min-h-screen w-full bg-[#0B1220] px-5 pb-20 pt-24 sm:px-8 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-16"
    >
      <div className="max-w-[46rem] space-y-3">
        <SkeletonBlock className={`h-10 w-56 ${SKEL}`} />
        <SkeletonBlock className={`h-4 w-72 ${SKEL}`} />
      </div>
      <div className="mt-12 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`p-5 sm:p-6 ${PANEL}`}>
              <SkeletonBlock className={`h-4 w-40 ${SKEL}`} />
              <div className="mt-5 space-y-3">
                <SkeletonBlock className={`h-3.5 w-full ${SKEL}`} />
                <SkeletonBlock className={`h-3.5 w-4/5 ${SKEL}`} />
                <SkeletonBlock className={`h-3.5 w-3/5 ${SKEL}`} />
              </div>
            </div>
          ))}
        </div>
        <SkeletonBlock className={`h-72 rounded-3xl ${SKEL}`} />
      </div>
    </div>
  )
}
