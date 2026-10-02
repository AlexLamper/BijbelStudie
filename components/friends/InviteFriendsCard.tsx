"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Users } from "lucide-react"
import { Card } from "../kit/primitives"
import { friendsClient } from "../../lib/friends/client"

/**
 * "Lees samen met vrienden" - the one card a reader without a vriendenkring
 * sees, on /vriendenkring and on the dashboard both.
 *
 * Two ways in, and neither needs an address book: share the invite link, or
 * type the code a friend gave you. The link is the referral link that already
 * exists (/api/v1/referral), so one code does both jobs and a reader never has
 * to know which is which.
 */
export function InviteFriendsCard({ onJoined }: { onJoined?: () => void }) {
  const [link, setLink] = useState<string | null>(null)
  const [shareText, setShareText] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch("/api/v1/referral", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!alive || !data) return
        setLink(typeof data.url === "string" ? data.url : null)
        setShareText(typeof data.shareText === "string" ? data.shareText : "")
      })
      .catch(() => {
        // No link is not an error here: the code field below still works.
      })
    return () => {
      alive = false
    }
  }, [])

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(shareText || link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard refused (no permission, no secure context): the field below
      // shows the link, so there is still a way to share it.
    }
  }

  async function join() {
    const value = code.trim()
    if (!value || busy) return
    setBusy(true)
    const result = await friendsClient.invite({ code: value, source: "code" })
    setBusy(false)
    setMessage(result.ok ? (result.data.message ?? "Verzoek verstuurd.") : result.message)
    if (result.ok) {
      setCode("")
      onJoined?.()
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-btn bg-teal-tint text-teal-dark dark:text-teal-400">
          <Users size={20} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-ink">Lees samen met vrienden</h3>
          <p className="mt-0.5 text-[13px] text-ink-faint">
            Zie waar zij lezen en moedig elkaar aan. Deel je link, of vul de code van een vriend in.
          </p>
        </div>
      </div>

      {link && (
        <div className="mt-4 flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 rounded-btn border border-line bg-sunken px-3 py-2 text-[13px] text-ink-body outline-none"
          />
          <button
            type="button"
            onClick={copy}
            aria-label="Kopieer je link"
            className="press grid h-10 w-10 place-items-center rounded-btn border border-line bg-surface text-ink-body outline-none hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488]"
          >
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          </button>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === "Enter") join()
          }}
          placeholder="Code van een vriend"
          className="min-w-0 flex-1 rounded-btn border border-line bg-surface px-3 py-2 text-[13.5px] uppercase tracking-wide text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        />
        <button
          type="button"
          onClick={join}
          disabled={busy || code.trim().length === 0}
          className="press rounded-btn bg-teal-dark px-4 py-2 text-[13.5px] font-semibold text-white outline-none transition-colors hover:bg-[#115E59] disabled:opacity-50"
        >
          Uitnodigen
        </button>
      </div>

      {message && <p className="mt-2 text-[13px] text-ink-faint">{message}</p>}

      <p className="mt-3 text-[12.5px] text-ink-faint">
        In de app kun je ook je contacten laten zoeken wie BijbelStudie al gebruikt.
      </p>
    </Card>
  )
}
