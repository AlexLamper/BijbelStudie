import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { MobileTabBar } from "./MobileNav";

/**
 * The frame every signed-in route hangs in: the 196 px sidebar, the 64 px top
 * bar, and a scrolling body under it. Built once, imported everywhere, never
 * varied per page - drift in the chrome is the one thing this redesign is most
 * careful about (design_handoff_web/README.md).
 *
 * `padded={false}` is for the two routes that fill the body edge to edge:
 * /lezen (two panes that touch the screen edge, no radius, no card border) and
 * /profiel/boom (the scene plus its 446 px panel).
 *
 * A server component on purpose: only the sidebar and the bar need the client,
 * so a page that is otherwise server-rendered stays that way.
 */
export default function AppShell({
  title,
  active,
  padded = true,
  children,
}: {
  title: string;
  /** Forces a sidebar row active; by default the row is derived from the URL. */
  active?: string;
  padded?: boolean;
  children: React.ReactNode;
}) {
  return (
    // `w-full min-w-0`: should a parent ever lay the shell out as a flex item,
    // it still takes the whole line instead of its content's intrinsic width
    // (which once left a strip of empty page beside the app), and `min-w-0`
    // lets the body's own truncation work rather than pushing the shell wider
    // than the viewport.
    //
    // Below md (768 px) the sidebar hides itself, the top bar grows a menu
    // button that opens it as a drawer, and MobileTabBar sits under the body as
    // an in-flow row - so the scrolling body already ends above it and no page
    // reserves padding for it. `--mobile-tabbar-h` is for a page's own `fixed`
    // bottom element. `100dvh` so the tab bar is not pushed under a mobile
    // browser's toolbar. At md and up every class here is what it was.
    <div className="flex h-screen w-full min-w-0 bg-line-soft dark:bg-background max-md:h-[100dvh] max-md:[--mobile-tabbar-h:calc(56px+env(safe-area-inset-bottom))]">
      <Sidebar active={active} />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} />
        {padded ? (
          <div className="flex-1 overflow-auto px-[28px] py-[26px] max-md:px-4 max-md:py-5">{children}</div>
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
        )}
        <MobileTabBar />
      </main>
    </div>
  );
}
