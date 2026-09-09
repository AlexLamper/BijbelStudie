import type { Metadata } from 'next';
import { generatePageMetadata } from '../../../lib/pageMetadata';
import LevensboomStudio from '../../../components/levensboom/studio/LevensboomStudio';

export const metadata: Metadata = generatePageMetadata('profileTree');

/**
 * The studio, where the reader's own tree is the page.
 *
 * This route used to mount SceneShell with a still, server-rendered SVG behind
 * a studio that drew the reader's live tree inside a card - a generic tree
 * painted across the whole background with the real one boxed on top of it.
 * Everywhere else the landscape is atmosphere; here the tree is the content, so
 * there is now exactly one of them and it fills the viewport.
 *
 * The shell that would normally come from SceneShell is assembled inside
 * LevensboomStudio instead, out of the same parts (StudioStage draws the
 * picture and the scrims, then `<Header variant="scene" />` and `<SceneRail />`
 * straight from components/scene). It has to be: SceneBackdrop can draw the
 * server SVG or the stored tree, and neither of those repaints as the reader
 * previews a species from the tile grid, which is the whole point of a studio.
 * Nothing in components/scene was changed for this.
 *
 * That leaves the route with no scene work of its own, so it stays a server
 * component that renders one client component - and the SVG the old version
 * rendered on every request is gone.
 */
export default function LevensboomPage() {
  return <LevensboomStudio />;
}
