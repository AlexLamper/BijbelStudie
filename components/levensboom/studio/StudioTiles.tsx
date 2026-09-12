'use client';

import { Check, Lock } from 'lucide-react';
import TreeCanvas from '../TreeCanvas';
import { ringColors } from '../../../lib/levensboom/ring';
import { itemKey, unlockLabel, type AvatarChoice, type CatalogItem, type ItemKind } from '../../../lib/levensboom/catalog';

export type TilePick = { item: CatalogItem; locked: boolean };

/**
 * The tile, on the studio's own panel (design_handoff_web/PAGES.md §7).
 *
 * The tiles no longer float on the reader's sky - they sit on `--panel-dark`,
 * a solid 446 px column beside the tree - so the heavy scrim and the blur are
 * gone and what is left is the design's plate: radius 12, a hairline of white
 * at 14 %, and a ground of white at 6 %.
 */
const STUDIO_TILE = 'rounded-[12px] border border-white/[0.14] bg-white/[0.06]';

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
    // Two columns, always: the grid lives in a 446 px panel, and a third column
    // there would put 130 px tiles in a gutter.
    <div
      className="grid grid-cols-2 content-start gap-[14px]"
      role="radiogroup"
      aria-label={KIND_TITLES[kind]}
    >
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
  const requirement = unlockLabel(item.unlock);

  // A locked tile is still a button: tapping it previews the item on the whole
  // landscape and opens the panel that says what it takes. `aria-disabled`
  // tells assistive tech it cannot be chosen; the tile stays in the tab order.
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={locked || undefined}
      aria-label={`${item.name}${locked ? `, vergrendeld: ${requirement} nodig` : ''}`}
      onClick={onPick}
      className={`group relative flex flex-col overflow-hidden text-left outline-none transition-colors hover:border-white/30 ${STUDIO_TILE} ${
        selected ? 'border-2 border-teal' : previewing ? 'border-teal/55' : ''
      }`}
    >
      {/* A fixed 108 px plate, whatever the item is - the design's grid is two
          even columns of even tiles. */}
      <div className="relative h-[108px] w-full overflow-hidden">
        {/* Locked artwork is drained to grey so the lock reads at a glance. */}
        <div className={`h-full w-full ${locked ? 'opacity-40 grayscale' : ''}`}>
          <Thumb kind={kind} item={item} seed={seed} level={level} frac={frac} health={health} avatar={avatar} />
        </div>

        {locked && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/25" aria-hidden>
            <span
              className="inline-flex max-w-[90%] items-center gap-[5px] truncate rounded-full px-[10px] py-[5px] text-[11px] font-bold text-white"
              style={{ backgroundColor: 'rgba(17,24,39,.7)' }}
            >
              <Lock size={12} />
              {requirement}
            </span>
          </span>
        )}

        {selected && !locked && (
          <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal text-white">
            <Check size={14} aria-hidden />
          </span>
        )}

        {isNew && !selected && (
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-dark">
            Nieuw
          </span>
        )}

        {/* Gold plate, gold ink - never white on gold. */}
        {pro && (
          <span className="absolute bottom-2 right-2 rounded-[4px] bg-gold px-[5px] py-[2px] text-[10px] font-bold tracking-[0.6px] text-gold-ink">
            PRO
          </span>
        )}
      </div>

      <div className="px-3 py-[10px]">
        {locked ? (
          <>
            <p className="text-[13px] font-bold text-white/80">Vergrendeld</p>
            <p className="mt-0.5 text-[11.5px] leading-[1.4] text-white/[0.62]">
              {item.unlock.kind === 'pro' ? 'Hoort bij Pro' : `${requirement} om te openen`}
            </p>
          </>
        ) : (
          <>
            <p className="text-[13px] font-bold text-white">{item.name}</p>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-[1.4] text-white/[0.62]">{item.blurb}</p>
          </>
        )}
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
