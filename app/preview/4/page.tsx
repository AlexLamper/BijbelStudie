// STYLE PREVIEW 4 - "Sky Blue Light"
// Soft blue-tinted bg · Medium blue sidebar · Blue accents · Very readable

import Link from "next/link"
import { LayoutDashboard, BookOpen, BookMarked, StickyNote, Library, User, Settings, ChevronRight, Bell, Moon, TrendingUp } from "lucide-react"

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: BookOpen,         label: "Bijbelstudie" },
  { icon: BookMarked,       label: "Leesplannen" },
  { icon: StickyNote,       label: "Notities" },
  { icon: Library,          label: "Hulpbronnen" },
]
const BOTTOM = [{ icon: User, label: "Profiel" }, { icon: Settings, label: "Instellingen" }]

const NAV_BG   = "#1A56DB"   // medium royal blue sidebar
const NAV_ACTIVE = "rgba(255,255,255,0.18)"
const NAV_TEXT = "rgba(255,255,255,0.70)"
const ACCENT   = "#1A56DB"
const PAGE_BG  = "#EFF6FF"   // blue-50
const CARD_BG  = "#FFFFFF"
const BORDER   = "#DBEAFE"   // blue-100

export default function Preview4() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif", backgroundColor: PAGE_BG }}>

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ backgroundColor: NAV_BG }}>
        <div className="px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-xs">B</span>
            </div>
            <span className="text-white font-bold text-sm tracking-tight">BijbelStudie</span>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(({ icon: Icon, label, active }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer"
              style={{ backgroundColor: active ? NAV_ACTIVE : "transparent", color: active ? "#fff" : NAV_TEXT, fontWeight: active ? 600 : 400 }}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </div>
          ))}
        </nav>

        <div className="px-2 pb-4 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          {BOTTOM.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ color: NAV_TEXT }}>
              <Icon className="h-4 w-4" />{label}
            </div>
          ))}
          <div className="flex items-center gap-2.5 mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
            <div className="h-7 w-7 rounded-full bg-white/30 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
            <div>
              <p className="text-white text-xs font-semibold">Alex Lamper</p>
              <p className="text-xs" style={{ color: NAV_TEXT }}>Pro lid</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center justify-between px-5 flex-shrink-0" style={{ backgroundColor: "#fff", borderColor: BORDER }}>
          <h1 className="text-sm font-semibold" style={{ color: "#1E3A5F" }}>Dashboard</h1>
          <div className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-lg border flex items-center justify-center text-blue-400" style={{ borderColor: BORDER }}>
              <Bell className="h-3.5 w-3.5" />
            </button>
            <button className="h-8 w-8 rounded-lg border flex items-center justify-center text-blue-400" style={{ borderColor: BORDER }}>
              <Moon className="h-3.5 w-3.5" />
            </button>
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: ACCENT }}>A</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5" style={{ backgroundColor: PAGE_BG }}>
          <div className="max-w-4xl mx-auto space-y-5">

            {/* Welcome */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#1E3A5F" }}>Goedemorgen, Alex 👋</h2>
                <p className="text-sm text-blue-400 mt-0.5">Zondag 18 mei 2025</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: "#DBEAFE", color: ACCENT }}>
                <TrendingUp className="h-3.5 w-3.5" /> 12 dagenreeks 🔥
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Dagreeks",     value: "12 dagen", pct: 80, col: "#3B82F6" },
                { label: "Notities",     value: "34 stuks",  pct: 60, col: "#6366F1" },
                { label: "Leesplan",     value: "68%",       pct: 68, col: "#10B981" },
                { label: "Hoofdstukken", value: "142",       pct: 45, col: "#F59E0B" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 border" style={{ backgroundColor: CARD_BG, borderColor: BORDER }}>
                  <p className="text-xl font-bold" style={{ color: "#1E3A5F" }}>{s.value}</p>
                  <p className="text-xs mt-0.5 mb-3" style={{ color: "#93C5FD" }}>{s.label}</p>
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: "#EFF6FF" }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${s.pct}%`, backgroundColor: s.col }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-4">
              {/* Verse */}
              <div className="col-span-3 rounded-xl p-5 border" style={{ backgroundColor: CARD_BG, borderColor: BORDER }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#93C5FD" }}>Vers van de dag</p>
                <p className="text-base leading-relaxed italic" style={{ color: "#1E3A5F", fontFamily: "Georgia, serif" }}>
                  &ldquo;Uw woord is een lamp voor mijn voet en een licht op mijn pad.&rdquo;
                </p>
                <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <span className="text-sm font-semibold" style={{ color: ACCENT }}>Psalm 119:105</span>
                  <button className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: "#EFF6FF", color: ACCENT }}>Lees meer</button>
                </div>
              </div>

              {/* Sidebar cards */}
              <div className="col-span-2 space-y-3">
                <div className="rounded-xl p-4 border" style={{ backgroundColor: CARD_BG, borderColor: BORDER }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#93C5FD" }}>Verder lezen</p>
                  <p className="font-bold text-base" style={{ color: "#1E3A5F" }}>Johannes 3</p>
                  <p className="text-xs mb-3" style={{ color: "#93C5FD" }}>Statenvertaling · vers 16/36</p>
                  <button className="w-full py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>Doorgaan →</button>
                </div>
                <div className="rounded-xl p-4 border" style={{ backgroundColor: CARD_BG, borderColor: BORDER }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#93C5FD" }}>Leesplan voortgang</p>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs" style={{ color: "#1E3A5F" }}>Evangeliën in 30 dagen</span>
                    <span className="text-xs font-bold" style={{ color: ACCENT }}>68%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: "#EFF6FF" }}>
                    <div className="h-2 rounded-full" style={{ width: "68%", backgroundColor: ACCENT }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick nav */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Bijbelstudie", sub: "Lees & bestudeer",  icon: "📖", bg: "#DBEAFE", col: "#1D4ED8" },
                { label: "Leesplannen",  sub: "Volg een plan",     icon: "📋", bg: "#D1FAE5", col: "#065F46" },
                { label: "Notities",     sub: "Jouw notities",     icon: "✏️", bg: "#FEF3C7", col: "#92400E" },
                { label: "Hulpbronnen", sub: "Studiemethoden",    icon: "📚", bg: "#EDE9FE", col: "#5B21B6" },
              ].map(q => (
                <div key={q.label} className="flex items-center justify-between p-4 rounded-xl border cursor-pointer group" style={{ backgroundColor: CARD_BG, borderColor: BORDER }}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: q.bg }}>{q.icon}</div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#1E3A5F" }}>{q.label}</p>
                      <p className="text-xs" style={{ color: "#93C5FD" }}>{q.sub}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: "#93C5FD" }} />
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white text-xs px-4 py-2 rounded-full shadow-xl z-50" style={{ backgroundColor: NAV_BG }}>
        <Link href="/preview/3" className="opacity-70 hover:opacity-100">← Stijl 3</Link>
        <span className="opacity-30">·</span>
        <span className="font-semibold">Stijl 4 - Sky Blue</span>
        <span className="opacity-30">·</span>
        <Link href="/preview/5" className="opacity-70 hover:opacity-100">Stijl 5 →</Link>
        <Link href="/preview/6" className="opacity-70 hover:opacity-100">Stijl 6 →</Link>
      </div>
    </div>
  )
}
