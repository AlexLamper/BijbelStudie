"use client"

import { useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"
import { KringPanel } from "./KringPanel"
import { friendsClient } from "../../lib/friends/client"

/**
 * "Nodig vrienden uit", the first card in the Vriendenkring column.
 *
 * Two ways in, neither of which needs an address book: hand out the link, or
 * type the code a friend handed you. The link is the referral link that
 * already exists (`GET /api/v1/referral`), so one code does both jobs and a
 * reader never has to learn which is which.
 *
 * The wide "Lees samen met vrienden" version of this - icon, explanation, both
 * fields - is InviteFriendsCard, and it is still what the dashboard and the
 * empty feed show. This is the same two actions at column width.
 */
export function InviteCard({ onJoined }: { onJoined?: () => void }) {
  const [link, setLink] = useState("")
  const [shareText, setShareText] = useState("")
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
        setLink(typeof data.url === "string" ? data.url : "")
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
      // Clipboard refused (no permission, no secure context). The field above
      // holds the link and is selectable, so there is still a way to share it.
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
    <KringPanel title="Nodig vrienden uit">
      <input
        readOnly
        value={link}
        aria-label="Je uitnodigingslink"
        placeholder="Je uitnodigingslink"
        onFocus={(event) => event.currentTarget.select()}
        className="h-[38px] w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-btn border border-line bg-sunken px-3 text-[13px] text-ink-body outline-none"
      />
      <button
        type="button"
        onClick={() => void copy()}
        disabled={!link}
        className="press mt-2 flex h-[38px] w-full items-center justify-center gap-2 rounded-btn bg-teal-dark text-[13.5px] font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:opacity-50"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Gekopieerd" : "Kopieer link"}
      </button>

      <div className="mt-2 flex items-center gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === "Enter") void join()
          }}
          aria-label="Code van een vriend"
          placeholder="CODE VAN EEN VRIEND"
          className="h-[38px] min-w-0 flex-1 rounded-btn border border-line bg-surface px-3 text-[13px] uppercase tracking-[0.5px] text-ink outline-none placeholder:tracking-[1px] focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        />
        <button
          type="button"
          onClick={() => void join()}
          disabled={busy || code.trim().length === 0}
          className="press h-[38px] flex-none rounded-btn border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink-body outline-none transition-colors hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:opacity-50"
        >
          Toevoegen
        </button>
      </div>

      {message && (
        <p role="status" className="mt-2 text-[12.5px] text-ink-faint">
          {message}
        </p>
      )}
    </KringPanel>
  )
}
