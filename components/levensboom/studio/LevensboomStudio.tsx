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
import { Panel, SceneSkeleton } from '../../scene/pieces';
import { CTA_BRAND, EYEBROW, TEAL_DEEP, TEAL_ON_DARK } from '../../scene/tokens';

type Tab = ItemKind | 'groei';
const TABS: { id: Tab; label: string }[] = [
  { id: 'species', label: 'Boomsoort' },
  { id: 'scene', label: 'Omgeving' },
  { id: 'animal', label: 'Dieren' },
  { id: 'ring', label: 'Ring' },
  { id: 'groei', label: 'Groei' },
];

/**
 * A glass control on the landscape: the back arrow and the share pill.
 *
 * Padding is deliberately NOT in here - a later class in the attribute does not
 * beat an earlier one, so a caller that wanted a square icon button could not
 * override `px-3`. Each call site sets its own box.
 */
const GLASS_CONTROL =
  'inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/40 text-xs font-semibold text-white no-underline outline-none backdrop-blur-md transition-colors hover:bg-black/55 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60';

/**
 * /profiel/boom - the studio.
 *
 * The stage takes the room a laptop gives it: on a wide screen it is the left
 * two thirds and stays put while the tiles scroll beside it, so the tree is
 * never out of sight while the reader is choosing; on a phone it is the top of
 * one column. Tapping an unlocked tile saves at once (optimistic; a 403 rolls
 * back and names the rule); tapping a locked one previews it on the stage and
 * says what it takes - the "achievable" half of the avatar. The mirror of the
 * app's `levensboom_studio_screen.dart`.
 *
 * The window around it is components/scene/SceneShell, mounted by the route
 * (app/profiel/boom/page.tsx) with a STILL backdrop: the live tree here is the
 * content, and one page gets one animated canvas. Everything below therefore
 * draws on literal whites and the scene surfaces, never on theme tokens - the
 * landscape does not flip with the reader's light/dark setting.
 *
 * Nothing about what this reads or writes moved: the same `useLevensboom`
 * hook, the same optimistic `setAvatar` / `setPrefs` / `markItemsSeen` calls,
 * the same share URL.
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

  /* -- The masthead, on the landscape ---------------------------- */
  // Rendered whatever the state of the data, so the heading and the way back
  // never wait on the tree: text never waits on the scene.
  const masthead = (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-6 pt-5">
      <div className="scene-sky min-w-0">
        <div className="flex items-center gap-3">
          <Link href="/profiel" className={`${GLASS_CONTROL} h-8 w-8 justify-center`} aria-label="Terug naar profiel">
            <ArrowLeft size={16} aria-hidden />
          </Link>
          <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
            Voortgang
          </p>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-4xl">
          Mijn voortgang
        </h1>
        {tree && data ? (
          <p className="content-in mt-2 text-sm text-white/80">
            {tree.stage.name} · niveau {data.level}
          </p>
        ) : (
          <SceneSkeleton className="mt-2 h-3.5 w-44" />
        )}
      </div>

      <button type="button" onClick={() => void share()} className={`${GLASS_CONTROL} px-3 py-1.5`} disabled={!tree}>
        {/* The chain identifies the control - it is what the button copies. */}
        <Link2 size={14} aria-hidden />
        {copied ? 'Link gekopieerd' : 'Deel link'}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="pb-20">
        {masthead}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] lg:items-start xl:grid-cols-[minmax(0,1.4fr)_minmax(400px,0.6fr)]">
          <div>
            <SceneSkeleton className="aspect-[16/10] w-full rounded-[28px] lg:aspect-auto lg:h-[min(62vh,640px)]" />
            <LevelProgressSkeleton className="mt-4" />
          </div>
          <div className="min-w-0">
            <div className="flex gap-3 border-b border-white/15 pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <SceneSkeleton key={i} className="h-4 w-16" />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SceneSkeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !tree || !draw) {
    return (
      <div className="pb-20">
        {masthead}
        <Panel className="max-w-[34rem] p-6">
          <p className="text-sm text-white/80">Je boom kon niet worden geladen.</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {masthead}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] lg:items-start xl:grid-cols-[minmax(0,1.4fr)_minmax(400px,0.6fr)]">
        {/* The stage column: pinned while the tiles scroll. It clears the
            navbar, which is now drawn over the scene rather than above the
            page, and is capped to the viewport with its own scroll - a sticky
            block taller than the screen can never come to rest, and the stage
            plus the progress block can exceed it on a short laptop. */}
        <div className="lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
          {tree.disabled ? (
            <Panel className="p-6">
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
          ) : (
            <StudioStage
              seed={tree.seed}
              level={data.level}
              frac={frac}
              health={tree.health}
              avatar={draw}
              stage={tree.stage}
              reducedMotion={tree.reducedMotion}
              wilting={tree.wilting}
              daysSinceActive={tree.daysSinceActive}
              className="aspect-[16/10] w-full lg:aspect-auto lg:h-[min(62vh,640px)]"
            />
          )}

          {/* Where the reader stands: level, bar, and what is coming. */}
          <LevelProgress
            className="mt-4"
            level={data.level}
            xpIntoLevel={data.xpIntoLevel}
            xpForNextLevel={data.xpForNextLevel}
            progressPercentage={data.progressPercentage}
            stage={tree.stage}
            nextUnlock={tree.nextUnlock}
          />

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
        </div>

        {/* The picking column. */}
        <div className="min-w-0">
          <div className="flex gap-1 overflow-x-auto border-b border-white/15" role="tablist">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(t.id);
                    setPreview({});
                  }}
                  className={`-mb-px whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${
                    active ? 'text-white' : 'border-transparent text-white/60 hover:text-white'
                  }`}
                  style={active ? { borderColor: TEAL_ON_DARK } : undefined}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            {tab === 'groei' ? (
              <GroeiTab level={data.level} xp={data.xp} xpTable={data.xpTable} />
            ) : (
              <>
                <p className="mb-3 text-xs text-white/70">
                  {KIND_TITLES[tab]} · tik om te kiezen; vergrendelde keuzes laten zien wat ervoor nodig is.
                </p>
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
              </>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}
