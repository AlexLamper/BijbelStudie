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
 * THE BACKDROP IS THE DASHBOARD'S. Signed in, this is `backdrop="reader"` - the
 * reader's own tree, at the visitor's own hour, exactly what /dashboard shows -
 * because the owner's verdict on the page was "the visuals change on the
 * studies page vs the dashboard - use the SAME". The two are one click apart on
 * the rail, and a different tree in a different light at a different hour read
 * as a different product. Signed out there is no tree to draw and reader mode
 * falls back to a level disc, which is not a landscape, so a guest gets the
 * public oak as before: the static SVG, no `gateId`, so the shell keeps the
 * still picture and never mounts a canvas on a screen that already draws
 * seventy-seven generated pictures of its own.
 *
 * Everything that answers to a click lives in StudiesBrowser; the heading is
 * handed to it as children so it stays server-rendered inside the sky layer.
 *
 * The chrome is unconditional. It used to be rendered only with a session,
 * because the header bounced a guest to the sign-in page and the rail linked to
 * routes the middleware bounced to "/". Neither is true any more: the bar shows
 * a guest an Inloggen button, and every rail item leads somewhere for a guest
 * (components/auth/GuestGate.tsx). So this page - the first thing a signed-out
 * visitor sees - wears the same frame as the signed-in app, which is the point:
 * a guest is using the app, not a preview of it.
 */
export default async function StudiesPage() {
  // `authOptions` is required: without it the session callback that attaches
  // isAdmin/isSubscribed is skipped. Only the presence of a session is read
  // here - the tree itself comes from the provider the root layout mounts.
  const session = await getServerSession(authOptions)
  const signedIn = Boolean(session?.user?.email)

  const shell = signedIn
    ? ({ backdrop: 'reader' } as const)
    : ({ svg: sceneSvg(), ...SCENE_TREE } as const)

  return (
    <SceneShell {...shell} header rail>
      <JsonLd data={STUDIES_GRAPH} />

      <StudiesBrowser>
        <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
          Bijbelstudies
        </p>
        {/* One step down from the /studies/[id] display sizes on purpose. This
            heading sits above a catalogue, not above a single thing to decide
            on, and every line it costs is a line of studies pushed under the
            fold - the whole first screen has to fit a 1280x720 laptop. */}
        <h1
          id="studies-titel"
          className="mt-2 text-3xl font-semibold leading-[1.08] tracking-tight text-white drop-shadow-sm sm:text-4xl xl:text-5xl"
        >
          Wat is je volgende studie?
        </h1>
        <p className="mt-2.5 max-w-[40rem] text-[15px] leading-relaxed text-white/85 sm:text-base">
          Elk bijbelboek, en daarnaast studies over personen, thema&rsquo;s en losse gedeelten.
          Kies er een en lees stap voor stap door de Schrift.
        </p>
      </StudiesBrowser>
    </SceneShell>
  )
}
