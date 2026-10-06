/**
 * The shell every card in the Vriendenkring right-hand column wears: white
 * plate, 1 px line, 16 px radius, 16/18 padding, a bold 15 px title and
 * optionally one small thing on the title's right - a count, a badge.
 *
 * One component rather than the same five classes in five files, because the
 * column only reads as a column when the cards agree to the pixel.
 */
export function KringPanel({
  title,
  aside,
  children,
  footer,
}: {
  title: string
  /** The count or badge beside the title. */
  aside?: React.ReactNode
  children: React.ReactNode
  /** A link under a hairline, flush with the card's padding. */
  footer?: React.ReactNode
}) {
  return (
    <section className="rounded-card border border-line bg-surface px-[18px] py-4">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">{title}</h2>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
      {footer && <div className="mt-3 border-t border-line-soft pt-3">{footer}</div>}
    </section>
  )
}
