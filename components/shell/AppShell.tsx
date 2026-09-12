import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

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
    // `w-full min-w-0` is load-bearing, not belt-and-braces.
    //
    // Every one of these routes is wrapped by `SidebarProvider`, which renders
    // `<div class="flex min-h-svh w-full">` - so the shell is a FLEX ITEM. A
    // flex item defaults to `flex: 0 1 auto`, which sizes it to its content
    // instead of to the line, and the whole app rendered at the intrinsic width
    // of the widest card with a strip of empty page beside it. `w-full` sets the
    // basis to the line; `min-w-0` lets the body's own truncation work rather
    // than pushing the shell wider than the viewport.
    <div className="flex h-screen w-full min-w-0 bg-line-soft">
      <Sidebar active={active} />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} />
        {padded ? (
          <div className="flex-1 overflow-auto px-[28px] py-[26px]">{children}</div>
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
        )}
      </main>
    </div>
  );
}
