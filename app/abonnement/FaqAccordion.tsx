"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

/**
 * The FAQ answer is always mounted (never `{open && <p/>}`) and collapsed with
 * a grid row - same technique as components/landing/FAQItem.tsx - so the
 * FAQPage structured data in layout.tsx always describes text that is
 * actually in the DOM, open or not.
 */
function FaqRow({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line last:border-b-0">
      <h3>
        <button
          type="button"
          className="flex w-full select-none items-center justify-between gap-4 py-4 text-left outline-none"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls={`${id}-answer`}
          id={`${id}-question`}
        >
          <span className="text-[15px] font-bold text-ink">{q}</span>
          <ChevronDown
            className={`h-4 w-4 flex-none text-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </h3>
      <div
        id={`${id}-answer`}
        role="region"
        aria-labelledby={`${id}-question`}
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="pb-4 text-[14px] leading-[1.7] text-ink-body">{a}</p>
        </div>
      </div>
    </div>
  )
}

export default function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="rounded-card border border-line bg-surface px-4">
      {items.map((item, i) => (
        <FaqRow key={item.q} q={item.q} a={item.a} id={`abonnement-faq-${i}`} />
      ))}
    </div>
  )
}
