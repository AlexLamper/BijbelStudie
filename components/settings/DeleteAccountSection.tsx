"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { Card } from "../kit/primitives"
import { ConfirmDialog } from "../ui/ConfirmDialog"

/**
 * Account verwijderen, the danger zone at the bottom of /instellingen -> Account.
 *
 * DELETE /api/user/account runs the same archive-then-delete as the app
 * (lib/accountDeletion.ts). The list below follows lib/accountPurge.ts and
 * app/account-verwijderen - keep the three in step.
 */

const DELETED = [
  "Je profiel: naam, e-mailadres en profielfoto",
  "Je voortgang: gelezen hoofdstukken, reeksen, XP, badges en je boom",
  "Je notities, markeringen en bladwijzers",
  "Je voortgang in studies en leesplannen",
  "Je berichten in groepen; je verlaat alle groepen en leesplannen",
  "Je inlogsessies op alle apparaten",
]

const FIELD =
  "h-9 w-full rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink-body outline-none transition-colors hover:border-line-strong focus-visible:border-teal disabled:cursor-not-allowed disabled:opacity-60"

type Status = {
  hasPassword: boolean
  isProtected: boolean
  stripeBlocking: boolean
  storeSubscription: boolean
}

export default function DeleteAccountSection() {
  const { data: session } = useSession()
  const email = session?.user?.email ?? ""
  const [status, setStatus] = useState<Status | null>(null)
  const [open, setOpen] = useState(false)
  const [typedEmail, setTypedEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/user/account")
      .then(r => (r.ok ? r.json() : null))
      .then((data: Status | null) => { if (data) setStatus(data) })
      .catch(() => {})
  }, [])

  const emailMatches = email.length > 0 && typedEmail.trim().toLowerCase() === email.trim().toLowerCase()
  const ready = emailMatches && (!status?.hasPassword || password.length > 0)
  const blocked = !status || status.isProtected || status.stripeBlocking

  function close() {
    if (pending) return
    setOpen(false)
    setTypedEmail("")
    setPassword("")
    setError("")
  }

  async function confirmDelete() {
    if (!ready || pending) return
    setPending(true)
    setError("")
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: typedEmail, password: status?.hasPassword ? password : undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Er ging iets mis. Probeer het opnieuw.")
        setPending(false)
        return
      }
      // A full navigation follows, so no toast: it would never be seen.
      await signOut({ callbackUrl: "/" })
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.")
      setPending(false)
    }
  }

  return (
    <section id="instelling-account-verwijderen" className="flex-none scroll-mt-6">
      <Card className="px-[22px] py-5">
        <h2 className="text-[16.5px] font-bold text-ink">Account verwijderen</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
          Verwijdert je account en alles wat erbij hoort, op de website en in de app. Dit kun je niet ongedaan maken.
        </p>

        {status?.isProtected && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
            Dit is een beheerdersaccount. Een beheerdersaccount kan niet worden verwijderd; haal eerst de beheerdersrol weg.
          </p>
        )}

        {status && !status.isProtected && status.stripeBlocking && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-amber-700 dark:text-amber-400">
            Je hebt nog een lopend abonnement. Zeg het eerst op onder Instellingen &gt; Abonnement; daarna kun je je
            account verwijderen.
          </p>
        )}

        {status && !status.isProtected && status.storeSubscription && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-amber-700 dark:text-amber-400">
            Je abonnement via de App Store of Google Play stopt niet vanzelf. Zeg het op in de instellingen van je
            telefoon, anders blijft het doorlopen.{" "}
            <Link href="/account-verwijderen" className="font-semibold underline">Zo zeg je het op</Link>
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={blocked}
            className="inline-flex h-9 items-center rounded-[9px] border border-red-200 px-4 text-[13px] font-semibold text-red-700 outline-none transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-950"
          >
            Account verwijderen
          </button>
        </div>
      </Card>

      <ConfirmDialog
        open={open}
        onCancel={close}
        onConfirm={confirmDelete}
        title="Account definitief verwijderen?"
        description="Dit kun je niet ongedaan maken. Het volgende wordt verwijderd:"
        confirmLabel="Account verwijderen"
        pendingLabel="Verwijderen..."
        pending={pending}
        destructive
        confirmDisabled={!ready}
      >
        <ul className="list-disc space-y-0.5 pl-5 text-[13px] leading-relaxed text-ink-body">
          {DELETED.map(item => <li key={item}>{item}</li>)}
        </ul>

        <label htmlFor="verwijder-email" className="mt-4 block text-[13px] font-medium text-ink">
          Typ je e-mailadres ter bevestiging
        </label>
        <input
          id="verwijder-email"
          type="email"
          autoComplete="off"
          value={typedEmail}
          disabled={pending}
          onChange={e => { setTypedEmail(e.target.value); setError("") }}
          className={`mt-1.5 ${FIELD}`}
        />

        {status?.hasPassword && (
          <>
            <label htmlFor="verwijder-wachtwoord" className="mt-3 block text-[13px] font-medium text-ink">
              Je wachtwoord
            </label>
            <input
              id="verwijder-wachtwoord"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={pending}
              onChange={e => { setPassword(e.target.value); setError("") }}
              className={`mt-1.5 ${FIELD}`}
            />
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 text-[12.5px] font-medium text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </section>
  )
}
