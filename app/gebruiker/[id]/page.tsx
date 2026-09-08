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

const TEAL = '#0D9488';

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
    title: `De levensboom van ${firstName(user.name)}`,
    description: `Een ${species.toLowerCase()} op niveau ${card.level} - ${card.stage.name.toLowerCase()}. Gegroeid door te lezen en te studeren in de Bijbel op BijbelStudie.`,
    path: `/gebruiker/${id}`,
    indexable: false,
    type: 'profile',
    ogEyebrow: 'Levensboom',
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
          Levensboom
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">De levensboom van {name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {card.stage.name} · niveau {card.level}
          {since ? ` · lid sinds ${since}` : ''}
        </p>

        <div className="mt-6 overflow-hidden rounded-3xl ring-1 ring-black/5 dark:ring-white/10">
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
              ariaLabel={`De levensboom van ${name}: ${card.stage.name.toLowerCase()} op niveau ${card.level}`}
            />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Fact label="Boomsoort" value={species?.name ?? '—'} hint={species?.verse} />
          <Fact label="Omgeving" value={scene?.name ?? '—'} hint={scene?.verse} />
          <Fact label="Gezelschap" value={animal?.name ?? 'Alleen de boom'} hint={animal?.verse} />
        </dl>

        {badges.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-bold text-foreground">Badges</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <li
                  key={badge}
                  className="rounded-full border px-3 py-1 text-xs font-semibold text-foreground"
                  style={{ borderColor: 'rgba(13,148,136,0.35)', backgroundColor: 'rgba(13,148,136,0.06)' }}
                  title={badgeDescription(badge)}
                >
                  {badgeLabel(badge)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-sm italic leading-relaxed text-muted-foreground">
          &ldquo;Want hij zal zijn als een boom, geplant aan waterbeken, die zijn vrucht geeft op zijn
          tijd.&rdquo;
          <span className="not-italic"> — Psalm 1:3</span>
        </p>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card">
          <p className="text-sm font-bold text-foreground">Plant je eigen boom</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Je levensboom begint als kiem en groeit met alles wat je leest en bestudeert. Gratis, op de
            website en in de app.
          </p>
          <Link
            href="/inloggen"
            className="mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold text-white no-underline hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            Gratis beginnen
          </Link>
        </div>
      </div>
    </main>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-border dark:bg-card">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-foreground">{value}</dd>
      {hint && <dd className="mt-0.5 text-[11px] text-muted-foreground">{hint}</dd>}
    </div>
  );
}
