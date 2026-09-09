import type { Metadata } from 'next';
import { generatePageMetadata } from '../../../lib/pageMetadata';
import LevensboomStudio from '../../../components/levensboom/studio/LevensboomStudio';
import SceneShell from '../../../components/scene/SceneShell';
import { SCENE_TREE, sceneSvg } from '../../../components/scene/scene-svg';

export const metadata: Metadata = generatePageMetadata('profileTree');

/**
 * The studio, on the scene - with the scene deliberately still.
 *
 * This is the one signed-in page where the reader's live tree IS the content:
 * StudioStage already mounts a full-size animated TreeCanvas, and every tile in
 * the picking column draws the tree again. A page may mount exactly one
 * animated canvas (components/scene/README.md), so the backdrop stays on its
 * default `static` mode and is given NO `gateId` - which by design never mounts
 * a canvas at all. What is behind the studio is the landscape rendered to an
 * SVG string on the server: in the first paint, costing nothing per frame.
 *
 * `header` and `rail` are on because this route is signed-in only and the
 * layout no longer draws either.
 */
export default function LevensboomPage() {
  return (
    <SceneShell svg={sceneSvg()} {...SCENE_TREE} header rail>
      <LevensboomStudio />
    </SceneShell>
  );
}
