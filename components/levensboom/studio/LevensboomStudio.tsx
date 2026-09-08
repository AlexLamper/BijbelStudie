'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Link2 } from 'lucide-react';
import { useLevensboom, fracOf } from '../../../hooks/useLevensboom';
import { itemsOfKind, itemKey, unlockLabel, type AvatarChoice, type ItemKind } from '../../../lib/levensboom/catalog';
import { paletteForNow } from '../../../lib/levensboom/palette';
import LevelUpDialog from '../LevelUpDialog';
import StudioStage from './StudioStage';
import { ItemGrid, KIND_TITLES, type TilePick } from './StudioTiles';
import GroeiTab from './GroeiTab';
import { SkeletonPage } from '../../ui/skeletons';

const TEAL = '#0D9488';

type Tab = ItemKind | 'groei';
const TABS: { id: Tab; label: string }[] = [
  { id: 'species', label: 'Boomsoort' },
  { id: 'scene', label: 'Omgeving' },
  { id: 'animal', label: 'Dieren' },
  { id: 'ring', label: 'Ring' },
  { id: 'groei', label: 'Groei' },
];

/**
 * /profiel/boom - the studio.
 *
 * The stage takes the room a laptop gives it: on a wide screen it is the left
 * two thirds and stays put while the tiles scroll beside it, so the tree is
 * never out of sight while the reader is choosing; on a phone it is the top of
 * one column. Behind everything, the sky of the reader's own scene bleeds into
 * the page. Tapping an unlocked tile saves at once (optimistic; a 403 rolls
 * back and names the rule); tapping a locked one previews it on the stage and
 * says what it takes - the "achievable" half of the avatar. The mirror of the
 * app's `levensboom_studio_screen.dart`.
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
  // The page takes the colour of the reader's sky, so the studio reads as one
  // place rather than as a card on a form.
  const sky = useMemo(
    () => (draw ? paletteForNow(1, new Date(), { scene: draw.scene, species: draw.species }) : null),
    [draw],
  );

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

  if (loading) return <SkeletonPage fullHeight />;
  if (!data || !tree || !draw) {
    return (
      <div className="px-6 py-10 xl:px-10">
        <p className="text-sm text-muted-foreground">Je levensboom kon niet worden geladen.</p>
      </div>
    );
  }

  const frac = fracOf(data);
  const remaining = Math.max(0, data.xpForNextLevel - data.xpIntoLevel);

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

  const nextTarget = tree.nextUnlock
    ? { label: tree.nextUnlock.name, level: tree.nextUnlock.level }
    : tree.stage.nextLevel
      ? { label: tree.stage.nextName ?? '', level: tree.stage.nextLevel }
      : null;

  const share = async () => {
    if (!tree.publicProfile) {
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

  return (
    <div
      className="flex h-full flex-col"
      style={sky ? { background: `linear-gradient(180deg, ${sky.skyBottom}55 0%, ${sky.skyBottom}1a 360px, transparent 640px)` } : undefined}
    >
      <div className="flex flex-shrink-0 items-center gap-3 px-5 pb-3 pt-5 lg:px-8">
        <Link
          href="/profiel"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground no-underline hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Terug naar profiel"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-foreground">Mijn levensboom</h1>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {tree.stage.name} · niveau {data.level}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-foreground backdrop-blur hover:bg-white dark:border-white/10 dark:bg-card/70 dark:hover:bg-card"
        >
          <Link2 size={14} aria-hidden />
          {copied ? 'Link gekopieerd' : 'Deel link'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pb-12 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] xl:grid-cols-[minmax(0,1.4fr)_minmax(400px,0.6fr)] lg:items-start">
            {/* The stage column: pinned while the tiles scroll. */}
            <div className="lg:sticky lg:top-0 lg:self-start">
              {tree.disabled ? (
                <div className="rounded-3xl border border-black/10 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-card/80">
                  <p className="text-sm font-bold text-foreground">Je boom staat uit</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Je XP, niveau en badges lopen gewoon door — alleen de boom wordt niet getoond.
                  </p>
                  <button
                    onClick={() => void setPrefs({ disabled: false })}
                    className="mt-4 rounded-lg px-3 py-2 text-xs font-semibold text-white"
                    style={{ backgroundColor: TEAL }}
                  >
                    Boom weer tonen
                  </button>
                </div>
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

              {/* The progress strip: one line, not a card. */}
              <div className="mt-4 flex items-center gap-3 px-1">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${data.progressPercentage}%`, backgroundColor: TEAL }}
                  />
                </div>
                <p className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
                  nog {remaining} XP → niveau {data.level + 1}
                  {nextTarget && nextTarget.level === data.level + 1 ? ` · ${nextTarget.label}` : ''}
                </p>
              </div>
              {nextTarget && nextTarget.level > data.level + 1 && (
                <p className="mt-1 px-1 text-[11px] text-muted-foreground">
                  Volgende ontgrendeling: {nextTarget.label} op niveau {nextTarget.level}.
                </p>
              )}

              {notice && (
                <div
                  role="status"
                  className="mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs backdrop-blur"
                  style={{ borderColor: 'rgba(13,148,136,0.35)', backgroundColor: 'rgba(13,148,136,0.08)' }}
                >
                  <span className="text-foreground">{notice.text}</span>
                  {notice.pro && (
                    <Link href="/abonnement?bron=levensboom" className="flex-shrink-0 font-semibold no-underline hover:underline" style={{ color: TEAL }}>
                      Bekijk Pro →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* The picking column. */}
            <div className="min-w-0">
              <div className="flex gap-1 overflow-x-auto border-b border-black/10 dark:border-white/10" role="tablist">
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
                      className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                        active ? 'text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                      style={active ? { borderColor: TEAL } : undefined}
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
                    <p className="mb-3 text-xs text-muted-foreground">
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
