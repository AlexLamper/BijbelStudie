"use client"

import Link from "next/link"

export type PreviewState = "pro" | "gratis"

const VARIANTS = [
  { href: "/profiel", label: "Huidig" },
  { href: "/profiel/versie-a", label: "A" },
  { href: "/profiel/versie-b", label: "B" },
  { href: "/profiel/versie-c", label: "C" },
]

/**
 * De beoordelaarsregel boven ontwerp A: naar welke variant, en of de pagina als
 * Pro- of als gratis account getekend wordt. Alleen weergave - de toggle raakt
 * geen sessie en geen abonnement.
 */
export default function ReviewBar({
  value,
  onChange,
  realPro,
}: {
  value: PreviewState
  onChange: (value: PreviewState) => void
  realPro: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-line bg-white px-3 py-2">
      <nav aria-label="Ontwerpvarianten" className="flex items-center gap-1">
        <span className="mr-1 text-[11.5px] font-semibold text-ink-muted">Ontwerp</span>
        {VARIANTS.map(v => {
          const active = v.href === "/profiel/versie-a"
          return (
            <Link
              key={v.href}
              href={v.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-[9px] py-[3px] text-[11.5px] font-semibold no-underline transition-colors ${
                active ? "bg-slate-900 text-white" : "text-ink-muted hover:bg-line-soft hover:text-ink"
              }`}
            >
              {v.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center gap-2">
        <span className="text-[11.5px] font-semibold text-ink-muted">Voorbeeld:</span>
        <div role="radiogroup" aria-label="Voorbeeldstatus" className="flex rounded-full border border-line p-[2px]">
          {(["pro", "gratis"] as const).map(state => (
            <button
              key={state}
              type="button"
              role="radio"
              aria-checked={value === state}
              onClick={() => onChange(state)}
              className={`rounded-full px-[10px] py-[3px] text-[11.5px] font-semibold transition-colors ${
                value === state ? "bg-slate-900 text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {state === "pro" ? "Pro" : "Gratis"}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] leading-snug text-ink-faint sm:ml-auto">
        Midnight · alleen de weergave wisselt{realPro ? "" : " · abonnementsgegevens bij Pro zijn voorbeelddata"}
      </p>
    </div>
  )
}
