import SessionProvider from "../providers/SessionProvider"
import { SidebarProvider } from "../ui/sidebar"
import SceneShell from "../scene/SceneShell"
import { SCENE_TREE, sceneSvg } from "../scene/scene-svg"
import GuestGate from "./GuestGate"

/**
 * A whole guest page for an account-bound route: the shared scene with its
 * navbar and rail, and the GuestGate card in it.
 *
 * Rendered by the LAYOUT of each such route in place of `children` when there
 * is no session. The layouts are server components and this stays one too, so
 * `sceneSvg()` - which runs the tree generator - never reaches a browser bundle.
 *
 * The chrome is the real thing: the same `Header variant="scene"` (which shows
 * a guest an Inloggen button) and the same SceneRail (which shows a guest the
 * whole nav plus the way in) as every signed-in screen. A guest who clicks
 * Notities in the rail therefore sees the app's own frame with the card in it,
 * not a bare page and not the marketing site.
 *
 * `backdrop` is the static SVG on purpose: there is no reader to draw a tree
 * for. No `gateId`, so no canvas is mounted for a screen that is one card.
 */
export default function GuestGateScene(props: {
  title: string
  description: string
  next: string
}) {
  return (
    <SessionProvider session={null}>
      <SidebarProvider>
        <SceneShell svg={sceneSvg()} {...SCENE_TREE} header rail>
          <GuestGate {...props} />
        </SceneShell>
      </SidebarProvider>
    </SessionProvider>
  )
}
