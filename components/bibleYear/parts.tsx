'use client'

import { Check } from 'lucide-react'

/**
 * Small building blocks shared by the "Bijbel in een jaar" components. Brand
 * teal is written inline (CLAUDE.md); the neutrals are the shell's tokens, so
 * dark mode follows from them.
 */

export const TEAL = '#0D9488'

/** Error lines: a muted rose, readable in both themes, never a red alarm. */
export const ERROR_TEXT = 'text-rose-700 dark:text-rose-300'

const BASE_BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-btn text-[13.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${BASE_BUTTON} min-h-10 px-[18px] text-white hover:opacity-90 max-md:min-h-11 ${className}`}
      style={{ backgroundColor: TEAL }}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = '',
  ...rest
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  'aria-expanded'?: boolean
  'aria-controls'?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${BASE_BUTTON} min-h-9 border border-line bg-surface px-[14px] text-ink-body hover:bg-line-soft max-md:min-h-11 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * A square tick box with a real checkbox role. The visible box is 22px; the
 * button around it is 40px so a thumb lands on it, with a negative left margin so
 * the box itself still lines up with the text around it.
 */
export function TickBox({
  checked,
  onChange,
  label,
  disabled,
  className = '',
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group -ml-[9px] flex h-10 w-10 flex-none items-center justify-center rounded-[10px] focus:outline-none disabled:opacity-50 max-md:-ml-2 ${className}`}
    >
      <span
        aria-hidden
        className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border transition-colors group-focus-visible:ring-2 group-focus-visible:ring-[#0D9488] group-focus-visible:ring-offset-2 max-md:h-6 max-md:w-6"
        style={
          checked
            ? { backgroundColor: TEAL, borderColor: TEAL, color: '#fff' }
            : { borderColor: 'var(--line-strong)', backgroundColor: 'var(--surface)' }
        }
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  )
}

/** The plan's share of the whole Bible as a thin bar. */
export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const p = Math.max(0, Math.min(100, percent))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p)}
      aria-label={label}
      className="h-[6px] w-full overflow-hidden rounded-full bg-line"
    >
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${p}%`, backgroundColor: TEAL }} />
    </div>
  )
}
