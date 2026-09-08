'use client';

import TreeCanvas from '../TreeCanvas';
import { ringColors } from '../../../lib/levensboom/ring';
import type { AvatarChoice } from '../../../lib/levensboom/catalog';
import type { Stage } from '../../../lib/levensboom/stages';

const TEAL = '#0D9488';

/**
 * The live stage: the tree in its scene, with the stage name and level in the
 * corner. A preview from the tile grid repaints this without a round trip;
 * the ring shows as the frame's own border.
 */
export default function StudioStage({
  seed,
  level,
  frac,
  health,
  avatar,
  stage,
  reducedMotion,
  wilting,
  daysSinceActive,
}: {
  seed: string;
  level: number;
  frac: number;
  health: number;
  avatar: AvatarChoice;
  stage: Stage;
  reducedMotion: boolean;
  wilting: boolean;
  daysSinceActive: number;
}) {
  const ring = ringColors(avatar.ring);
  const gold = avatar.ring === 'goud';

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        padding: 3,
        background: gold
          ? `linear-gradient(135deg, ${ring.from}, ${ring.to})`
          : 'linear-gradient(135deg, rgba(13,148,136,0.55), rgba(13,148,136,0.15))',
      }}
    >
      <div className="relative aspect-[16/10] max-h-[440px] w-full overflow-hidden rounded-[21px] bg-[#0B1027]">
        <TreeCanvas
          seed={seed}
          level={level}
          frac={frac}
          health={health}
          species={avatar.species}
          scene={avatar.scene}
          animal={avatar.animal}
          framing="scene"
          reducedMotion={reducedMotion}
          className="block h-full w-full"
          ariaLabel={`Je levensboom: ${stage.name.toLowerCase()} op niveau ${level}`}
        />

        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-bold text-white shadow"
            style={{ backgroundColor: gold ? ring.stroke : TEAL }}
          >
            Niveau {level}
          </span>
          <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            {stage.name}
          </span>
        </div>

        {wilting && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            {daysSinceActive} dagen niet gelezen — één sessie en hij veert op
          </div>
        )}
      </div>
    </div>
  );
}
