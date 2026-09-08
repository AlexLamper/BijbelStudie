'use client';

import TreeCanvas from './TreeCanvas';
import { useLevensboom, fracOf } from '../../hooks/useLevensboom';
import { ringColors } from '../../lib/levensboom/ring';

const TEAL = '#0D9488';

/**
 * The tree at navbar size: the reader's own tree, cropped to a disc, with the
 * level in the corner. This is the face of the account everywhere a 28 px
 * picture used to be.
 *
 * A still frame, always - at this size a sway is sub-pixel, and the canvas
 * itself refuses to animate below 64 px anyway. [fallback] stands in while
 * the state loads or when the reader has switched the tree off.
 */
export default function NavTreeAvatar({
  size = 28,
  fallback,
  showLevel = true,
  className,
}: {
  size?: number;
  fallback?: React.ReactNode;
  showLevel?: boolean;
  className?: string;
}) {
  const { data, loading } = useLevensboom();
  if (loading || !data?.levensboom || data.levensboom.disabled) return <>{fallback ?? null}</>;

  const { levensboom } = data;
  const ring = ringColors(levensboom.avatar.ring);
  const rim = levensboom.avatar.ring === 'goud' ? ring.stroke : 'var(--border, rgba(0,0,0,0.12))';
  const badge = Math.max(12, Math.round(size * 0.46));

  return (
    <span
      className={`relative inline-block flex-shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
      aria-label={`Je levensboom, niveau ${data.level}`}
    >
      <span
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{ boxShadow: `0 0 0 2px ${rim}` }}
      >
        <TreeCanvas
          seed={levensboom.seed}
          level={data.level}
          frac={fracOf(data)}
          health={levensboom.health}
          species={levensboom.avatar.species}
          scene={levensboom.avatar.scene}
          animal={levensboom.avatar.animal}
          framing="portrait"
          still
          className="block h-full w-full"
          ariaLabel=""
        />
      </span>
      {showLevel && (
        <span
          className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full border-2 border-white font-bold tabular-nums text-white dark:border-card"
          style={{
            backgroundColor: levensboom.avatar.ring === 'goud' ? ring.stroke : TEAL,
            minWidth: badge,
            height: badge,
            fontSize: Math.max(8, Math.round(badge * 0.62)),
            lineHeight: 1,
            paddingLeft: 3,
            paddingRight: 3,
          }}
        >
          {data.level}
        </span>
      )}
    </span>
  );
}
