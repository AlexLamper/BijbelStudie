import AppShell from '../../../components/shell/AppShell';

/**
 * The studio's own shape while the route segment streams in: the scene on the
 * left and the 446 px panel on the right, both empty. There is deliberately no
 * picture here - the only tree this route draws is the reader's own, and it
 * cannot be drawn until their data has arrived.
 */
export default function BoomLoading() {
  return (
    <AppShell title="Levensboom" padded={false}>
      <div
        role="status"
        aria-label="Je boom laden"
        className="min-w-0 flex-1"
        style={{ backgroundImage: 'var(--grad-tree-scene)' }}
      />
      <aside
        className="flex w-[446px] flex-none flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--panel-dark)' }}
      >
        <div className="h-14 flex-none" style={{ borderBottom: '1px solid rgba(255,255,255,.1)' }} />
        <div className="grid grid-cols-2 gap-[14px] px-5 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[160px] rounded-[12px] bg-white/[0.06]" />
          ))}
        </div>
      </aside>
    </AppShell>
  );
}
