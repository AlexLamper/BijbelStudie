'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Link2 } from 'lucide-react';
import { useLevensboom, fracOf } from '../../../hooks/useLevensboom';
import { itemsOfKind, itemKey, unlockLabel, type AvatarChoice, type ItemKind } from '../../../lib/levensboom/catalog';
import LevelUpDialog from '../LevelUpDialog';
import StudioStage from './StudioStage';
import LevelProgress, { LevelProgressSkeleton } from './LevelProgress';
import { ItemGrid, KIND_TITLES, type TilePick } from './StudioTiles';
import GroeiTab from './GroeiTab';
import { Header } from '../../layout/header';
import SceneRail from '../../scene/SceneRail';
import { Panel, SceneSkeleton } from '../../scene/pieces';
import { CTA_BRAND, EYEBROW, SCENE_BG, SCENE_X, TEAL_DEEP, TEAL_ON_DARK } from '../../scene/tokens';

type Tab = ItemKind | 'groei';
const TABS: { id: Tab; label: string }[] = [
  { id: 'species', label: 'Boomsoort' },
  { id: 'scene', label: 'Omgeving' },
  { id: 'animal', label: 'Dieren' },
  { id: 'ring', label: 'Ring' },
  { id: 'groei', label: 'Groei' },
];

const tabId = (id: Tab) => `boom-tab-${id}`;

/**
 * A glass control on the landscape: the way back and the share pill.
 *
 * Padding is deliberately NOT in here - a later class in the attribute does not
 * beat an earlier one, so a caller that wanted a square icon button could not
 * override `px-3`. Each call site sets its own box.
 */
const GLASS_CONTROL =
  'inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/40 text-xs font-semibold text-white no-underline outline-none backdrop-blur-md transition-colors hover:bg-black/55 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60';

/**
 * The bar at the head of the picking column: the tabs and the one line of help.
 *
 * It is a scrim rather than a panel. Everything under it is either a tile (its
 * own surface) or the Groei block (its own), so a panel here would put a box
 * around a column of boxes; a band of dark under the type does the same job and
 * leaves the tree running behind the grid. Deep enough that the tab labels hold
 * up over a midday sky, which is the sky this page can actually have.
 */
const TAB_BAR = 'rounded-xl border border-white/15 bg-black/70 backdrop-blur-md';

/**
 * The three depth variables at their settled values.
 *
 * SceneShell normally publishes these from `useSceneDepth`, which turns them
 * with `window.scrollY` so the copy lifts away and a veil closes over the
 * picture. This page does not travel: on a laptop it is exactly one screen with
 * the picking column scrolling inside itself, and the picture is the thing the
 * reader came to look at, so nothing may ever draw a veil across it. The
 * settled values are therefore written once - the same three
 * `useSceneDepth` writes for a reader who asked for reduced motion.
 *
 * `--veil: 1` is load-bearing rather than tidy: SceneRail fades in its own dark
 * base and its right-hand hairline with it, and at 0 the rail would be a film
 * of white over a noon sky.
 */
const SETTLED_DEPTH: React.CSSProperties & Record<string, string> = {
  '--lift': '0',
  '--fade': '1',
  '--veil': '1',
};

/**
 * /profiel/boom - the studio.
 *
 * The reader's own tree IS this page. It is fixed and full-bleed (StudioStage),
 * and the studio's controls float over it on the shared glass surfaces: the way
 * back and the heading at the top left, where the reader stands at the bottom
 * left, and the picking column down the right on a laptop or scrolling up over
 * the tree on a phone. Between them is a window of untouched landscape with the
 * tree standing in it.
 *
 * What it replaced: SceneShell with a still, server-rendered SVG behind a card
 * that held the live tree - a generic tree painted across the background and
 * the reader's own boxed in a panel on top of it. Two trees, and the wrong one
 * was the big one.
 *
 * Because the backdrop has to be the tree the reader is *previewing* (chosen
 * merged with the tile under their finger), SceneBackdrop cannot draw it and
 * this component assembles the window itself: the root and its depth variables,
 * StudioStage, the navbar in its scene variant, the rail, and one content
 * layer. Everything it uses comes from components/scene - nothing there was
 * changed for this.
 *
 * Tapping an unlocked tile saves at once (optimistic; a 403 rolls back and
 * names the rule); tapping a locked one previews it - now on the whole screen -
 * and says what it takes. The mirror of the app's
 * `levensboom_studio_screen.dart`.
 *
 * Nothing about what this reads or writes moved: the same `useLevensboom`
 * hook, the same optimistic `setAvatar` / `setPrefs` / `markItemsSeen` calls,
 * the same unlock rules off the served `unlocked` list, the same share URL.
 */
export default function LevensboomStudio() {
  const { data, loading, celebrate, dismissCelebration, setAvatar, setPrefs, markItemsSeen } = useLevensboom();
  const [tab, setTab] = useState<Tab>('species');
  const [preview, setPreview] = useState<Partial<AvatarChoice>>({});
  const [notice, setNotice] = useState<{ text: string; pro?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const tree = data?.levensboom ?? null;
  const unlocked = useMemo(() => new Set(tree?.unlocked ?? []), [tree?.unlocked]);
  const seen = useMemo(() => new Set(tree?.seenItems ?? []), [tree?.seenItems]);
  const draw: AvatarChoice | null = tree ? { ...tree.avatar, ...preview } : null;

  // The "Nieuw" dots of the tab on screen are cleared once the reader has had
  // a moment to see them.
  useEffect(() => {
    if (!tree || tab === 'groei') return;
    const fresh = itemsOfKind(tab)
      .filter((item) => item.unlock.kind !== 'free')
      .map(itemKey)
      .filter((key) => unlocked.has(key) && !seen.has(key));
    if (fresh.length === 0) return;
    const id = window.setTimeout(() => void markItemsSeen(fresh), 2500);
    return () => window.clearTimeout(id);
  }, [tab, tree, unlocked, seen, markItemsSeen]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const frac = data ? fracOf(data) : 0;

  const onPick = async ({ item, locked }: TilePick) => {
    const kind = item.kind;
    if (locked) {
      setPreview({ [kind]: item.id });
      setNotice({
        text:
          item.unlock.kind === 'pro'
            ? `${item.name} is er voor Pro-leden.`
            : `${item.name}: ${unlockLabel(item.unlock)} nodig.`,
        pro: item.unlock.kind === 'pro',
      });
      return;
    }
    setPreview({});
    const result = await setAvatar({ [kind]: item.id } as Partial<AvatarChoice>);
    if (result.ok === false) {
      setNotice({
        text: result.label ? `${item.name}: ${result.label} nodig.` : 'Opslaan is niet gelukt. Probeer het nog eens.',
        pro: result.error === 'ITEM_LOCKED' && item.unlock.kind === 'pro',
      });
    }
  };

  const share = async () => {
    if (!tree || !tree.publicProfile) {
      setNotice({ text: "Zet 'Openbaar profiel' aan bij Instellingen om je boom te delen." });
      return;
    }
    const url = `${window.location.origin}/gebruiker/${tree.seed}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice({ text: url });
    }
  };

  const pickTab = (id: Tab) => {
    setTab(id);
    setPreview({});
  };

  /** Left and right walk the tabs, as a tablist is expected to. */
  const onTabKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const here = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(here + step + TABS.length) % TABS.length];
    pickTab(next.id);
    window.setTimeout(() => document.getElementById(tabId(next.id))?.focus(), 0);
  };

  /* -- The masthead, on the landscape ---------------------------- */
  // Rendered whatever the state of the data, so the heading and the way back
  // never wait on the tree: text never waits on the scene. Only the h1 is set
  // straight onto the picture - it is large enough to hold up on the top band
  // over any sky. Every smaller label on this page sits on glass.
  const masthead = (
    <div className="pt-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link href="/profiel" aria-label="Terug naar profiel" className={`${GLASS_CONTROL} px-2.5 py-1.5`}>
          {/* The arrow identifies the control - it is the way back. */}
          <ArrowLeft size={14} aria-hidden />
          Profiel
        </Link>

        <button type="button" onClick={() => void share()} className={`${GLASS_CONTROL} px-3 py-1.5`} disabled={!tree}>
          {/* The chain identifies the control - it is what the button copies. */}
          <Link2 size={14} aria-hidden />
          {copied ? 'Link gekopieerd' : 'Deel link'}
        </button>
      </div>

      <p className={`${EYEBROW} mt-5`} style={{ color: TEAL_ON_DARK }}>
        Voortgang
      </p>
      <h1 className="mt-1.5 text-4xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-5xl">Je boom</h1>
    </div>
  );

  /* -- The shell ------------------------------------------------- */
  // The picture, the navbar and the rail are the same three parts SceneShell
  // mounts, in the same order: the mobile rail is a sticky strip and has to
  // come before the content in the flow.
  const shell = (children: React.ReactNode, stage: React.ReactNode) => (
    <div style={{ ...SETTLED_DEPTH, backgroundColor: SCENE_BG }} className="relative min-h-[100svh] w-full min-w-0">
      {stage}
      <Header variant="scene" />
      <SceneRail />
      <div className={`relative z-10 ${SCENE_X}`}>{children}</div>
    </div>
  );

  /**
   * The three columns, on a laptop: what you are looking at, the window onto
   * the tree, and what you can change. Exactly one screen tall, with the
   * picking column scrolling inside itself - the tree is never pushed off
   * screen by the thing that repaints it. Below `lg` the same three become one
   * column that scrolls up over the picture.
   */
  const columns = (reading: React.ReactNode, picking: React.ReactNode) => (
    <div className="lg:grid lg:h-[calc(100svh-3.5rem)] lg:grid-cols-[17rem_minmax(0,1fr)_21rem] lg:gap-8 2xl:grid-cols-[21rem_minmax(0,1fr)_25rem]">
      <div className="flex min-w-0 flex-col pb-6 lg:min-h-0 lg:overflow-y-auto lg:pb-6">{reading}</div>
      {/* The window: nothing but the reader's tree, on every screen wide enough
          to keep one. */}
      <div aria-hidden className="hidden lg:block" />
      <div className="min-w-0 pb-20 lg:-mx-1.5 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-1.5 lg:pb-6">
        {picking}
      </div>
    </div>
  );

  if (loading) {
    return shell(
      columns(
        <>
          {masthead}
          <div className="min-h-[34svh] flex-1 lg:min-h-[4rem]" />
          <LevelProgressSkeleton className="mt-6" />
        </>,
        <>
          <div className={`${TAB_BAR} mt-6 flex gap-3 px-3 py-3 lg:mt-0`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SceneSkeleton key={i} className="h-4 w-16" />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SceneSkeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </>,
      ),
      <StudioStage tree={null} />,
    );
  }

  if (!data || !tree || !draw) {
    return shell(
      <div className="pb-20">
        {masthead}
        <Panel className="mt-8 max-w-[34rem] p-6">
          <p className="text-sm text-white/80">Je boom kon niet worden geladen.</p>
        </Panel>
      </div>,
      <StudioStage tree={null} />,
    );
  }

  return shell(
    <>
      {columns(
        <>
          {masthead}

          {/* The window onto the tree, in the reading column too: the heading
              sits at the top of the screen and where-you-stand at the foot of
              it, with the picture between them. */}
          <div className="min-h-[34svh] flex-1 lg:min-h-[4rem]" />

          {tree.wilting && (
            <p className="mt-6 rounded-xl border border-white/20 bg-black/55 px-3 py-2 text-xs font-medium text-white backdrop-blur-md">
              {tree.daysSinceActive} dagen niet gelezen — één sessie en hij veert op
            </p>
          )}

          {tree.disabled && (
            <Panel className="mt-3 p-5">
              <p className="text-sm font-semibold text-white">Je boom staat uit</p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/75">
                Je XP, niveau en badges lopen gewoon door — alleen de boom wordt niet getoond.
              </p>
              <button
                onClick={() => void setPrefs({ disabled: false })}
                className={`mt-4 ${CTA_BRAND}`}
                style={{ backgroundColor: TEAL_DEEP }}
              >
                Boom weer tonen
              </button>
            </Panel>
          )}

          {notice && (
            <div
              role="status"
              className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-black/55 px-3 py-2 text-xs backdrop-blur-md"
            >
              <span className="text-white">{notice.text}</span>
              {notice.pro && (
                <Link
                  href="/abonnement?bron=levensboom"
                  className="flex-shrink-0 rounded-md font-semibold no-underline underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white"
                  style={{ color: TEAL_ON_DARK }}
                >
                  Bekijk Pro →
                </Link>
              )}
            </div>
          )}

          {/* Where the reader stands: level, bar, and what is coming. */}
          <LevelProgress
            className="mt-3"
            level={data.level}
            xpIntoLevel={data.xpIntoLevel}
            xpForNextLevel={data.xpForNextLevel}
            progressPercentage={data.progressPercentage}
            stage={tree.stage}
            nextUnlock={tree.nextUnlock}
          />
        </>,
        <>
          {/* The page's one h2. The picking column is a column of pictures and
              a tab strip - there is no line of type in it that should be set as
              a heading, but a screen reader still needs the second landmark
              after the h1. */}
          <h2 className="sr-only">Je boom aanpassen</h2>

          <div className={`${TAB_BAR} mt-6 lg:sticky lg:top-0 lg:z-10 lg:mt-0`}>
            <div className="flex gap-0.5 overflow-x-auto px-1.5 pt-1.5" role="tablist" aria-label="Wat je kunt aanpassen">
              {TABS.map((t) => {
                const active = tab === t.id;
                // Roving tabindex: Tab reaches the tablist once and lands on the
                // tab that is open; Left and Right walk the rest.
                return (
                  <button
                    key={t.id}
                    id={tabId(t.id)}
                    role="tab"
                    aria-selected={active}
                    aria-controls="boom-tabpaneel"
                    tabIndex={active ? 0 : -1}
                    onClick={() => pickTab(t.id)}
                    onKeyDown={onTabKey}
                    className={`whitespace-nowrap rounded-md border-b-2 px-2.5 py-1.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${
                      active ? 'text-white' : 'border-transparent text-white/65 hover:text-white'
                    }`}
                    style={active ? { borderColor: TEAL_ON_DARK } : undefined}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <p className="border-t border-white/10 px-3 py-2 text-[11px] leading-snug text-white/75">
              {tab === 'groei'
                ? 'Wat je boom onderweg krijgt, en bij welk niveau.'
                : `${KIND_TITLES[tab as ItemKind]} · tik om te kiezen; vergrendelde keuzes laten zien wat ervoor nodig is.`}
            </p>
          </div>

          <div id="boom-tabpaneel" role="tabpanel" aria-labelledby={tabId(tab)} className="mt-4">
            {tab === 'groei' ? (
              <GroeiTab level={data.level} xp={data.xp} xpTable={data.xpTable} />
            ) : (
              <ItemGrid
                kind={tab}
                items={itemsOfKind(tab)}
                seed={tree.seed}
                level={data.level}
                frac={frac}
                health={tree.health}
                avatar={tree.avatar}
                selectedId={tree.chosen[tab]}
                previewId={preview[tab] ?? null}
                unlocked={unlocked}
                seenItems={seen}
                onPick={(pick) => void onPick(pick)}
              />
            )}
          </div>
        </>,
      )}

      {celebrate !== null && (
        <LevelUpDialog
          seed={tree.seed}
          level={celebrate}
          species={tree.avatar.species}
          scene={tree.avatar.scene}
          animal={tree.avatar.animal}
          reducedMotion={tree.reducedMotion}
          onClose={() => void dismissCelebration()}
        />
      )}
    </>,
    // The one animated canvas on this page. `draw` is `chosen` merged with the
    // tile the reader is previewing, so a locked pick repaints the whole
    // landscape without a round trip. Turned off, the tree is not drawn at all
    // and the scrims stand on the page's own ground.
    <StudioStage
      tree={
        tree.disabled
          ? null
          : {
              seed: tree.seed,
              level: data.level,
              frac,
              health: tree.health,
              avatar: draw,
              stage: tree.stage,
              reducedMotion: tree.reducedMotion,
            }
      }
    />,
  );
}
