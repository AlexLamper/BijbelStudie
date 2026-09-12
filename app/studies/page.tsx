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
import AppShell from '../../components/shell/AppShell'
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
 * The study catalogue (design_handoff_web/PAGES.md §2).
 *
 * A server component on purpose: the structured-data graph is produced here and
 * is therefore in the HTML a crawler receives rather than something hydration
 * makes. Everything that answers to a click lives in StudiesBrowser.
 *
 * The page's own `h1` is the one the top bar renders ("Studies"). The hero that
 * used to stand here - an eyebrow, a display heading and a lead paragraph over
 * the landscape - is not in the redesign: this screen is a catalogue and the
 * design spends its first 46 px on the search field instead. The description a
 * crawler reads still ships, in the WebPage node below and in the route's
 * metadata.
 *
 * The chrome is unconditional and guest-aware: /studies is the first thing a
 * signed-out visitor sees, and the shell shows them an Inloggen button where
 * the account would be.
 */
export default async function StudiesPage() {
  // `authOptions` is required: without it the session callback that attaches
  // isAdmin/isSubscribed is skipped.
  await getServerSession(authOptions)

  return (
    <AppShell title="Studies">
      <JsonLd data={STUDIES_GRAPH} />
      <StudiesBrowser />
    </AppShell>
  )
}
