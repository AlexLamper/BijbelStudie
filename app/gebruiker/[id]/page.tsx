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
import { Card, Pill } from '../../../components/kit/primitives';

/**
 * /gebruiker/[id] - a reader's public tree.
 *
 * Opt-in: a 404 until the account switches "Openbaar profiel" on, and the same
 * 404 for an id that does not exist, so the page never confirms an account.
 * What it shows is the tree, the first name, the stage and level, the badges
 * and the join month - never the email, the streak or anything read. That list
 * is `lib/levensboom/publicCard.ts` and this page adds nothing to it.
 *
 * Static for five minutes at a time (ISR): the tree changes slowly and the
 * page depends on no session, so a shared link costs the CDN, not a render
 * per visit. Kept out of the index: a thin page per user is not content.
 *
 * ON THE SLATE & TEAL SYSTEM, BUT NOT IN THE APP SHELL. This is the one page a
 * stranger lands on from a shared link, so `components/shell/AppShell` - the
 * signed-in sidebar and top bar - would show a visitor a menu they cannot use.
 * It gets the same ground, cards, tokens and type as /profiel (PAGES.md §6),
 * in a single centred column with a way in at the end for someone who has no
 * account yet.
 *
 * The picture is the existing renderer (RULES.md §4), driven straight from the
 * public card. `components/kit/TreeAvatar` cannot stand in for it here: that
 * one draws *the viewer's* tree through `useLevensboom`, which on this page is
 * either nobody's or the wrong person's.
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
    <div className="min-h-screen bg-line-soft">
      {/* The only chrome a signed-out visitor gets: who this is from, and a way
          in. Same 64 px height as the app's top bar, so the page still reads as
          part of the product. */}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[600px] items-center gap-3 px-5">
          <Link href="/" className="text-[15px] font-bold tracking-[-0.2px] text-ink no-underline">
            BijbelStudie
          </Link>
          <div className="flex-1" />
          <Link
            href="/registreren"
            className="text-[13px] font-semibold text-teal no-underline hover:text-teal-dark"
          >
            Gratis beginnen
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[600px] flex-col gap-[13px] px-5 pb-16 pt-5">
        {/* Who this is: the tree first, because it is what was shared. */}
        <Card className="overflow-hidden">
          <div className="relative aspect-[16/10] w-full bg-sky">
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

          <div className="px-[18px] pb-[18px]">
            {/* The level marker /profiel puts on the avatar, here on the edge of
                the scene. `relative` so it paints over the positioned canvas,
                and hidden from screen readers because the line below already
                says the level in words. */}
            <span
              className="relative -mt-[27px] mb-[13px] flex h-[54px] w-[54px] items-center justify-center rounded-full bg-gold text-[20px] font-bold leading-none text-gold-ink tabular-nums"
              style={{ border: '3px solid var(--surface)' }}
              aria-hidden
            >
              {card.level}
            </span>

            <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
              Voortgang
            </p>
            <h1 className="mt-[6px] text-[26px] font-bold tracking-[-0.5px] text-ink">
              De boom van {name}
            </h1>
            <p className="mt-[5px] text-[13.5px] text-ink-muted">
              {card.stage.name} · niveau {card.level}
            </p>
            <p className="mt-3 text-[13.5px] leading-[1.75] text-ink-body">
              Deze boom groeit mee met alles wat {name} leest en bestudeert in de Bijbel.
            </p>
            {since && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill label={`Lid sinds ${since}`} />
              </div>
            )}
          </div>
        </Card>

        {/* What this tree is made of - all three come from the public catalogue,
            not from the account. */}
        <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-3">
          <Fact label="Boomsoort" value={species?.name ?? '-'} verse={species?.verse} />
          <Fact label="Omgeving" value={scene?.name ?? '-'} verse={scene?.verse} />
          <Fact label="Gezelschap" value={animal?.name ?? 'Alleen de boom'} verse={animal?.verse} />
        </div>

        {badges.length > 0 && (
          <Card className="p-[15px]">
            <div className="flex items-baseline gap-2">
              <span className="flex-1 text-[14.5px] font-bold text-ink">Badges</span>
              <span className="text-[21px] font-bold text-ink tabular-nums">{badges.length}</span>
              <span className="text-[12.5px] text-ink-faint">verdiend</span>
            </div>
            <div className="mt-3 h-px bg-line" />
            <ul className="m-0 mt-[15px] flex list-none flex-wrap gap-2 p-0">
              {badges.map((badge) => (
                // The description is the tooltip rather than a second line: a
                // visitor needs the name, not the rulebook.
                <li key={badge} title={badgeDescription(badge)}>
                  <Pill label={badgeLabel(badge)} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* The way in for someone who arrived here without an account. */}
        <Card className="p-5">
          <h2 className="text-[16px] font-bold text-ink">Plant je eigen boom</h2>
          <blockquote className="mt-3 rounded-[10px] bg-line-soft p-[11px]">
            <p className="m-0 font-serif text-[15px] leading-[1.8] text-scripture">
              &ldquo;Want hij zal zijn als een boom, geplant aan waterbeken, die zijn vrucht geeft op
              zijn tijd.&rdquo;
            </p>
            <cite className="mt-[6px] block text-[12px] not-italic text-ink-faint">Psalm 1:3</cite>
          </blockquote>
          <p className="mt-3 text-[13.5px] leading-[1.75] text-ink-body">
            Je boom begint als kiem en groeit met elk hoofdstuk dat je leest en elke les die je
            afrondt. Gratis, op de website en in de app.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/registreren"
              className="inline-flex h-11 items-center justify-center rounded-btn bg-teal px-5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
            >
              Maak zelf een gratis account
            </Link>
            <Link
              href="/inloggen"
              className="text-[13px] font-semibold text-teal no-underline hover:text-teal-dark"
            >
              Ik heb al een account →
            </Link>
          </div>
        </Card>

        <p className="mt-2 text-center text-[12px] text-ink-faint">
          BijbelStudie · lees en bestudeer de Bijbel in het Nederlands
        </p>
      </main>
    </div>
  );
}

/** One line of the tree's make-up: the choice, with the verse it borrows from. */
function Fact({ label, value, verse }: { label: string; value: string; verse?: string }) {
  return (
    <Card className="px-[17px] py-[15px]">
      <div className="text-[12px] text-ink-muted">{label}</div>
      <div className="mt-[6px] text-[14.5px] font-bold leading-[1.35] text-ink">{value}</div>
      {verse && <div className="mt-[3px] text-[11.5px] text-ink-faint">{verse}</div>}
    </Card>
  );
}
