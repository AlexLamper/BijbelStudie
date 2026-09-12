'use client';

import { useEffect, useState } from 'react';
import TreeCanvas from '../TreeCanvas';
import type { AvatarChoice } from '../../../lib/levensboom/catalog';
import type { Stage } from '../../../lib/levensboom/stages';

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
 * `chosen + preview`, which only it knows. So the shell is assembled here: one
 * canvas, and over it exactly one band of dark.
 *
 * ONE SCRIM, AND WHY THE OTHER FIVE WENT.
 *
 * This picture used to carry the full stack a scrolling scene page carries: a
 * flat black/30 floor, a top band, the left wash, a bottom wash, and a hairline
 * ring with a 160px glow drawn inwards from it in the reader's ring colour. On
 * a page that scrolls, dark pooling at the left and under the fold reads as
 * depth. Here nothing scrolls and the picture is a fixed rectangle beside a
 * solid panel, so the same layers read as what they geometrically are: a
 * vignette, a dark halo around the edge of the visual. The owner asked for it
 * gone, and the ring was the loudest part of it.
 *
 * The ring is not lost with it - it is drawn where a ring belongs, around the
 * avatar (TreeAvatar, NavTreeAvatar, MiniTreeAvatar, ProgressTree), and the Ring
 * tab shows each one as its own swatch. Framing the whole landscape with it was
 * a stand-in for the stage card's border, and the 446px panel is that edge now.
 *
 * WHAT THE ONE REMAINING BAND IS FOR. Two things on this page sit directly on
 * the picture with no ground of their own: the VOORTGANG eyebrow (#5EEAD4 at
 * 11.5px) and the 40px "Je boom". Everywhere else between 09:00 and 18:00 the
 * sky behind them is #7EC8E3 -> #DFF3F7, very nearly white, where that teal
 * measures 1.5:1 - unreadable. Under this band it lands at about 6:1 and the
 * heading at about 9:1. Everything else on the scene brings its own surface and
 * needs no help: the two pills are rgba(17,24,39,.72) (7.6:1 for white over the
 * brightest sky), and the level card and the notices are `--panel-card` (10.7:1
 * for white, 5:1 for the quietest line inside them). At night the band costs the
 * picture nothing - #232C4D is already dark.
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

  return (
    // `absolute`, not `fixed`: since the redesign the tree fills the studio's
    // left pane rather than the whole viewport - the sidebar and the top bar are
    // real chrome now, and the picking column is a 446 px panel beside it.
    <div className="pointer-events-none absolute inset-0 z-0">
      {/* The picture. Absent while the tree is loading and when the reader has
          turned it off - the band below then sits on the page's own ground,
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

      {/* The band under the top edge, and the only dark this page adds. It is at
          0.66 where the eyebrow sits (y 86), still 0.61 at the foot of the
          heading (y 152), and gone by 352px. Anchored to one edge and fading to
          nothing, so the picture reads as a lit sky rather than a framed scene:
          nothing pools at the left, the bottom or the corners. If it ever has to
          move, move the stops rather than adding a layer somewhere else: a
          second layer is how the halo gets back in. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[22rem]"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.72) 0%, rgba(0,0,0,.60) 48%, rgba(0,0,0,0) 100%)' }}
      />
    </div>
  );
}
