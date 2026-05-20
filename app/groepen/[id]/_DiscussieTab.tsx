"use client"

import { useEffect, useState, useRef } from "react"
import { Send, Reply, Trash2, ChevronDown, BookOpen, X } from "lucide-react"

type MsgType = "bericht" | "gebedsverzoek" | "aankondiging"

interface VerseRef { book: string; chapter: number; verse?: number }
interface Reaction  { userId: string; emoji: string }

interface Message {
  _id: string
  type: MsgType
  content: string | null
  verseRef?: VerseRef | null
  reactions: Reaction[]
  replyCount: number
  parentId: string | null
  deletedAt: string | null
  userId: { _id: string; name: string; image?: string } | null
  createdAt: string
}

const EMOJI_PICKER = ["🙏", "❤️", "🔥", "👍", "😢", "🤔", "✨", "🙌"]

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const initials = (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: "#0D9488", fontSize: size <= 7 ? 10 : 12 }}>
      {initials}
    </div>
  )
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "zojuist"
  if (m < 60) return `${m}m geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}u geleden`
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
}

function TypeBadge({ type }: { type: MsgType }) {
  if (type === "bericht") return null
  const label = type === "gebedsverzoek" ? "Gebedsverzoek" : "Aankondiging"
  const bg    = type === "gebedsverzoek" ? "#F3E8FF" : "#FEF3C7"
  const color = type === "gebedsverzoek" ? "#6B21A8" : "#92400E"
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color }}>
      {label}
    </span>
  )
}

function ReactionBar({
  reactions, msgId, currentUserId, groupId, onUpdate,
}: {
  reactions: Reaction[]
  msgId: string
  currentUserId: string
  groupId: string
  onUpdate: (msgId: string, reactions: Reaction[]) => void
}) {
  const [showPicker, setShowPicker] = useState(false)

  // Group reactions by emoji
  const grouped: Record<string, { count: number; mine: boolean }> = {}
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false }
    grouped[r.emoji].count++
    if (r.userId === currentUserId || r.userId?.toString?.() === currentUserId) {
      grouped[r.emoji].mine = true
    }
  }

  const toggle = async (emoji: string) => {
    setShowPicker(false)
    const res = await fetch(`/api/groepen/${groupId}/messages/${msgId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    })
    if (res.ok) {
      const d = await res.json()
      onUpdate(msgId, d.reactions)
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap relative">
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <button key={emoji} onClick={() => toggle(emoji)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors"
          style={{
            backgroundColor: mine ? "rgba(13,148,136,0.1)" : "#F9FAFB",
            borderColor: mine ? "rgba(13,148,136,0.3)" : "#E5E7EB",
            color: mine ? "#0D9488" : "#6B7280",
          }}>
          {emoji} {count}
        </button>
      ))}
      <div className="relative">
        <button onClick={() => setShowPicker(v => !v)}
          className="text-xs px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-border text-gray-400 hover:text-gray-600 dark:hover:text-foreground transition-colors">
          +
        </button>
        {showPicker && (
          <div className="absolute bottom-7 left-0 flex gap-1 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-2 shadow-lg z-10">
            {EMOJI_PICKER.map(e => (
              <button key={e} onClick={() => toggle(e)} className="hover:scale-125 transition-transform text-base">
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReplyThread({
  parentId, groupId, currentUserId, currentUserRole,
  onDeleteReply,
}: {
  parentId: string
  groupId: string
  currentUserId: string
  currentUserRole: "leader" | "member"
  onDeleteReply: () => void
}) {
  const [replies, setReplies] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/groepen/${groupId}/messages?parentId=${parentId}&limit=20`)
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(d => setReplies((d.messages || []).slice().reverse()))
      .finally(() => setLoading(false))
  }, [parentId, groupId])

  const handleDelete = async (msgId: string) => {
    await fetch(`/api/groepen/${groupId}/messages/${msgId}`, { method: "DELETE" })
    setReplies(prev => prev.map(r => r._id === msgId ? { ...r, deletedAt: new Date().toISOString(), content: null, userId: null } : r))
    onDeleteReply()
  }

  if (loading) return <div className="ml-10 mt-2 h-4 bg-gray-100 dark:bg-secondary rounded animate-pulse w-2/3" />

  return (
    <div className="ml-10 mt-2 space-y-2 border-l-2 border-gray-100 dark:border-border pl-3">
      {replies.map(r => (
        <div key={r._id} className="flex items-start gap-2">
          {r.userId ? <Avatar name={r.userId.name} size={6} /> : <div className="w-6 h-6 rounded-full bg-gray-200" />}
          <div className="flex-1 min-w-0">
            {r.deletedAt ? (
              <p className="text-xs text-gray-400 dark:text-muted-foreground italic">Dit bericht is verwijderd.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-700 dark:text-foreground">{r.userId?.name}</span>
                  <span className="text-[10px] text-gray-400">{relativeTime(r.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-foreground/80 leading-relaxed">{r.content}</p>
                {(r.userId?._id === currentUserId || currentUserRole === "leader") && (
                  <button onClick={() => handleDelete(r._id)}
                    className="mt-0.5 text-[10px] text-gray-400 hover:text-red-500 transition-colors">
                    Verwijderen
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function MessageCard({
  msg, groupId, currentUserId, currentUserRole, onReactionUpdate, onDelete, onReply,
}: {
  msg: Message
  groupId: string
  currentUserId: string
  currentUserRole: "leader" | "member"
  onReactionUpdate: (msgId: string, reactions: Reaction[]) => void
  onDelete: (msgId: string) => void
  onReply: (msg: Message) => void
}) {
  const [showReplies, setShowReplies] = useState(false)
  const [localReplyCount, setLocalReplyCount] = useState(msg.replyCount)

  const cardBg =
    msg.type === "gebedsverzoek" ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800" :
    msg.type === "aankondiging"  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" :
    "bg-white dark:bg-card border-gray-200 dark:border-border"

  return (
    <div className={`rounded-xl p-4 border ${cardBg}`}>
      {msg.deletedAt ? (
        <p className="text-sm text-gray-400 dark:text-muted-foreground italic">Dit bericht is verwijderd.</p>
      ) : (
        <>
          <div className="flex items-start gap-3">
            {msg.userId ? <Avatar name={msg.userId.name} size={8} /> : <div className="w-8 h-8 rounded-full bg-gray-200" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-foreground">{msg.userId?.name}</span>
                <TypeBadge type={msg.type} />
                <span className="text-xs text-gray-400 dark:text-muted-foreground ml-auto">{relativeTime(msg.createdAt)}</span>
              </div>
              {msg.verseRef && (
                <p className="text-xs font-semibold mb-1" style={{ color: "#0D9488" }}>
                  {msg.verseRef.book} {msg.verseRef.chapter}{msg.verseRef.verse ? `:${msg.verseRef.verse}` : ""}
                </p>
              )}
              <p className="text-sm text-gray-800 dark:text-foreground leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>

              <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                <ReactionBar
                  reactions={msg.reactions}
                  msgId={msg._id}
                  currentUserId={currentUserId}
                  groupId={groupId}
                  onUpdate={onReactionUpdate}
                />
                <button onClick={() => { onReply(msg) }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-foreground transition-colors">
                  <Reply size={11} /> Antwoord
                </button>
                {localReplyCount > 0 && (
                  <button onClick={() => setShowReplies(v => !v)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-foreground transition-colors">
                    <ChevronDown size={11} className={showReplies ? "rotate-180" : ""} />
                    {localReplyCount} {localReplyCount === 1 ? "antwoord" : "antwoorden"}
                  </button>
                )}
                {(msg.userId?._id === currentUserId || currentUserRole === "leader") && (
                  <button onClick={() => onDelete(msg._id)}
                    className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {showReplies && (
            <ReplyThread
              parentId={msg._id}
              groupId={groupId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onDeleteReply={() => setLocalReplyCount(c => Math.max(0, c - 1))}
            />
          )}
        </>
      )}
    </div>
  )
}

export default function DiscussieTab({
  groupId,
  currentUserId,
  currentUserRole,
}: {
  groupId: string
  currentUserId: string
  currentUserRole: "leader" | "member"
  currentUserName: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [hasMore, setHasMore]   = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [composerText, setText] = useState("")
  const [composerType, setType] = useState<MsgType>("bericht")
  const [showVerseInput, setShowVI] = useState(false)
  const [verseBook, setVerseBook]   = useState("")
  const [verseChapter, setVerseChapter] = useState("")
  const [verseVerse, setVerseVerse]     = useState("")
  const [replyTo, setReplyTo]   = useState<Message | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async (p: number, append = false) => {
    const res = await fetch(`/api/groepen/${groupId}/messages?page=${p}&limit=20`)
    if (!res.ok) return
    const d = await res.json()
    const reversed = (d.messages || []).slice().reverse() as Message[]
    setMessages(prev => append ? [...reversed, ...prev] : reversed)
    setHasMore(d.pagination ? p < d.pagination.totalPages : false)
  }

  useEffect(() => {
    setLoading(true)
    fetchMessages(1).finally(() => setLoading(false))
  }, [groupId])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    await fetchMessages(nextPage, true)
    setLoadingMore(false)
  }

  const handleSubmit = async () => {
    if (!composerText.trim() || submitting) return
    setSubmitting(true)
    try {
      const verseRef = (showVerseInput && verseBook.trim() && verseChapter.trim())
        ? { book: verseBook.trim(), chapter: parseInt(verseChapter), verse: verseVerse ? parseInt(verseVerse) : undefined }
        : null

      const res = await fetch(`/api/groepen/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: composerType,
          content: composerText.trim(),
          verseRef,
          parentId: replyTo?._id ?? null,
        }),
      })
      if (!res.ok) return
      const d = await res.json()

      if (replyTo) {
        // Increment reply count on parent
        setMessages(prev => prev.map(m =>
          m._id === replyTo._id ? { ...m, replyCount: m.replyCount + 1 } : m
        ))
      } else {
        setMessages(prev => [...prev, d.message])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
      }

      setText("")
      setType("bericht")
      setShowVI(false)
      setVerseBook("")
      setVerseChapter("")
      setVerseVerse("")
      setReplyTo(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (msgId: string) => {
    await fetch(`/api/groepen/${groupId}/messages/${msgId}`, { method: "DELETE" })
    setMessages(prev => prev.map(m =>
      m._id === msgId ? { ...m, deletedAt: new Date().toISOString(), content: null, userId: null } : m
    ))
  }

  const handleReactionUpdate = (msgId: string, reactions: Reaction[]) => {
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, reactions } : m))
  }

  const MSG_TYPES: { type: MsgType; label: string }[] = [
    { type: "bericht",        label: "Bericht" },
    { type: "gebedsverzoek",  label: "Gebedsverzoek" },
    ...(currentUserRole === "leader" ? [{ type: "aankondiging" as MsgType, label: "Aankondiging" }] : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* "Load older" */}
      {hasMore && (
        <button onClick={handleLoadMore} disabled={loadingMore}
          className="text-xs font-medium text-center py-2 text-gray-400 dark:text-muted-foreground hover:text-gray-600 dark:hover:text-foreground transition-colors">
          {loadingMore ? "Laden..." : "Oudere berichten laden"}
        </button>
      )}

      {/* Message feed */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-secondary animate-pulse" />
                <div className="h-3 rounded bg-gray-100 dark:bg-secondary animate-pulse w-24" />
              </div>
              <div className="h-3 rounded bg-gray-100 dark:bg-secondary animate-pulse w-4/5" />
              <div className="h-3 rounded bg-gray-100 dark:bg-secondary animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center text-center py-12 px-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(13,148,136,0.07)" }}>
            <Send className="w-6 h-6" style={{ color: "#0D9488" }} />
          </div>
          <p className="font-semibold text-gray-800 dark:text-foreground mb-1">Nog geen berichten</p>
          <p className="text-sm text-gray-500 dark:text-muted-foreground">
            Start de discussie — deel je gedachten over een bijbelgedeelte!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <MessageCard
              key={msg._id}
              msg={msg}
              groupId={groupId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onReactionUpdate={handleReactionUpdate}
              onDelete={handleDelete}
              onReply={setReplyTo}
            />
          ))}
        </div>
      )}

      <div ref={bottomRef} />

      {/* Composer */}
      <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4 space-y-3 sticky bottom-4">
        {/* Reply-to banner */}
        {replyTo && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ backgroundColor: "rgba(13,148,136,0.07)" }}>
            <Reply size={11} style={{ color: "#0D9488" }} />
            <span className="text-gray-600 dark:text-muted-foreground">
              Antwoord op <span className="font-semibold text-gray-800 dark:text-foreground">{replyTo.userId?.name}</span>
            </span>
            <button onClick={() => setReplyTo(null)} className="ml-auto text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          </div>
        )}

        <textarea
          value={composerText}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit() }}
          placeholder={replyTo ? `Antwoord op ${replyTo.userId?.name}...` : "Schrijf een bericht..."}
          rows={3}
          className="w-full text-sm bg-transparent border-0 resize-none focus:outline-none text-gray-900 dark:text-foreground placeholder:text-gray-400 dark:placeholder:text-muted-foreground"
          maxLength={2000}
        />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Type pills */}
            {!replyTo && MSG_TYPES.map(({ type, label }) => (
              <button key={type} onClick={() => setType(type)}
                className="text-xs px-2.5 py-1 rounded-full border font-medium transition-colors"
                style={{
                  backgroundColor: composerType === type ? "#0D9488" : "transparent",
                  color: composerType === type ? "white" : "#6B7280",
                  borderColor: composerType === type ? "#0D9488" : "#E5E7EB",
                }}>
                {label}
              </button>
            ))}

            {/* Verse ref toggle */}
            <button onClick={() => setShowVI(v => !v)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border text-gray-500 dark:text-muted-foreground border-gray-200 dark:border-border hover:text-gray-700 dark:hover:text-foreground transition-colors">
              <BookOpen size={10} />
              {showVerseInput ? "Verwijzing verbergen" : "Bijbelverwijzing"}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!composerText.trim() || submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#0D9488" }}>
            <Send size={13} />
            {submitting ? "..." : "Versturen"}
          </button>
        </div>

        {/* Verse reference inputs */}
        {showVerseInput && (
          <div className="flex items-end gap-2 pt-1 border-t border-gray-100 dark:border-border">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 dark:text-muted-foreground block mb-1">Boek</label>
              <input value={verseBook} onChange={e => setVerseBook(e.target.value)}
                placeholder="bijv. Johannes"
                className="w-full px-2 py-1.5 border border-gray-200 dark:border-border rounded-md text-xs bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none" />
            </div>
            <div className="w-16">
              <label className="text-[10px] text-gray-400 dark:text-muted-foreground block mb-1">Hfdst.</label>
              <input type="number" value={verseChapter} onChange={e => setVerseChapter(e.target.value)}
                placeholder="3"
                className="w-full px-2 py-1.5 border border-gray-200 dark:border-border rounded-md text-xs bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none" />
            </div>
            <div className="w-16">
              <label className="text-[10px] text-gray-400 dark:text-muted-foreground block mb-1">Vers</label>
              <input type="number" value={verseVerse} onChange={e => setVerseVerse(e.target.value)}
                placeholder="16"
                className="w-full px-2 py-1.5 border border-gray-200 dark:border-border rounded-md text-xs bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none" />
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-300 dark:text-muted-foreground/50 text-right">{composerText.length}/2000 · Ctrl+Enter om te versturen</p>
      </div>
    </div>
  )
}
