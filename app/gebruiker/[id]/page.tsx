import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import connectMongoDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { buildMetadata, robotsFor } from '../../../lib/pageMetadata';
import { badgeDescription, badgeLabel } from '../../../lib/badgeCatalog';
import { PUBLIC_CARD_FIELDS, publicLevensboomCard, type PublicCardSource } from '../../../lib/levensboom/publicCard';
import { catalogItem } from '../../../lib/levensboom/catalog';
import TreeCanvas from '../../../components/levensboom/TreeCanvas';
import SceneShell from '../../../components/scene/SceneShell';
import { SCENE_TREE, sceneSvg } from '../../../components/scene/scene-svg';
import { Panel, SectionHeading } from '../../../components/scene/pieces';
import { CTA_BRAND, EYEBROW, TEAL_DEEP, TEAL_ON_DARK, TILE } from '../../../components/scene/tokens';

/**
 * /gebruiker/[id] - a reader's public tree.
 *
 * Opt-in: a 404 until the account switches "Openbaar profiel" on, and the same
 * 404 for an id that does not exist, so the page never confirms an account.
 * What it shows is the tree, the first name, the stage and level, the badges
 * and the join month - never the email, the streak or anything read.
 *
 * Static for five minutes at a time (ISR): the tree changes slowly and the
 * page depends on no session, so a shared link costs the CDN, not a render
 * per visit. Kept out of the index: a thin page per user is not content.
 *
 * On the scene, in its signed-out shape. No session is guaranteed here, so the
 * backdrop is the default `static` one - a landscape rendered to an SVG on the
 * server, in the first paint and in what a crawler gets - and neither `header`
 * nor `rail` is passed, because both read the session. No `gateId` either: this
 * visitor's tree is drawn by the live TreeCanvas below, and that is the one
 * animated canvas the page is allowed (components/scene/README.md).
 */
export const revalidate = 300;
export const dynamicParams = true;

type Params = { params: Promise<{ id: string }> };

type PublicUser = PublicCardSource & {
  name?: string;
  createdAt?: Date;
};

async function loadPublicUser(id: string): Promise<PublicUser | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectMongoDB();
  const user = (await User.findById(id)
    .select(`name createdAt ${PUBLIC_CARD_FIELDS}`)
    .lean()) as unknown as PublicUser | null;
  if (!user || !user.levensboom?.publicProfile || user.levensboom?.disabled) return null;
  return user;
}

function firstName(name: string | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'Lezer';
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const user = await loadPublicUser(id);
  if (!user) return { title: { absolute: 'BijbelStudie | Niet gevonden' }, robots: robotsFor(false) };
  const card = publicLevensboomCard(user);
  const species = catalogItem('species', card.avatar.species)?.name ?? 'Boom';
  return buildMetadata({
    title: `De boom van ${firstName(user.name)}`,
    description: `Een ${species.toLowerCase()} op niveau ${card.level} - ${card.stage.name.toLowerCase()}. Gegroeid door te lezen en te studeren in de Bijbel op BijbelStudie.`,
    path: `/gebruiker/${id}`,
    indexable: false,
    type: 'profile',
    ogEyebrow: 'Voortgang',
  });
}

export default async function PublicProfilePage({ params }: Params) {
  const { id } = await params;
  const user = await loadPublicUser(id);
  if (!user) notFound();

  const card = publicLevensboomCard(user);
  const name = firstName(user.name);
  const species = catalogItem('species', card.avatar.species);
  const scene = catalogItem('scene', card.avatar.scene);
  const animal = card.avatar.animal !== 'geen' ? catalogItem('animal', card.avatar.animal) : null;
  const badges = Array.isArray(user.badges) ? user.badges : [];
  const since = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    : null;

  return (
    <SceneShell svg={sceneSvg()} {...SCENE_TREE}>
      <main className="mx-auto w-full max-w-3xl pb-24 pt-16 sm:pt-24">
        <div className="scene-sky">
          <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
            Voortgang
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-4xl">
            De boom van {name}
          </h1>
          <p className="mt-2 text-sm text-white/80">
            {card.stage.name} · niveau {card.level}
            {since ? ` · lid sinds ${since}` : ''}
          </p>
        </div>

        {/* The one animated canvas on this page: the tree itself. */}
        <div className="mt-8 overflow-hidden rounded-3xl ring-1 ring-white/20 shadow-2xl shadow-black/40">
          <div className="aspect-[16/10] w-full bg-[#0B1027]">
            <TreeCanvas
              seed={card.seed}
              level={card.level}
              frac={0.5}
              health={card.health}
              species={card.avatar.species}
              scene={card.avatar.scene}
              animal={card.avatar.animal}
              framing="scene"
              className="block h-full w-full"
              ariaLabel={`De boom van ${name}: ${card.stage.name.toLowerCase()} op niveau ${card.level}`}
            />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Fact label="Boomsoort" value={species?.name ?? '—'} hint={species?.verse} />
          <Fact label="Omgeving" value={scene?.name ?? '—'} hint={scene?.verse} />
          <Fact label="Gezelschap" value={animal?.name ?? 'Alleen de boom'} hint={animal?.verse} />
        </dl>

        {badges.length > 0 && (
          <section className="mt-10" aria-labelledby="publiek-badges">
            <SectionHeading id="publiek-badges" title="Badges" rule />
            <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
              {badges.map((badge) => (
                <li
                  key={badge}
                  className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
                  title={badgeDescription(badge)}
                >
                  {badgeLabel(badge)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-12 text-sm italic leading-relaxed text-white/75">
          &ldquo;Want hij zal zijn als een boom, geplant aan waterbeken, die zijn vrucht geeft op zijn
          tijd.&rdquo;
          <span className="not-italic"> — Psalm 1:3</span>
        </p>

        <Panel className="mt-8 p-6" labelledBy="publiek-cta">
          <SectionHeading id="publiek-cta" title="Plant je eigen boom" />
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Je boom begint als kiem en groeit met alles wat je leest en bestudeert. Gratis, op de
            website en in de app.
          </p>
          <Link href="/inloggen" className={`mt-5 ${CTA_BRAND}`} style={{ backgroundColor: TEAL_DEEP }}>
            Gratis beginnen
          </Link>
        </Panel>
      </main>
    </SceneShell>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={`px-4 py-3.5 ${TILE}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{label}</dt>
      <dd className="m-0 mt-1 text-sm font-semibold text-white">{value}</dd>
      {hint && <dd className="m-0 mt-0.5 text-[11px] leading-snug text-white/60">{hint}</dd>}
    </div>
  );
}
