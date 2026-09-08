'use client';

import TreeCanvas from './TreeCanvas';
import type { PublicLevensboomCard } from '../../lib/levensboom/publicCard';
import { ringColors } from '../../lib/levensboom/ring';

const TEAL = '#0D9488';

/**
 * Someone else's tree at list size: group member rows, message authors,
 * shared notes. Drawn from the public card the API hands out (seed, level,
 * resolved avatar, health) - nothing the viewer could not see by looking at
 * the tree anyway. Initials stand in for a member without a tree to show.
 */
export default function MiniTreeAvatar({
  card,
  name,
  size = 32,
  showLevel = false,
  className,
}: {
  card: PublicLevensboomCard | null | undefined;
  name: string;
  size?: number;
  showLevel?: boolean;
  className?: string;
}) {
  if (!card || card.disabled || !card.seed) {
    const initials = (name || '?')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return (
      <div
        className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${className ?? ''}`}
        style={{ width: size, height: size, backgroundColor: TEAL, fontSize: size <= 28 ? 10 : 12 }}
        aria-label={name}
      >
        {initials}
      </div>
    );
  }

  const gold = card.avatar.ring === 'goud';
  const ring = ringColors(card.avatar.ring);
  const badge = Math.max(12, Math.round(size * 0.44));

  return (
    <span
      className={`relative inline-block flex-shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
      aria-label={`Boom van ${name}, ${card.stage.name.toLowerCase()} op niveau ${card.level}`}
    >
      <span
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{ boxShadow: `0 0 0 1.5px ${gold ? ring.stroke : 'rgba(0,0,0,0.1)'}` }}
      >
        <TreeCanvas
          seed={card.seed}
          level={card.level}
          frac={0.5}
          health={card.health}
          species={card.avatar.species}
          scene={card.avatar.scene}
          animal={card.avatar.animal}
          framing="portrait"
          still
          className="block h-full w-full"
          ariaLabel=""
        />
      </span>
      {showLevel && (
        <span
          className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center rounded-full border border-white font-bold tabular-nums text-white dark:border-card"
          style={{
            backgroundColor: gold ? ring.stroke : TEAL,
            minWidth: badge,
            height: badge,
            fontSize: Math.max(8, Math.round(badge * 0.6)),
            lineHeight: 1,
            paddingLeft: 3,
            paddingRight: 3,
          }}
        >
          {card.level}
        </span>
      )}
    </span>
  );
}
