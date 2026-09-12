import SessionProvider from "../providers/SessionProvider"
import { SidebarProvider } from "../ui/sidebar"
import AppShell from "../shell/AppShell"
import GuestGate from "./GuestGate"

/**
 * A whole guest page for an account-bound route: the app's own shell with the
 * GuestGate card in it.
 *
 * Rendered by the LAYOUT of each such route in place of `children` when there
 * is no session, so it has to be a server component like they are.
 *
 * THE CHROME IS THE REAL THING. The same 196 px sidebar and 64 px top bar every
 * signed-in route wears, both of which are guest-aware: the bar shows an
 * Inloggen button where the account would be, and the sidebar's foot offers the
 * way in instead of the tree (components/shell/Sidebar.tsx). A guest who clicks
 * Notities therefore sees the app's own frame with the card in it - not a bare
 * page, not the marketing site, and not the immersive landscape this used to
 * draw, which is a frame the product no longer has.
 *
 * `title` is both the shell's page title and the card's eyebrow, so the bar and
 * the card name the same page.
 */
export default function GuestGateScene(props: {
  title: string
  description: string
  next: string
}) {
  return (
    <SessionProvider session={null}>
      <SidebarProvider>
        <AppShell title={props.title}>
          <GuestGate {...props} />
        </AppShell>
      </SidebarProvider>
    </SessionProvider>
  )
}
