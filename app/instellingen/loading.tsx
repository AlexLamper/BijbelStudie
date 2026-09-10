import { SkeletonBlock } from "../../components/ui/skeletons"
import { PANEL, SCENE_BG, SCENE_X, SKEL } from "../../components/scene/tokens"

/**
 * Shown while the route segment streams in, so a navigation lands on the page's
 * own shape instead of an empty frame. It unmounts as soon as the page
 * component mounts - nothing here holds it open.
 *
 * The layout is providers only, so this renders on the bare page: it draws the
 * scene's own ground colour itself (`SCENE_BG`, set through `style` because
 * Tailwind never generates a class built from a constant) and dresses its
 * blocks in the
 * scene's skeleton tint rather than the theme's, which is invisible on a dark
 * ground in dark mode.
 *
 * The gutter is `SCENE_X` itself rather than a copy of its classes. It used to
 * be a copy, and when the rail's reserved column widened the copy kept the old,
 * too-narrow inset - which is exactly what the token exists to prevent.
 *
 * The shape below is the page's shape: a short sky, then a group heading and
 * its panels at the full content width - one column, two abreast from `xl`,
 * exactly as the page's Group lays them.
 */
export default function InstellingenLoading() {
  return (
    <div
      role="status"
      aria-label="Instellingen laden"
      className={`min-h-screen w-full pb-20 pt-24 ${SCENE_X}`}
      style={{ backgroundColor: SCENE_BG }}
    >
      {/* The sky */}
      <div className="max-w-[46rem] space-y-3">
        <SkeletonBlock className={`h-9 w-56 ${SKEL}`} />
        <SkeletonBlock className={`h-4 w-72 ${SKEL}`} />
      </div>

      {/* The desk: one group heading and the panels under it, full width */}
      <div className="mt-12 w-full">
        <div className="space-y-2 border-b border-white/15 pb-3">
          <SkeletonBlock className={`h-6 w-28 ${SKEL}`} />
          <SkeletonBlock className={`h-3.5 w-80 max-w-full ${SKEL}`} />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
          {Array.from({ length: 4 }).map((_, i) => (
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
      </div>
    </div>
  )
}
