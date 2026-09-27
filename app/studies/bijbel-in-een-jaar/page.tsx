import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { ArrowLeft } from 'lucide-react'

import { authOptions } from '../../../lib/authOptions'
import { BIBLE_YEAR_DESCRIPTION, generatePageMetadata } from '../../../lib/pageMetadata'
import { getSchedule } from '../../../lib/bibleYear/schedule'
import type { BibleYearPlanKey, BibleYearScheduleDay } from '../../../lib/bibleYear/types'
import {
  BIBLE_YEAR_PATH,
  DEFAULT_CATALOGUE,
  DEFAULT_TRACKS,
} from '../../../lib/bibleYear/display'
import AppShell from '../../../components/shell/AppShell'
import { Card } from '../../../components/kit/primitives'
import { JsonLd } from '../../../components/seo/JsonLd'
import { absoluteUrl } from '../../../lib/seo/constants'
import { breadcrumbNode, graph, webPageNode } from '../../../lib/seo/structuredData'
import BibleYearHome from '../../../components/bibleYear/BibleYearHome'

/**
 * /studies/bijbel-in-een-jaar - the 1- and 2-year whole-Bible reading plans
 * (DAILY_HABIT_PLAN.md §4).
 *
 * A static segment, so it wins over the sibling app/studies/[id] route; no
 * study id collides with it, and middleware's member redirects only cover
 * /bijbelboeken and /bijbel. Guests (and crawlers) get a server-rendered
 * explanation with the first days of the schedule and a sign-up CTA; a
 * signed-in reader gets BibleYearHome, which loads their plan client-side.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return generatePageMetadata('bibleYear')
}

const TITLE = 'Bijbel in een jaar'
const DESCRIPTION = BIBLE_YEAR_DESCRIPTION
const PREVIEW_DAYS = 7

function isPlanKey(value: unknown): value is BibleYearPlanKey {
  return value === 'jaar-1' || value === 'jaar-2'
}

/** The first days of 1 jaar, gemengd; empty if the schedule cannot be built. */
function previewDays(): BibleYearScheduleDay[] {
  try {
    return getSchedule('jaar-1', 'gemengd').days.slice(0, PREVIEW_DAYS)
  } catch {
    return []
  }
}

export default async function BibleYearPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getServerSession(authOptions)
  const signedIn = Boolean(session?.user?.email)
  const params = await searchParams
  const initialPlan = isPlanKey(params.plan) ? params.plan : undefined

  const url = absoluteUrl(BIBLE_YEAR_PATH)
  const pageGraph = graph(
    webPageNode({ path: BIBLE_YEAR_PATH, name: TITLE, description: DESCRIPTION, breadcrumbId: `${url}#breadcrumb` }),
    breadcrumbNode(
      [
        { name: 'Home', path: '/' },
        { name: 'Studies', path: '/studies' },
        { name: TITLE, path: BIBLE_YEAR_PATH },
      ],
      url,
    ),
  )

  return (
    <AppShell title={TITLE} active="/studies" ownHeading>
      <JsonLd data={pageGraph} />
      <div className="flex min-h-full flex-col gap-4">
        <Link
          href="/studies"
          className="-mb-1 inline-flex min-h-9 flex-none items-center gap-1.5 self-start rounded-md text-[13px] font-semibold text-teal-dark no-underline outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-[#0D9488] dark:text-teal-400"
        >
          <ArrowLeft size={15} strokeWidth={2.2} aria-hidden />
          Terug naar studies
        </Link>

        <header className="flex-none">
          <h1 className="text-[25px] font-bold leading-tight tracking-[-0.5px] text-ink max-md:text-[22px]">{TITLE}</h1>
          {!signedIn && (
            <p className="mt-2 max-w-[640px] text-[14.5px] leading-[1.7] text-ink-body">{DESCRIPTION}</p>
          )}
        </header>

        {signedIn ? <BibleYearHome initialPlan={initialPlan} /> : <GuestView />}
      </div>
    </AppShell>
  )
}

function GuestView() {
  const days = previewDays()
  const next = encodeURIComponent(BIBLE_YEAR_PATH)

  return (
    <div className="flex gap-5 max-lg:flex-col max-lg:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEFAULT_CATALOGUE.map(plan => (
            <Card key={plan.planKey} className="px-[18px] py-4">
              <h2 className="text-[16px] font-bold text-ink">De Bijbel in {plan.label}</h2>
              <p className="mt-1 text-[13.5px] text-ink-muted">
                {plan.totalDays} dagen &middot; ongeveer {plan.minutesPerDay} minuten per dag
              </p>
            </Card>
          ))}
        </div>

        <Card className="px-[21px] py-[19px] max-md:px-4">
          <h2 className="text-[16px] font-bold text-ink">Zo werkt het</h2>
          <ul className="mt-[9px] list-disc space-y-1.5 pl-5 text-[14.5px] leading-[1.6] text-ink-body marker:text-[#0D9488]">
            {DEFAULT_TRACKS.map(track => (
              <li key={track.track}>
                <strong className="font-semibold text-ink">{track.label}.</strong> {track.description}
              </li>
            ))}
            <li>Elke dag is ongeveer even lang: de dagen zijn verdeeld op de lengte van de tekst, niet op het aantal hoofdstukken.</li>
            <li>Hoofdstukken die je in de Bijbel leest, worden vanzelf afgevinkt. Vooruit lezen telt ook mee.</li>
            <li>Loop je achter, dan lees je de gemiste dagen bij of schuif je je schema op. Er is geen deadline.</li>
            <li>Helemaal gratis.</li>
          </ul>
        </Card>

        {days.length > 0 && (
          <Card>
            <h2 className="px-[21px] pb-2 pt-[17px] text-[16px] font-bold text-ink max-md:px-4">
              De eerste {PREVIEW_DAYS} dagen
            </h2>
            <p className="px-[21px] text-[13px] text-ink-muted max-md:px-4">1 jaar, gemengd</p>
            <ol className="mt-2 divide-y divide-line border-t border-line">
              {days.map(day => (
                <li key={day.day} className="flex items-baseline gap-3 px-[21px] py-2.5 max-md:px-4">
                  <span className="w-[52px] flex-none text-[12px] font-semibold text-ink-faint">Dag {day.day}</span>
                  <span className="min-w-0 flex-1 text-[13.5px] text-ink-body">
                    {day.portions.map(portion => portion.label).join(' · ')}
                  </span>
                  <span className="flex-none text-[12px] tabular-nums text-ink-faint">{day.minutes} min</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>

      <div className="lg:w-[326px] lg:flex-none">
        <Card className="px-[21px] py-[19px] max-md:px-4 lg:sticky lg:top-0">
          <h2 className="text-[16px] font-bold text-ink">Begin vandaag</h2>
          <p className="mt-2 text-[14px] leading-[1.7] text-ink-body">
            Met een gratis account kies je je duur, je volgorde en je startdatum, en houden we bij waar je bent.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href={`/registreren?next=${next}`}
              data-track="bible_year_register"
              className="inline-flex h-11 items-center justify-center rounded-btn px-[22px] text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#0D9488' }}
            >
              Gratis account maken
            </Link>
            <Link
              href={`/inloggen?next=${next}`}
              data-track="bible_year_signin"
              className="inline-flex h-11 items-center justify-center rounded-btn border border-line px-[18px] text-[14px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft"
            >
              Ik heb al een account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
