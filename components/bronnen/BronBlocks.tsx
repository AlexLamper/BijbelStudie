import Link from "next/link";
import type { Block, Ref, ResolvedRef } from "../../lib/content/bronnen/types";
import { isResolvedRef } from "../../lib/content/bronnen/types";

/**
 * The text of one section: headings, numbered paragraphs (articles, rules)
 * and questions with answers. Server-rendered in full, so a crawler and a
 * reader without JavaScript get every word, Scripture text included.
 *
 * Scripture references are `<details>` elements: closed they are a short chip
 * ("Rom. 14:7, 8"), open they show the Statenvertaling text of those verses
 * with a link to the whole chapter. RefToggle opens or closes all of them at
 * once, which gives the "uitgebreide" reading of a catechism booklet.
 */

function chapterHref(ref: ResolvedRef): string {
  return `/bijbel/${ref.book}/${ref.chapter}`;
}

const CHIP =
  "inline-flex items-center rounded-full border border-line px-2.5 py-[3px] text-[12.5px] font-medium text-teal-dark transition-colors hover:border-line-strong hover:bg-line-soft dark:text-teal-400";

function RefItem({ refItem }: { refItem: Ref }) {
  if (!isResolvedRef(refItem)) {
    return <span className="py-[3px] text-[12.5px] text-ink-faint">{refItem.label}</span>;
  }
  if (!refItem.text || refItem.text.length === 0) {
    return (
      <Link href={chapterHref(refItem)} prefetch={false} className={`${CHIP} no-underline`}>
        {refItem.label}
      </Link>
    );
  }
  return (
    // Closed it is one chip in the wrapping row; open it takes the full row,
    // so the verses read at the column's width beneath their chip.
    <details data-bron-ref className="group/ref open:w-full [&_summary::-webkit-details-marker]:hidden">
      <summary
        className={`${CHIP} cursor-pointer list-none group-open/ref:border-teal/40 group-open/ref:bg-teal-faint`}
      >
        {refItem.label}
      </summary>
      <div className="mb-1 mt-2 border-l-2 border-teal/40 pl-3.5">
        <p className="font-serif text-[15px] leading-[1.75] text-ink-body">
          {refItem.text.map((verse, i) => (
            <span key={verse.n}>
              {i > 0 && " "}
              <sup className="mr-0.5 font-sans text-[10px] font-semibold text-ink-faint">{verse.n}</sup>
              {verse.text}
            </span>
          ))}
        </p>
        <Link
          href={chapterHref(refItem)}
          prefetch={false}
          className="mt-1 inline-block text-[12px] font-medium text-teal-dark no-underline hover:underline dark:text-teal-400"
        >
          {refItem.bookName === "Psalmen" ? "Psalm" : refItem.bookName} {refItem.chapter} lezen
        </Link>
      </div>
    </details>
  );
}

function RefList({ refs }: { refs?: Ref[] }) {
  if (!refs || refs.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-start gap-1.5">
      {refs.map((ref, i) => (
        <RefItem key={`${ref.label}-${i}`} refItem={ref} />
      ))}
    </div>
  );
}

/** Splits on blank lines so a long answer or article keeps its paragraphs. */
function Paragraphs({ text, className }: { text: string; className: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i} className={`${className} ${i > 0 ? "mt-3" : ""} whitespace-pre-line`}>
          {para}
        </p>
      ))}
    </>
  );
}

export function BronBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-7">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h2
              key={i}
              className="pt-2 text-[12.5px] font-semibold uppercase tracking-[1.2px] text-teal-dark dark:text-teal-400"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "qa") {
          return (
            <section
              key={i}
              id={block.number != null ? `vraag-${block.number}` : undefined}
              className="scroll-mt-6"
            >
              <div className="flex gap-3.5 sm:gap-4">
                {block.number != null && (
                  <span
                    aria-label={`Vraag ${block.number}`}
                    className="mt-[1px] flex h-7 min-w-7 flex-none items-center justify-center rounded-full bg-teal-faint px-1.5 text-[12px] font-bold tabular-nums text-teal-dark dark:text-teal-400"
                  >
                    {block.number}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Paragraphs text={block.question} className="text-[16px] font-semibold leading-[1.6] text-ink" />
                  <div className="mt-2">
                    <Paragraphs
                      text={block.answer}
                      className="font-serif text-[16.5px] leading-[1.8] text-ink-body"
                    />
                  </div>
                  <RefList refs={block.refs} />
                </div>
              </div>
            </section>
          );
        }
        return (
          <section key={i} className="scroll-mt-6">
            <div className="flex gap-3.5 sm:gap-4">
              {block.number != null && (
                <span className="mt-[3px] w-7 flex-none text-right text-[13px] font-bold tabular-nums text-teal-dark dark:text-teal-400">
                  {block.number}.
                </span>
              )}
              <div className="min-w-0 flex-1">
                <Paragraphs text={block.text} className="font-serif text-[16.5px] leading-[1.8] text-ink-body" />
                <RefList refs={block.refs} />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
