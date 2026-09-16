"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Card, Skeleton } from "../kit/primitives"
import { toast } from "../../hooks/use-toast"

/**
 * Wachtwoord wijzigen, on /instellingen -> Account.
 *
 * Talks to /api/user/password. An account without a password (Google or Apple
 * only) gets an explanation instead of a form: the reset-mail flow refuses those
 * accounts on purpose, so there is no password to add from here.
 */

const MIN_PASSWORD_LENGTH = 8

const FIELD =
  "h-9 w-full rounded-[9px] border border-line bg-surface pl-3 pr-10 text-[13px] font-medium text-ink-body outline-none transition-colors hover:border-line-strong focus-visible:border-teal disabled:cursor-not-allowed disabled:opacity-60"

type Status = { hasPassword: boolean; google: boolean; apple: boolean }

export default function PasswordSection() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [repeat, setRepeat] = useState("")
  const [show, setShow] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/user/password")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((data: Status) => setStatus(data))
      .catch(() => setLoadFailed(true))
  }, [])

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH
  const mismatch = repeat.length > 0 && next !== repeat
  const canSubmit =
    !pending && current.length > 0 && next.length >= MIN_PASSWORD_LENGTH && next === repeat

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setPending(true)
    setError("")
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: repeat }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Er ging iets mis. Probeer het opnieuw.")
        return
      }
      setCurrent("")
      setNext("")
      setRepeat("")
      setShow(false)
      toast({ title: "Wachtwoord gewijzigd", description: "Gebruik voortaan je nieuwe wachtwoord om in te loggen." })
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.")
    } finally {
      setPending(false)
    }
  }

  const provider = status?.google && status?.apple
    ? "Google of Apple"
    : status?.apple ? "Apple" : "Google"

  return (
    <section id="instelling-wachtwoord" className="flex-none scroll-mt-6">
    <Card className="px-[22px] py-5">
      <h2 className="text-[16.5px] font-bold text-ink">Wachtwoord</h2>

      {!status && !loadFailed && (
        <div className="mt-4 space-y-2" role="status" aria-label="Laden">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {loadFailed && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          Je wachtwoordinstellingen konden niet worden geladen. Vernieuw de pagina om het opnieuw te proberen.
        </p>
      )}

      {status && !status.hasPassword && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          Je logt in met {provider}. Je hebt geen apart wachtwoord.
        </p>
      )}

      {status?.hasPassword && (
        <form onSubmit={submit} className="mt-1" noValidate>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Kies een wachtwoord van minstens {MIN_PASSWORD_LENGTH} tekens.
          </p>

          <PasswordField
            id="wachtwoord-huidig"
            label="Huidig wachtwoord"
            value={current}
            onChange={v => { setCurrent(v); setError("") }}
            show={show}
            onToggle={() => setShow(s => !s)}
            autoComplete="current-password"
            disabled={pending}
          />
          <PasswordField
            id="wachtwoord-nieuw"
            label="Nieuw wachtwoord"
            value={next}
            onChange={v => { setNext(v); setError("") }}
            show={show}
            autoComplete="new-password"
            disabled={pending}
            hint={tooShort ? `Minstens ${MIN_PASSWORD_LENGTH} tekens.` : undefined}
          />
          <PasswordField
            id="wachtwoord-herhaal"
            label="Herhaal nieuw wachtwoord"
            value={repeat}
            onChange={v => { setRepeat(v); setError("") }}
            show={show}
            autoComplete="new-password"
            disabled={pending}
            hint={mismatch ? "De wachtwoorden komen niet overeen." : undefined}
            last
          />

          {error && (
            <p role="alert" className="mt-1 text-[12.5px] font-medium text-red-700 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              aria-busy={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-[9px] px-4 text-[13px] font-semibold text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: "#0D9488" }}
            >
              {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
              {pending ? "Opslaan..." : "Wachtwoord wijzigen"}
            </button>
          </div>
        </form>
      )}
    </Card>
    </section>
  )
}

function PasswordField({
  id, label, value, onChange, show, onToggle, autoComplete, disabled, hint, last = false,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  /** Only the first field carries the toggle; it reveals all three. */
  onToggle?: () => void
  autoComplete: string
  disabled?: boolean
  hint?: string
  last?: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 py-[14px] sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
        last ? "" : "border-b border-line-soft"
      }`}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-[14.5px] text-ink">{label}</label>
        {hint && <p className="mt-[3px] text-[12px] leading-relaxed text-red-700 dark:text-red-400">{hint}</p>}
      </div>
      <div className="relative w-full sm:w-56">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          className={FIELD}
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={show ? "Wachtwoorden verbergen" : "Wachtwoorden tonen"}
            aria-pressed={show}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint outline-none transition-colors hover:text-ink-body focus-visible:ring-2 focus-visible:ring-[#0D9488]"
          >
            {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        )}
      </div>
    </div>
  )
}
