// STYLE PREVIEW 1 — "Clean & Professional"
// White content area · Dark navy sidebar · Blue-600 accent · Inter font

import Link from "next/link"
import {
  LayoutDashboard, BookOpen, BookMarked, StickyNote,
  Library, User, Settings,
  Bell, Search, Moon,
} from "lucide-react"

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: BookOpen, label: "Bijbelstudie" },
  { icon: BookMarked, label: "Leesplannen" },
  { icon: StickyNote, label: "Notities" },
  { icon: Library, label: "Hulpbronnen" },
]

const BOTTOM = [
  { icon: User, label: "Profiel" },
  { icon: Settings, label: "Instellingen" },
]

export default function Preview1() {
  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Sidebar — dark navy */}
      <aside className="w-60 flex-shrink-0 flex flex-col" style={{ backgroundColor: "#0F172A" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "#1E293B" }}>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#2563EB" }}>B</div>
            <span className="text-white font-bold text-base tracking-tight">BijbelStudie</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ icon: Icon, label, active }) => (
            <div key={label} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${active ? "text-white font-medium" : "text-slate-400 hover:text-slate-200"}`}
              style={active ? { backgroundColor: "#2563EB" } : {}}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 pb-3 pt-2 border-t space-y-0.5" style={{ borderColor: "#1E293B" }}>
          {BOTTOM.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 cursor-pointer">
              <Icon className="h-4 w-4" />{label}
            </div>
          ))}
          <div className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg cursor-pointer hover:bg-slate-800">
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">Alex Lamper</p>
              <p className="text-slate-400 text-xs truncate">alex@email.nl</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-400 w-48">
              <Search className="h-3.5 w-3.5" />
              <span>Zoeken...</span>
            </div>
            <button className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <Bell className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <Moon className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Welcome */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Goedemorgen, Alex! 👋</h2>
              <p className="text-sm text-gray-500 mt-0.5">Zondag 18 mei 2025</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Dagreeks", value: "12 dagen", color: "#FEF3C7", icon: "🔥" },
                { label: "Notities", value: "34", color: "#DBEAFE", icon: "✏️" },
                { label: "Leesplan", value: "68%", color: "#D1FAE5", icon: "📋" },
                { label: "Hoofdstukken", value: "142", color: "#EDE9FE", icon: "📖" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-base mb-3" style={{ backgroundColor: s.color }}>{s.icon}</div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Daily verse */}
              <div className="col-span-2 bg-white border border-gray-100 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1 w-5 bg-blue-600 rounded-full" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vers van de dag</span>
                </div>
                <p className="text-lg text-gray-800 leading-relaxed italic" style={{ fontFamily: "Georgia, serif" }}>
                  &ldquo;Uw woord is een lamp voor mijn voet en een licht op mijn pad.&rdquo;
                </p>
                <p className="text-blue-600 font-semibold text-sm mt-4">Psalm 119:105</p>
              </div>

              {/* Continue reading */}
              <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Verder lezen</span>
                  <p className="text-base font-bold text-gray-900 mt-3">Johannes 3</p>
                  <p className="text-sm text-gray-400 mt-0.5">Statenvertaling</p>
                </div>
                <button className="w-full mt-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  Doorgaan →
                </button>
              </div>
            </div>

            {/* Quick nav */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Snel naar</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Bijbelstudie", sub: "Lees & bestudeer", icon: "📖", color: "#DBEAFE" },
                  { label: "Leesplannen", sub: "Volg een plan", icon: "📋", color: "#D1FAE5" },
                  { label: "Notities", sub: "Jouw aantekeningen", icon: "✏️", color: "#FEF3C7" },
                  { label: "Hulpbronnen", sub: "Studiemethoden", icon: "📚", color: "#EDE9FE" },
                ].map(q => (
                  <div key={q.label} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center text-lg mb-3" style={{ backgroundColor: q.color }}>{q.icon}</div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{q.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{q.sub}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Selector badge */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full shadow-xl z-50">
        <span className="font-semibold">Stijl 1 — Clean & Professioneel</span>
        <span className="text-gray-400">·</span>
        <Link href="/preview/2" className="text-blue-400 hover:text-blue-300">Stijl 2 →</Link>
        <Link href="/preview/3" className="text-blue-400 hover:text-blue-300">Stijl 3 →</Link>
      </div>
    </div>
  )
}
