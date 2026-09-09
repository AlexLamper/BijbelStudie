'use client';

import { Check, Lock } from 'lucide-react';
import TreeCanvas from '../TreeCanvas';
import { ProBadge } from '../../ui/ProBadge';
import { ringColors } from '../../../lib/levensboom/ring';
import { itemKey, unlockLabel, type AvatarChoice, type CatalogItem, type ItemKind } from '../../../lib/levensboom/catalog';
import { TEAL_DEEP, TEAL_ON_DARK } from '../../scene/tokens';

export type TilePick = { item: CatalogItem; locked: boolean };

/**
 * The shared TILE, one step deeper.
 *
 * These tiles float on the reader's own tree rather than on the fixed dusk
 * landscape every other page has, and that sky follows the reader's clock:
 * between 09:00 and 18:00 it runs to #DFF3F7. On `bg-black/40` over that, the
 * 11px caption under a tile measures about 3.7:1; on `bg-black/55` it measures
 * 5.0:1, and at night the difference costs the picture nothing. Same border,
 * same radius, same blur - only the ground is heavier.
 */
const STUDIO_TILE = 'rounded-2xl border border-white/20 bg-black/55 backdrop-blur-md';

/**
 * One tile per catalog item, drawn as the reader's own tree wearing that item,
 * so a species tile shows *their* lean and a scene tile *their* canopy on that
 * backdrop. Lock state and rule come from the served `unlocked` list; the
 * client never decides.
 *
 * The tiles sit on the landscape, so they are the scene's own surface rather
 * than white cards: literal whites throughout, and the selected marker in
 * TEAL_DEEP because it carries a white glyph. Every thumbnail is drawn `still`
 * - a grid of live canvases is the one thing this page cannot afford.
 */
export function ItemGrid({
  kind,
  items,
  seed,
  level,
  frac,
  health,
  avatar,
  selectedId,
  previewId,
  unlocked,
  seenItems,
  onPick,
}: {
  kind: ItemKind;
  items: CatalogItem[];
  seed: string;
  level: number;
  frac: number;
  health: number;
  avatar: AvatarChoice;
  selectedId: string;
  previewId: string | null;
  unlocked: ReadonlySet<string>;
  seenItems: ReadonlySet<string>;
  onPick: (pick: TilePick) => void;
}) {
  return (
    // Two columns from `lg` and no more: from there the grid is the studio's
    // picking column beside the tree rather than the full width of the page, so
    // a third column would put 130px tiles in a 22rem gutter.
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2" role="radiogroup" aria-label={KIND_TITLES[kind]}>
      {items.map((item) => {
        const key = itemKey(item);
        const isUnlocked = unlocked.has(key);
        const selected = selectedId === item.id;
        const previewing = previewId === item.id;
        const isNew = isUnlocked && item.unlock.kind !== 'free' && !seenItems.has(key);
        return (
          <ItemTile
            key={key}
            kind={kind}
            item={item}
            seed={seed}
            level={level}
            frac={frac}
            health={health}
            avatar={avatar}
            selected={selected}
            previewing={previewing}
            locked={!isUnlocked}
            isNew={isNew}
            onPick={() => onPick({ item, locked: !isUnlocked })}
          />
        );
      })}
    </div>
  );
}

export const KIND_TITLES: Record<ItemKind, string> = {
  species: 'Boomsoort',
  scene: 'Omgeving',
  animal: 'Dieren',
  ring: 'Ring',
};

function ItemTile({
  kind,
  item,
  seed,
  level,
  frac,
  health,
  avatar,
  selected,
  previewing,
  locked,
  isNew,
  onPick,
}: {
  kind: ItemKind;
  item: CatalogItem;
  seed: string;
  level: number;
  frac: number;
  health: number;
  avatar: AvatarChoice;
  selected: boolean;
  previewing: boolean;
  locked: boolean;
  isNew: boolean;
  onPick: () => void;
}) {
  const pro = item.unlock.kind === 'pro';
  const outline = selected ? TEAL_ON_DARK : previewing ? 'rgba(45,212,191,0.55)' : undefined;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${item.name}${locked ? `, vergrendeld: ${unlockLabel(item.unlock)}` : ''}`}
      onClick={onPick}
      className={`group relative flex flex-col overflow-hidden text-left outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${STUDIO_TILE}`}
      style={{
        borderColor: selected || previewing ? outline : undefined,
        boxShadow: selected ? `0 0 0 2px ${TEAL_ON_DARK}` : undefined,
      }}
    >
      <div className={`relative w-full overflow-hidden ${kind === 'species' || kind === 'ring' ? 'aspect-square' : 'aspect-[16/10]'} ${locked ? 'opacity-70 saturate-50' : ''}`}>
        <Thumb kind={kind} item={item} seed={seed} level={level} frac={frac} health={health} avatar={avatar} />
        {locked && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <Lock size={11} aria-hidden />
              {unlockLabel(item.unlock)}
            </span>
          </span>
        )}
        {selected && !locked && (
          <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-white ring-1 ring-white/40" style={{ backgroundColor: TEAL_DEEP }}>
            <Check size={14} aria-hidden />
          </span>
        )}
        {isNew && !selected && (
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: TEAL_DEEP }}>
            Nieuw
          </span>
        )}
        {pro && <ProBadge className="absolute bottom-2 right-2" />}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-white">{item.name}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/65">{item.blurb}</p>
      </div>
    </button>
  );
}

/** The picture on a tile: the reader's tree wearing the item, or a ring swatch. */
function Thumb({
  kind,
  item,
  seed,
  level,
  frac,
  health,
  avatar,
}: {
  kind: ItemKind;
  item: CatalogItem;
  seed: string;
  level: number;
  frac: number;
  health: number;
  avatar: AvatarChoice;
}) {
  if (kind === 'ring') {
    const ring = ringColors(item.id);
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/30">
        <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden>
          <defs>
            <linearGradient id={`tile-ring-${item.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={ring.from} />
              <stop offset="100%" stopColor={ring.to} />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="40" fill="none" stroke={ring.track ?? 'rgba(255,255,255,0.18)'} strokeWidth="9" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={`url(#tile-ring-${item.id})`} strokeWidth="9" strokeLinecap="round" strokeDasharray="176 76" transform="rotate(-90 50 50)" />
        </svg>
      </div>
    );
  }

  // A kiem looks the same in every species, so species tiles show the tree a
  // few levels on; scene and animal tiles show it as it is today.
  const shown = kind === 'species' ? Math.max(level, 6) : level;
  const draw: AvatarChoice = { ...avatar, [kind]: item.id } as AvatarChoice;
  return (
    <TreeCanvas
      seed={seed}
      level={shown}
      frac={frac}
      health={health}
      species={draw.species}
      scene={draw.scene}
      animal={draw.animal}
      framing={kind === 'species' ? 'portrait' : 'scene'}
      still
      className="block h-full w-full"
      ariaLabel=""
    />
  );
}
