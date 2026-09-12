'use client';

import { useEffect, useState } from 'react';
import TreeCanvas from '../TreeCanvas';
import { ringColors } from '../../../lib/levensboom/ring';
import type { AvatarChoice } from '../../../lib/levensboom/catalog';
import type { Stage } from '../../../lib/levensboom/stages';
import { SCRIM_LEFT } from '../../scene/tokens';

/**
 * The reader's own tree, as the page itself.
 *
 * This used to be a bordered card in a column, which put a boxed tree on top of
 * a second, generic tree painted across the backdrop - two trees on one screen,
 * one of them not even theirs. So the card is gone: the reader's tree is now
 * the fixed, full-bleed landscape the studio stands in, the same way
 * components/scene/SceneBackdrop is the landscape on every other page. The
 * controls float over it.
 *
 * It cannot be SceneBackdrop, because that component's two modes are "the
 * server-rendered SVG" and "the tree from the provider" - and neither repaints
 * as the reader previews a species from the tile grid. The studio has to draw
 * `chosen + preview`, which only it knows. So the shell is assembled here, out
 * of the same parts: one canvas, then the scrims from tokens.ts, in paint
 * order.
 *
 * THE SCRIMS ARE DELIBERATELY DEEPER THAN THE SHARED ONES. Everywhere else the
 * landscape is a fixed dusk SVG; here it is `paletteForNow`, so between 09:00
 * and 18:00 the sky behind every control is #7EC8E3 -> #DFF3F7, which is very
 * nearly white. On the shared floor (black/25) white body type on a TILE
 * measures about 4.4:1 over that; on this page's floor (black/30) it measures
 * 5.9:1, and 10:1 anywhere a directional wash also reaches. At night the same
 * scrims cost the picture nothing - #232C4D is already dark.
 *
 * This is the ONE animated canvas /profiel/boom is allowed to mount
 * (components/scene/README.md). The route no longer renders SceneShell, so
 * there is no second canvas and no server SVG behind this one; the tile
 * thumbnails in StudioTiles are all `still` and run no loop.
 */
export type StageTree = {
  seed: string;
  level: number;
  frac: number;
  health: number;
  /** `chosen` merged with whatever tile the reader is previewing. */
  avatar: AvatarChoice;
  stage: Stage;
  /** The reader's stored preference. The OS setting is read here as well. */
  reducedMotion: boolean;
  /** 'auto' follows the device clock; anything else pins the scene's time of day. */
  timeOfDay?: string;
};

/**
 * The OS setting, which the stored preference alone cannot answer.
 *
 * `tree.reducedMotion` is `Boolean(prefs?.reducedMotion)` and therefore never
 * undefined, so passing it straight through means TreeCanvas's own
 * `reducedMotion ?? prefersReducedMotion()` fallback never runs and a reader
 * who asked the OS for less motion still got a swaying canvas. That mattered
 * less when the canvas was a card; it fills the whole screen now.
 */
function useOsReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);
  return reduced;
}

export default function StudioStage({ tree }: { tree: StageTree | null }) {
  const osReducedMotion = useOsReducedMotion();
  const ring = ringColors(tree?.avatar.ring);

  return (
    // `absolute`, not `fixed`: since the redesign the tree fills the studio's
    // left pane rather than the whole viewport - the sidebar and the top bar are
    // real chrome now, and the picking column is a 446 px panel beside it.
    <div className="pointer-events-none absolute inset-0 z-0">
      {/* The picture. Absent while the tree is loading and when the reader has
          turned it off - the scrims below then sit on the page's own ground,
          which is what the studio's empty state stands on. */}
      {tree && (
        <TreeCanvas
          seed={tree.seed}
          level={tree.level}
          frac={tree.frac}
          health={tree.health}
          species={tree.avatar.species}
          scene={tree.avatar.scene}
          animal={tree.avatar.animal}
          framing="scene"
          reducedMotion={tree.reducedMotion || osReducedMotion}
          timeOfDay={tree.timeOfDay as 'auto' | 'dawn' | 'day' | 'dusk' | 'night' | undefined}
          className="block h-full w-full"
          ariaLabel={`Je boom: ${tree.stage.name.toLowerCase()} op niveau ${tree.level}`}
        />
      )}

      {/* A constant floor of dark over the whole picture, so nothing on it
          depends on which hour of the day the reader opened the page. */}
      <span aria-hidden className="absolute inset-0 bg-black/30" />
      {/* The band that carries the navbar, the way back and the heading. Deeper
          and taller than the shared SCRIM_TOP, which stops at 96px: the eyebrow
          and the h1 sit below that, and #2DD4BF at 11px over a midday sky needs
          about 0.6 of black under it to clear 4.5:1. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[15rem] bg-gradient-to-b from-black/75 via-black/40 to-transparent"
      />
      {/* The left wash, which carries the two pills and the heading. */}
      <span aria-hidden className={SCRIM_LEFT} />
      {/* The bottom wash, under the level card. */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/70 via-black/25 to-transparent"
      />
      {/* The right wash is gone with the floating picking column: the choices
          now live on a solid 446 px panel that draws its own ground. */}

      {/* The ring, which used to be the stage card's border. With no card left
          it frames the world instead: a hairline at the very edge of the
          viewport and a soft glow drawn inwards from it, in the reader's own
          ring colour - so `goud` still reads as the Pro cosmetic it is. Painted
          last, over the scrims, so a wash never eats it. */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ boxShadow: `inset 0 0 0 1.5px ${ring.stroke}59, inset 0 0 160px -70px ${ring.halo}` }}
      />
    </div>
  );
}
