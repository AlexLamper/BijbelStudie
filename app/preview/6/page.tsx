// STYLE PREVIEW 6 - "Indigo & White"
// Pure white content · Deep indigo sidebar · Subtle shadows · Enterprise clean

import Link from "next/link"
import { LayoutDashboard, BookOpen, BookMarked, StickyNote, Library, User, Settings, ArrowUpRight, Moon, Flame } from "lucide-react"

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: BookOpen,         label: "Bijbelstudie" },
  { icon: BookMarked,       label: "Leesplannen" },
  { icon: StickyNote,       label: "Notities" },
  { icon: Library,          label: "Hulpbronnen" },
]
const BOTTOM = [{ icon: User, label: "Profiel" }, { icon: Settings, label: "Instellingen" }]

const SIDEBAR = "#312E81"    // indigo-900
const ACCENT  = "#4F46E5"    // indigo-600
const LIGHT   = "#EEF2FF"    // indigo-50

export default function Preview6() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif", backgroundColor: "#F9FAFB" }}>

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ backgroundColor: SIDEBAR }}>
        <div className="px-4 py-5 border-b border-indigo-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center">
              <span className="text-white font-bold text-sm">✝</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">BijbelStudie</p>
              <p className="text-indigo-300 text-xs mt-0.5">Pro account</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ icon: Icon, label, active }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{
                backgroundColor: active ? "rgba(255,255,255,0.15)" : "transparent",
                color: active ? "#fff" : "rgba(165,180,252,0.8)",
                fontWeight: active ? 600 : 400,
              }}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
              {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />}
            </div>
          ))}
        </nav>

        <div className="px-3 pb-4 pt-2 border-t border-indigo-800 space-y-0.5">
          {BOTTOM.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer" style={{ color: "rgba(165,180,252,0.7)" }}>
              <Icon className="h-4 w-4" />{label}
            </div>
          ))}
          <div className="flex items-center gap-2.5 mt-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div className="h-8 w-8 rounded-full bg-indigo-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">AL</div>
            <div>
              <p className="text-white text-xs font-semibold">Alex Lamper</p>
              <p className="text-indigo-300 text-xs">Pro</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: LIGHT, color: ACCENT }}>
              <Flame className="h-3.5 w-3.5" /> 12 dagenreeks
            </div>
            <button className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
              <Moon className="h-3.5 w-3.5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">A</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#F9FAFB" }}>
          <div className="max-w-4xl mx-auto space-y-5">

            {/* Welcome */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Goedemorgen, Alex 👋</h2>
                <p className="text-sm text-gray-400 mt-0.5">Zondag 18 mei 2025 · Je bent goed bezig!</p>
              </div>
            </div>

            {/* Stats - horizontal row */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Dagreeks",     value: "12",  sub: "dagen achter elkaar", icon: "🔥", change: "+2" },
                { label: "Notities",     value: "34",  sub: "bijbel aantekeningen",  icon: "✏️", change: "+5" },
                { label: "Leesplan",     value: "68%", sub: "van plan compleet",    icon: "📋", change: "+4%" },
                { label: "Hoofdstukken", value: "142", sub: "totaal gelezen",        icon: "📖", change: "+3" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#D1FAE5", color: "#065F46" }}>{s.change}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-4">
              {/* Daily verse - featured */}
              <div className="col-span-3 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${ACCENT}, transparent)`, transform: "translate(30%, -30%)" }} />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-0.5 w-6 rounded-full" style={{ backgroundColor: ACCENT }} />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Vers van de dag</p>
                  </div>
                  <p className="text-xl leading-relaxed text-gray-700" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                    &ldquo;Uw woord is een lamp voor mijn voet en een licht op mijn pad.&rdquo;
                  </p>
                  <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm" style={{ color: ACCENT }}>Psalm 119:105</p>
                      <p className="text-xs text-gray-400">Statenvertaling</p>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ backgroundColor: ACCENT }}>
                      Lees context <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="col-span-2 space-y-4">
                {/* Continue reading */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Verder lezen</p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: LIGHT }}>📖</div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Johannes 3</p>
                      <p className="text-xs text-gray-400">Statenvertaling · vers 16</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 mb-3">
                    <div className="h-1.5 rounded-full" style={{ width: "44%", backgroundColor: ACCENT }} />
                  </div>
                  <button className="w-full py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>Doorgaan →</button>
                </div>

                {/* Plan progress */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Leesplan</p>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Evangeliën in 30 dagen</p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>Dag 20 van 30</span><span style={{ color: ACCENT }}>68%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full" style={{ width: "68%", backgroundColor: ACCENT }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Bijbelstudie", sub: "Lees & bestudeer",  icon: "📖", accent: "#4F46E5" },
                { label: "Leesplannen",  sub: "Volg een plan",     icon: "📋", accent: "#0D9488" },
                { label: "Notities",     sub: "Jouw notities",     icon: "✏️", accent: "#D97706" },
                { label: "Hulpbronnen", sub: "Studiemethoden",    icon: "📚", accent: "#DB2777" },
              ].map(q => (
                <div key={q.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all group">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ backgroundColor: q.accent + "15" }}>{q.icon}</div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">{q.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{q.sub}</p>
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white text-xs px-4 py-2 rounded-full shadow-xl z-50" style={{ backgroundColor: SIDEBAR }}>
        <Link href="/preview/4" className="text-indigo-300 hover:text-white">← Stijl 4</Link>
        <span className="text-indigo-600">·</span>
        <Link href="/preview/5" className="text-indigo-300 hover:text-white">← Stijl 5</Link>
        <span className="text-indigo-600">·</span>
        <span className="font-semibold">Stijl 6 - Indigo & White</span>
      </div>
    </div>
  )
}
