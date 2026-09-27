"use client";

import { useState } from "react";
import Link from "next/link";
import type { Block, Ref, ResolvedRef } from "../../lib/content/bronnen/types";
import { isResolvedRef } from "../../lib/content/bronnen/types";
import { useBronPref } from "./useBronProgress";

/**
 * The text of one section: headings, numbered paragraphs (articles, rules)
 * and questions with answers, in the reading face at the reader's text size.
 *
 * Scripture references are small numbered labels at the end of the text they
 * belong to (the data keeps a block's references together, as the printed
 * margin does). A label opens the Statenvertaling text of those verses under
 * the block. Every panel is in the prerendered HTML - closed ones carry
 * `hidden` - so a crawler and a reader without JavaScript still get every
 * word. "Schriftteksten voluit" (reader settings) opens all of them; a label
 * then closes its own.
 */

export const TEXT_SIZES: Record<string, number> = { sm: 16, md: 18, lg: 20, xl: 22 };

function chapterHref(ref: ResolvedRef): string {
  return `/bijbel/${ref.book}/${ref.chapter}`;
}

function RefPanel({ refItem, n, id, open }: { refItem: Ref; n: number; id: string; open: boolean }) {
  return (
    <div id={id} hidden={!open} className="border-l-2 border-teal/40 pl-3.5 font-sans">
      <p className="flex items-baseline gap-2 text-[12.5px] font-semibold text-teal-dark dark:text-teal-400">
        <span className="tabular-nums">{n}</span>
        <span>{refItem.label}</span>
      </p>
      {isResolvedRef(refItem) && refItem.text && refItem.text.length > 0 && (
        <p className="mt-1 font-serif text-[0.86em] leading-[1.75] text-ink-body">
          {refItem.text.map((verse, i) => (
            <span key={verse.n}>
              {i > 0 && " "}
              <sup className="mr-0.5 font-sans text-[10px] font-semibold text-ink-faint">{verse.n}</sup>
              {verse.text}
            </span>
          ))}
        </p>
      )}
      {isResolvedRef(refItem) && (
        <Link
          href={chapterHref(refItem)}
          prefetch={false}
          className="mt-1 inline-block text-[12px] font-medium text-teal-dark no-underline hover:underline dark:text-teal-400"
        >
          {refItem.bookName === "Psalmen" ? "Psalm" : refItem.bookName} {refItem.chapter} lezen
        </Link>
      )}
    </div>
  );
}

/**
 * A block's text with its reference labels after the last paragraph, and the
 * panels below. `open` is the block's own toggles, XOR'd with "voluit".
 */
function WithRefs({
  blockKey,
  text,
  className,
  refs,
  allOpen,
}: {
  blockKey: string;
  text: string;
  className: string;
  refs?: Ref[];
  allOpen: boolean;
}) {
  const [toggled, setToggled] = useState<ReadonlySet<number>>(() => new Set());
  const paras = text.split(/\n\s*\n/);
  const list = refs ?? [];
  const isOpen = (i: number) => allOpen !== toggled.has(i);
  const toggle = (i: number) =>
    setToggled(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <>
      {paras.map((para, p) => (
        <p key={p} className={`${className} ${p > 0 ? "mt-3" : ""} whitespace-pre-line`}>
          {para}
          {p === paras.length - 1 &&
            list.map((ref, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen(i)}
                aria-controls={`${blockKey}-ref-${i}`}
                aria-label={`Schrifttekst ${ref.label}`}
                title={ref.label}
                className={`ml-1 inline-flex min-w-[1.5em] -translate-y-[0.4em] items-center justify-center rounded-[5px] px-1 py-px align-baseline font-sans text-[0.6em] font-semibold leading-[1.4] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
                  isOpen(i)
                    ? "text-white"
                    : "bg-teal-faint text-teal-dark hover:bg-[var(--teal-wash)] dark:text-teal-400"
                }`}
                style={isOpen(i) ? { backgroundColor: "#0D9488" } : undefined}
              >
                {i + 1}
              </button>
            ))}
        </p>
      ))}
      {list.length > 0 && (
        <div className={list.some((_, i) => isOpen(i)) ? "mt-3 space-y-3" : ""}>
          {list.map((ref, i) => (
            <RefPanel key={i} refItem={ref} n={i + 1} id={`${blockKey}-ref-${i}`} open={isOpen(i)} />
          ))}
        </div>
      )}
    </>
  );
}

export function BronBlocks({ blocks }: { blocks: Block[] }) {
  const [size] = useBronPref("text-size", "md");
  const [refsOpen] = useBronPref("refs-open", "0");
  const allOpen = refsOpen === "1";

  return (
    <div className="space-y-8" style={{ fontSize: `${TEXT_SIZES[size] ?? TEXT_SIZES.md}px` }}>
      {blocks.map((block, i) => {
        const key = `b${i}`;
        if (block.type === "heading") {
          return (
            <h2
              key={key}
              className="pt-2 text-[12.5px] font-semibold uppercase tracking-[1.2px] text-teal-dark dark:text-teal-400"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "qa") {
          return (
            <section
              key={key}
              id={block.number != null ? `vraag-${block.number}` : undefined}
              className="scroll-mt-6"
            >
              <div className="flex gap-3.5 sm:gap-4">
                {block.number != null && (
                  <span
                    aria-label={`Vraag ${block.number}`}
                    className="mt-[3px] flex h-7 min-w-7 flex-none items-center justify-center rounded-full bg-teal-faint px-1.5 text-[12px] font-bold tabular-nums text-teal-dark dark:text-teal-400"
                  >
                    {block.number}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {block.question.split(/\n\s*\n/).map((para, p) => (
                    <p
                      key={p}
                      className={`${p > 0 ? "mt-3" : ""} whitespace-pre-line text-[0.92em] font-semibold leading-[1.6] text-ink`}
                    >
                      {para}
                    </p>
                  ))}
                  <div className="mt-2">
                    <WithRefs
                      blockKey={key}
                      text={block.answer}
                      className="font-serif leading-[1.85] text-ink-body"
                      refs={block.refs}
                      allOpen={allOpen}
                    />
                  </div>
                </div>
              </div>
            </section>
          );
        }
        return (
          <section key={key} className="scroll-mt-6">
            <div className="flex gap-3.5 sm:gap-4">
              {block.number != null && (
                <span className="mt-[0.3em] w-7 flex-none text-right text-[13px] font-bold tabular-nums text-teal-dark dark:text-teal-400">
                  {block.number}.
                </span>
              )}
              <div className="min-w-0 flex-1">
                <WithRefs
                  blockKey={key}
                  text={block.text}
                  className="font-serif leading-[1.85] text-ink-body"
                  refs={block.refs}
                  allOpen={allOpen}
                />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
