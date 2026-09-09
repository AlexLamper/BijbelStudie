import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/authOptions'
import { curatedStudies } from '../../lib/data/curated-studies'
import { JsonLd } from '../../components/seo/JsonLd'
import { absoluteUrl } from '../../lib/seo/constants'
import {
  graph,
  webPageNode,
  itemListNode,
  courseNode,
} from '../../lib/seo/structuredData'
import SceneShell from '../../components/scene/SceneShell'
import { SCENE_TREE, sceneSvg } from '../../components/scene/scene-svg'
import { EYEBROW, TEAL_ON_DARK } from '../../components/scene/tokens'
import StudiesBrowser from './StudiesBrowser'

/**
 * The sixty-six generated book studies are not thin duplicates of each other,
 * but they ARE near-duplicates of /bijbelboeken/[slug], which is the indexable
 * surface for a book's own content. Listing both would split the same subject
 * across two URLs and let Google pick; the study pages are marked non-indexable
 * instead, so they are deliberately absent from this graph and the sitemap.
 */
const STUDIES_GRAPH = (() => {
  const url = absoluteUrl('/studies')
  return graph(
    webPageNode({
      path: '/studies',
      name: 'Bijbelstudies',
      description:
        'Bijbelstudies over elk bijbelboek, plus studies over personen, thema\'s en gedeelten. Stap voor stap door de Schrift, gratis te volgen.',
      type: 'CollectionPage',
    }),
    itemListNode({
      pageUrl: url,
      name: 'Bijbelstudies',
      items: curatedStudies.map(study => ({
        name: study.title,
        path: `/studies/${study.id}`,
        description: study.description,
      })),
    }),
    ...curatedStudies.map(study =>
      courseNode({
        name: study.title,
        description: study.description,
        path: `/studies/${study.id}`,
        lessonCount: study.lessons.length,
        image: `/og?${new URLSearchParams({ title: study.title, subtitle: study.description }).toString()}`,
        anchor: study.id,
      })
    )
  )
})()

/**
 * The study catalogue, in the shared immersive scene.
 *
 * A server component on purpose, for two reasons. The structured-data graph and
 * the heading are produced on the server and are therefore in the HTML a
 * crawler receives rather than something hydration makes; and `sceneSvg()`
 * renders the tree to a string with the levensboom generator, which has no
 * business in a browser bundle and must never be imported from a client module.
 *
 * The backdrop is the STATIC one. This page is public - there is no session to
 * draw a reader's own tree from, and `backdrop="reader"` signed out falls back
 * to a level disc, which is not a landscape. No `gateId` either, and that is
 * deliberate: without one the shell keeps the still SVG and never mounts a
 * canvas, which is the right call on a screen that already draws seventy-seven
 * generated pictures of its own.
 *
 * Everything that answers to a click lives in StudiesBrowser; the heading is
 * handed to it as children so it stays server-rendered inside the sky layer.
 *
 * The chrome is conditional, and that condition is decided HERE, on the server,
 * rather than inside the bar. `components/layout/header.tsx` pushes an
 * unauthenticated visitor to /api/auth/signin the moment it mounts, and
 * SceneRail links to seven signed-in routes - so on a public page neither may
 * be RENDERED at all, not merely hidden. With a session they are the same
 * header and the same rail as /dashboard; without one a visitor (and a crawler)
 * gets the signed-out page with no chrome and no redirect. Reading the session
 * costs nothing new: this route is already dynamic, because the layout's own
 * `generateMetadata` and `getServerSession` both read cookies.
 */
export default async function StudiesPage() {
  const session = await getServerSession(authOptions)
  const signedIn = Boolean(session?.user?.email)

  return (
    <SceneShell svg={sceneSvg()} {...SCENE_TREE} header={signedIn} rail={signedIn}>
      <JsonLd data={STUDIES_GRAPH} />

      <StudiesBrowser>
        <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
          Bijbelstudies
        </p>
        <h1
          id="studies-titel"
          className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl xl:text-6xl"
        >
          Wat is je volgende studie?
        </h1>
        <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-white/85 sm:text-lg">
          Elk bijbelboek, en daarnaast studies over personen, thema&rsquo;s en losse gedeelten.
          Kies er een en lees stap voor stap door de Schrift.
        </p>
      </StudiesBrowser>
    </SceneShell>
  )
}
