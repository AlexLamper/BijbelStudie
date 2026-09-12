'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Link2 } from 'lucide-react';
import { useLevensboom, fracOf } from '../../../hooks/useLevensboom';
import { itemsOfKind, itemKey, type AvatarChoice, type CatalogItem, type ItemKind } from '../../../lib/levensboom/catalog';
import LevelUpDialog from '../LevelUpDialog';
import StudioStage from './StudioStage';
import { ItemGrid, KIND_TITLES, type TilePick } from './StudioTiles';
import GroeiTab from './GroeiTab';
import LockedPanel from './LockedPanel';
import AppShell from '../../shell/AppShell';

const TIME_OF_DAY_OPTIONS: { id: 'auto' | 'dawn' | 'day' | 'dusk' | 'night'; label: string }[] = [
  { id: 'auto', label: 'Automatisch' },
  { id: 'day', label: 'Dag' },
  { id: 'dusk', label: 'Avond' },
  { id: 'night', label: 'Nacht' },
];

type Tab = ItemKind | 'groei';
const TABS: { id: Tab; label: string }[] = [
  { id: 'species', label: 'Boomsoort' },
  { id: 'scene', label: 'Omgeving' },
  { id: 'animal', label: 'Dieren' },
  { id: 'ring', label: 'Ring' },
  { id: 'groei', label: 'Groei' },
];

const tabId = (id: Tab) => `boom-tab-${id}`;

/** The two pills over the scene, top left. */
const SCENE_PILL =
  'inline-flex items-center gap-[6px] rounded-full px-[14px] py-2 text-[12.5px] font-semibold text-white no-underline outline-none transition-opacity hover:opacity-90 disabled:opacity-60';

const SCENE_PILL_STYLE = { backgroundColor: 'rgba(17,24,39,.72)' } as const;

/**
 * /profiel/boom - the studio (design_handoff_web/PAGES.md §7).
 *
 * READ design_handoff_web/RULES.md §4 BEFORE CHANGING THIS FILE. The tree is
 * NOT redrawn from the prototype: the scene is still StudioStage, which mounts
 * the one live TreeCanvas this page is allowed, and everything it paints -
 * species, scene, animal, ring, time of day - is unchanged. What the redesign
 * owns is the chrome around it: the shell, the two pills, the heading, the
 * level card, and the 446 px panel on `--panel-dark` with its tabs, its hint
 * line and its two-column grid.
 *
 * Gone with the immersive shell: the scene navbar, the floating rail, the
 * three-column grid and the masthead's own toolbar. The page wears the same
 * sidebar and top bar as every other route now, and `padded={false}` lets the
 * scene and the panel meet the edges.
 *
 * Nothing about what this reads or writes moved: the same `useLevensboom` hook,
 * the same optimistic `setAvatar` / `setPrefs` / `markItemsSeen` calls, the
 * same unlock rules off the served `unlocked` list, the same share URL.
 */
export default function LevensboomStudio() {
  const { data, loading, celebrate, dismissCelebration, setAvatar, setPrefs, markItemsSeen } = useLevensboom();
  const [tab, setTab] = useState<Tab>('species');
  const [preview, setPreview] = useState<Partial<AvatarChoice>>({});
  /** The locked item the reader tapped last; the panel under the grid explains it. */
  const [lockedPick, setLockedPick] = useState<CatalogItem | null>(null);
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
      // Preview it on the whole landscape and open the panel that says what
      // it takes; nothing is written.
      setPreview({ [kind]: item.id });
      setLockedPick(item);
      return;
    }
    setPreview({});
    setLockedPick(null);
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
    setLockedPick(null);
  };

  const closeLocked = () => {
    setPreview({});
    setLockedPick(null);
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

  /* -- The scene ------------------------------------------------- */
  const scene = (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <StudioStage
        tree={
          tree && draw && data && !tree.disabled
            ? {
                seed: tree.seed,
                level: data.level,
                frac,
                health: tree.health,
                avatar: draw,
                stage: tree.stage,
                reducedMotion: tree.reducedMotion,
                timeOfDay: tree.timeOfDay,
              }
            : null
        }
      />

      {/* Two pills, top left. */}
      <div className="absolute left-[26px] top-[22px] z-10 flex gap-2">
        <Link href="/profiel" className={SCENE_PILL} style={SCENE_PILL_STYLE}>
          <ArrowLeft size={14} aria-hidden />
          Profiel
        </Link>
        <button type="button" onClick={() => void share()} disabled={!tree} className={SCENE_PILL} style={SCENE_PILL_STYLE}>
          <Link2 size={14} aria-hidden />
          {copied ? 'Link gekopieerd' : 'Deel link'}
        </button>
      </div>

      {/* The heading, straight onto the picture. */}
      <div className="absolute left-[26px] top-[86px] z-10">
        <p className="text-[11.5px] font-bold uppercase tracking-[1.4px] text-teal-bright">Voortgang</p>
        <h1
          className="mt-1 text-[40px] font-bold tracking-[-0.8px] text-white"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,.3)' }}
        >
          Je boom
        </h1>
      </div>

      {/* Where the reader stands. */}
      {data && tree && (
        <div
          className="absolute bottom-[26px] left-[26px] z-10 w-[352px] rounded-panel p-4"
          style={{ backgroundColor: 'var(--panel-card)', border: '1px solid var(--panel-border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-[58px] w-[58px] flex-none flex-col items-center justify-center rounded-[11px] bg-teal">
              <span className="text-[10px] font-bold tracking-[0.9px] text-white/80">NIVEAU</span>
              <span className="text-[22px] font-bold leading-none text-white tabular-nums">{data.level}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-bold text-white">{tree.stage.name}</p>
              <p className="mt-[2px] text-[13px] text-white/70">
                Nog <span className="font-bold">{Math.max(0, data.xpForNextLevel - data.xpIntoLevel)} XP</span> tot niveau {data.level + 1}
              </p>
            </div>
          </div>

          {/* The XP bar, with the figure inside the fill. */}
          <div
            className="relative mt-3 h-[22px] overflow-hidden rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,.14)' }}
            role="progressbar"
            aria-valuenow={data.progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-teal" style={{ width: `${data.progressPercentage}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[11.5px] font-bold text-white tabular-nums">
              {data.xpIntoLevel} / {data.xpForNextLevel} XP
            </span>
          </div>
          <div className="mt-[6px] flex justify-between text-[11px] text-white/60">
            <span>Niveau {data.level}</span>
            <span>Niveau {data.level + 1}</span>
          </div>

          <div className="my-3 h-px" style={{ backgroundColor: 'rgba(255,255,255,.14)' }} />

          {tree.nextUnlock && (
            <p className="text-[12px] text-white/70">
              Hierna ontgrendel je →{' '}
              <span className="font-semibold text-teal-bright">
                {tree.nextUnlock.name} · niveau {tree.nextUnlock.level}
              </span>
            </p>
          )}
          {tree.stage.nextName && tree.stage.nextLevel != null && (
            <p className="mt-1 text-[12px] text-white/70">
              Volgende fase → <span className="font-semibold text-white">{tree.stage.nextName} · niveau {tree.stage.nextLevel}</span>
            </p>
          )}
        </div>
      )}

      {/* Notices sit over the scene, under the heading. */}
      {(notice || (tree && tree.wilting) || (tree && tree.disabled)) && (
        <div className="absolute left-[26px] right-[26px] top-[170px] z-10 flex flex-col gap-2">
          {tree?.wilting && (
            <p
              className="max-w-[420px] rounded-[10px] px-3 py-2 text-[12px] font-medium text-white"
              style={{ backgroundColor: 'var(--panel-card)', border: '1px solid var(--panel-border)' }}
            >
              {tree.daysSinceActive} dagen niet gelezen — één sessie en hij veert op
            </p>
          )}
          {tree?.disabled && (
            <div
              className="max-w-[420px] rounded-[10px] p-4"
              style={{ backgroundColor: 'var(--panel-card)', border: '1px solid var(--panel-border)' }}
            >
              <p className="text-[13.5px] font-semibold text-white">Je boom staat uit</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/75">
                Je XP, niveau en badges lopen gewoon door — alleen de boom wordt niet getoond.
              </p>
              <button
                type="button"
                onClick={() => void setPrefs({ disabled: false })}
                className="mt-3 inline-flex h-9 items-center rounded-btn bg-teal px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Boom weer tonen
              </button>
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="flex max-w-[420px] items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-[12px]"
              style={{ backgroundColor: 'var(--panel-card)', border: '1px solid var(--panel-border)' }}
            >
              <span className="text-white">{notice.text}</span>
              {notice.pro && (
                <Link
                  href="/abonnement?bron=levensboom"
                  className="flex-shrink-0 font-semibold text-teal-bright no-underline hover:underline"
                >
                  Bekijk Pro →
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* -- The panel ------------------------------------------------- */
  const panel = (
    <aside
      className="flex w-[446px] flex-none flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--panel-dark)' }}
    >
      <h2 className="sr-only">Je boom aanpassen</h2>

      <div
        className="flex h-14 flex-none items-stretch gap-5 overflow-x-auto px-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,.1)' }}
        role="tablist"
        aria-label="Wat je kunt aanpassen"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          // Roving tabindex: Tab reaches the tablist once and lands on the tab
          // that is open; Left and Right walk the rest.
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
              className={`flex-none whitespace-nowrap border-b-2 text-[13px] outline-none transition-colors ${
                active
                  ? 'border-teal font-bold text-white'
                  : 'border-transparent font-medium text-white/60 hover:text-white/85'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <p
        className="flex-none px-5 py-[14px] text-[12.5px] leading-[1.55] text-white/60"
        style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}
      >
        {tab === 'groei'
          ? 'Wat je boom onderweg krijgt, en bij welk niveau.'
          : `${KIND_TITLES[tab as ItemKind]} · tik om te kiezen; vergrendelde keuzes laten zien wat ervoor nodig is.`}
      </p>

      <div
        id="boom-tabpaneel"
        role="tabpanel"
        aria-labelledby={tabId(tab)}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
      >
        {loading || !data || !tree ? (
          <div className="grid grid-cols-2 gap-[14px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[160px] rounded-[12px] bg-white/[0.06]" />
            ))}
          </div>
        ) : tab === 'groei' ? (
          <>
            {/* The time-of-day control has no row of its own in the design, and
                it is a display preference rather than a choice about the tree -
                so it sits at the head of the tab that is about the tree over
                time. Same handler, same values. */}
            <div className="mb-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-white/50">Tijdstip</p>
              <div
                className="mt-2 inline-flex overflow-hidden rounded-[9px]"
                style={{ border: '1px solid rgba(255,255,255,.14)' }}
                role="group"
                aria-label="Tijdstip van de boom"
              >
                {TIME_OF_DAY_OPTIONS.map((opt) => {
                  const active = (tree.timeOfDay ?? 'auto') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => void setPrefs({ timeOfDay: opt.id })}
                      aria-pressed={active}
                      className={`px-3 py-[7px] text-[12px] font-semibold outline-none transition-colors ${
                        active ? 'bg-teal text-white' : 'text-white/65 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <GroeiTab level={data.level} xp={data.xp} xpTable={data.xpTable} />
          </>
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

        {/* What a locked tile takes. Pinned to the foot of the panel, so a tap
            anywhere in the grid puts the answer on screen. */}
        {data && tree && lockedPick && lockedPick.kind === tab && (
          <div className="sticky bottom-0 z-10 mt-4 pb-1">
            <LockedPanel
              item={lockedPick}
              level={data.level}
              xp={data.xp}
              longestStreak={tree.longestStreak}
              onClose={closeLocked}
            />
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <AppShell title="Levensboom" padded={false}>
      {scene}
      {panel}

      {celebrate !== null && tree && (
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
    </AppShell>
  );
}
