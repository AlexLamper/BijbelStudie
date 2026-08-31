"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

/**
 * The one interactive element on the landing page, split out so the page around
 * it can stay a server component. Twelve of these hydrate; the other ~1300
 * lines of marketing markup now ship no JavaScript at all.
 *
 * The answer is always mounted and collapsed with a grid row rather than
 * unmounted. Previously `{open && <p/>}` kept every answer out of the served
 * HTML, so the whole FAQ was invisible to crawlers and the FAQPage structured
 * data on app/page.tsx described text that was not on the page.
 */
export function FAQItem({
  q,
  a,
  id,
  borderColor,
  textColor,
  mutedColor,
}: {
  q: string
  a: string
  id: string
  borderColor: string
  textColor: string
  mutedColor: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b" style={{ borderColor }}>
      <h3>
        <button
          className="w-full flex items-center justify-between gap-4 py-5 text-left font-semibold text-sm select-none transition-opacity hover:opacity-80"
          style={{ color: textColor }}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={`${id}-answer`}
          id={`${id}-question`}
        >
          <span>{q}</span>
          <span className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <ChevronDown className="h-4 w-4" style={{ color: mutedColor }} />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-answer`}
        role="region"
        aria-labelledby={`${id}-question`}
        className="grid transition-all duration-300 ease-out"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          overflow: "hidden",
        }}
      >
        <p className="min-h-0 pb-5 text-sm leading-relaxed" style={{ color: mutedColor }}>{a}</p>
      </div>
    </div>
  )
}

export default FAQItem
