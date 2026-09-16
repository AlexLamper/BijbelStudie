"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { ADMIN_BUTTON, ADMIN_FIELD, ADMIN_PRIMARY } from "./adminSurface"

/**
 * The part of one inbox item that acts on it: the reply, the internal note,
 * themes and sentiment. Kept out of app/beheer/feedback/page.tsx so the list
 * page stays a list.
 *
 * Every save is a targeted PATCH or POST; the parent is told what changed so
 * the row updates without a reload.
 */

export interface TriageReply {
  at: string
  body: string
  channel: string
  emailStatus: string | null
}

export interface TriageItem {
  _id: string
  status: string
  adminNote: string
  themes: string[]
  sentiment: string | null
  replies: TriageReply[]
  email: string
  contactEmail: string
}

/** ADMIN_FIELD without its fixed height. */
const TEXTAREA =
  "mt-1.5 w-full resize-y rounded-[9px] border border-line bg-surface px-3 py-2 text-[12.5px] leading-[1.55] text-ink-body outline-none transition-colors hover:border-line-strong focus-visible:border-teal"

const SENTIMENT_LABELS: Record<string, string> = {
  negatief: "Negatief",
  neutraal: "Neutraal",
  positief: "Positief",
}

/** Suggestions only; any theme can be typed. */
const THEME_SUGGESTIONS = ["prijs", "ai", "les", "quiz", "leesplan", "bug", "snelheid", "app", "inhoud", "onboarding"]

const EMAIL_STATUS_LABELS: Record<string, string> = {
  sent: "gemaild",
  skipped: "niet gemaild (e-mail niet ingesteld)",
  failed: "mailen mislukt",
  no_recipient: "geen e-mailadres, alleen in Mijn feedback",
}

function formatDate(iso: string): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function FeedbackTriagePanel({
  item,
  onChange,
}: {
  item: TriageItem
  onChange: (patch: Partial<TriageItem>) => void
}) {
  const [text, setText] = useState("")
  const [note, setNote] = useState(item.adminNote)
  const [themeInput, setThemeInput] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const recipient = item.email || item.contactEmail

  async function patch(body: Partial<TriageItem>, key: string) {
    setBusy(key)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/feedback/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setMessage(typeof data?.error === "string" ? data.error : "Opslaan mislukt")
        return
      }
      onChange(body)
    } finally {
      setBusy(null)
    }
  }

  async function sendReply(markStatus: string | null) {
    if (text.trim().length < 2) return
    setBusy(markStatus ? "reply-mark" : "reply")
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/feedback/${item._id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, markStatus }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setMessage(typeof data?.error === "string" ? data.error : "Versturen mislukt")
        return
      }
      const reply: TriageReply = {
        at: data.reply?.at ?? new Date().toISOString(),
        body: text.trim(),
        channel: data.emailStatus === "sent" ? "email" : "in_app",
        emailStatus: data.emailStatus ?? null,
      }
      onChange({ replies: [...item.replies, reply], ...(markStatus ? { status: markStatus } : {}) })
      setText("")
      setMessage(`Antwoord opgeslagen, ${EMAIL_STATUS_LABELS[data.emailStatus] ?? data.emailStatus}.`)
    } finally {
      setBusy(null)
    }
  }

  function addTheme(raw: string) {
    const theme = raw.trim().toLowerCase()
    if (!theme || item.themes.includes(theme)) return
    void patch({ themes: [...item.themes, theme] }, "themes")
    setThemeInput("")
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-line-soft pt-3">
      {item.replies.length > 0 && (
        <div className="flex flex-col gap-2">
          {item.replies.map((reply, i) => (
            <div key={i} className="rounded-[10px] border border-line bg-sunken px-3 py-2">
              <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.55] text-ink">{reply.body}</p>
              <p className="mt-1 text-[11px] text-ink-faint">
                {formatDate(reply.at)} · {EMAIL_STATUS_LABELS[reply.emailStatus ?? ""] ?? "in Mijn feedback"}
              </p>
            </div>
          ))}
        </div>
      )}

      <div>
        <label htmlFor={`reply-${item._id}`} className="text-[11px] font-semibold uppercase tracking-[0.8px] text-ink-faint">
          Antwoord {recipient ? `aan ${recipient}` : "(alleen zichtbaar in Mijn feedback)"}
        </label>
        <textarea
          id={`reply-${item._id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          rows={3}
          placeholder="Dank voor je bericht..."
          className={TEXTAREA}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void sendReply(null)}
            disabled={busy !== null || text.trim().length < 2}
            className={ADMIN_BUTTON}
          >
            {busy === "reply" && <Loader2 size={14} className="animate-spin" aria-hidden />} Stuur antwoord
          </button>
          <button
            type="button"
            onClick={() => void sendReply("planned")}
            disabled={busy !== null || text.trim().length < 2}
            className={ADMIN_PRIMARY}
          >
            {busy === "reply-mark" && <Loader2 size={14} className="animate-spin" aria-hidden />} Stuur + markeer als opgepakt
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`note-${item._id}`} className="text-[11px] font-semibold uppercase tracking-[0.8px] text-ink-faint">
            Interne notitie
          </label>
          <textarea
            id={`note-${item._id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (note !== item.adminNote) void patch({ adminNote: note }, "note")
            }}
            maxLength={2000}
            rows={2}
            placeholder="Alleen voor jou zichtbaar"
            className={TEXTAREA}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-ink-faint">Sentiment</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SENTIMENT_LABELS).map(([value, label]) => {
              const active = item.sentiment === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  disabled={busy !== null}
                  onClick={() => void patch({ sentiment: active ? null : value }, "sentiment")}
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                    active ? "border-transparent bg-teal text-white" : "border-line text-ink-body hover:bg-line-soft"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.8px] text-ink-faint">Thema&apos;s</span>
          <div className="flex flex-wrap gap-1.5">
            {item.themes.map((theme) => (
              <button
                key={theme}
                type="button"
                disabled={busy !== null}
                onClick={() => void patch({ themes: item.themes.filter((t) => t !== theme) }, "themes")}
                aria-label={`Thema ${theme} verwijderen`}
                className="rounded-full border border-transparent bg-teal px-2.5 py-1 text-[12px] font-semibold text-white"
              >
                {theme} ×
              </button>
            ))}
            {THEME_SUGGESTIONS.filter((t) => !item.themes.includes(t)).map((theme) => (
              <button
                key={theme}
                type="button"
                disabled={busy !== null}
                onClick={() => addTheme(theme)}
                className="rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-muted hover:bg-line-soft"
              >
                {theme}
              </button>
            ))}
          </div>
          <input
            value={themeInput}
            onChange={(e) => setThemeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTheme(themeInput)
              }
            }}
            maxLength={40}
            placeholder="Eigen thema, Enter"
            aria-label="Eigen thema toevoegen"
            className={`w-full sm:w-56 ${ADMIN_FIELD}`}
          />
        </div>
      </div>

      {message && (
        <p role="status" className="text-[12px] text-ink-muted">
          {message}
        </p>
      )}
    </div>
  )
}
