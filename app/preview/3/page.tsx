// STYLE PREVIEW 3 - "Modern Dark"
// Deep slate · Indigo gradient accents · High-contrast cards · Premium feel

import Link from "next/link"
import {
  LayoutDashboard, BookOpen, BookMarked, StickyNote,
  Library, User, Settings, Sparkles, Sun,
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

export default function Preview3() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif", backgroundColor: "#0D1117" }}>

      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r" style={{ backgroundColor: "#090C10", borderColor: "#1C2333" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "#1C2333" }}>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="font-bold text-base" style={{ color: "#E6EDF3" }}>BijbelStudie</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ icon: Icon, label, active }) => (
            <div key={label}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
              style={active
                ? { background: "linear-gradient(90deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))", color: "#A5B4FC", fontWeight: 500, borderLeft: "2px solid #6366F1" }
                : { color: "#6E7681" }}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </div>
          ))}
        </nav>

        <div className="px-3 pb-4 pt-2 border-t space-y-0.5" style={{ borderColor: "#1C2333" }}>
          {BOTTOM.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ color: "#6E7681" }}>
              <Icon className="h-4 w-4" />{label}
            </div>
          ))}
          <div className="flex items-center gap-2.5 mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#1C2333" }}>
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>A</div>
            <div>
              <p className="text-xs font-medium" style={{ color: "#E6EDF3" }}>Alex Lamper</p>
              <p className="text-xs" style={{ color: "#6E7681" }}>Pro lid</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-6 flex-shrink-0" style={{ borderColor: "#1C2333", backgroundColor: "#0D1117" }}>
          <h1 className="text-base font-semibold" style={{ color: "#E6EDF3" }}>Dashboard</h1>
          <div className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#161B22", color: "#8B949E" }}>
              <Sun className="h-4 w-4" />
            </button>
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>A</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#0D1117" }}>
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Welcome - gradient banner */}
            <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #1E3A5F 100%)" }}>
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #818CF8, transparent)", transform: "translate(30%, -30%)" }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4" style={{ color: "#A5B4FC" }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#A5B4FC" }}>Welkom terug</span>
                </div>
                <h2 className="text-2xl font-bold" style={{ color: "#E6EDF3" }}>Goedemorgen, Alex!</h2>
                <p className="text-sm mt-1" style={{ color: "#8B949E" }}>Zondag 18 mei 2025 · Vandaag 1 hoofdstuk gelezen</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Dagreeks", value: "12", unit: "dagen", gradient: "linear-gradient(135deg, #F59E0B, #D97706)" },
                { label: "Notities", value: "34", unit: "stuks", gradient: "linear-gradient(135deg, #6366F1, #4F46E5)" },
                { label: "Leesplan", value: "68", unit: "procent", gradient: "linear-gradient(135deg, #10B981, #059669)" },
                { label: "Hoofdstukken", value: "142", unit: "gelezen", gradient: "linear-gradient(135deg, #EC4899, #DB2777)" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 border" style={{ backgroundColor: "#161B22", borderColor: "#1C2333" }}>
                  <div className="h-2 w-12 rounded-full mb-3" style={{ background: s.gradient }} />
                  <p className="text-2xl font-bold" style={{ color: "#E6EDF3" }}>{s.value}<span className="text-xs font-normal ml-1" style={{ color: "#6E7681" }}>{s.unit}</span></p>
                  <p className="text-xs mt-0.5" style={{ color: "#6E7681" }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Daily verse */}
              <div className="col-span-2 rounded-xl border p-6" style={{ backgroundColor: "#161B22", borderColor: "#1C2333" }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-5 rounded-full" style={{ background: "linear-gradient(90deg, #6366F1, #8B5CF6)" }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6E7681" }}>Vers van de dag</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#A5B4FC" }}>Psalm 119:105</span>
                </div>
                <p className="text-lg leading-relaxed" style={{ color: "#C9D1D9", fontStyle: "italic" }}>
                  &ldquo;Uw woord is een lamp voor mijn voet en een licht op mijn pad.&rdquo;
                </p>
                <div className="mt-5 pt-4 border-t flex items-center justify-between" style={{ borderColor: "#21262D" }}>
                  <span className="text-sm font-medium" style={{ color: "#A5B4FC" }}>Statenvertaling</span>
                  <button className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#A5B4FC" }}>Lees context</button>
                </div>
              </div>

              {/* Continue */}
              <div className="rounded-xl border p-5 flex flex-col justify-between" style={{ backgroundColor: "#161B22", borderColor: "#1C2333" }}>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6E7681" }}>Verder lezen</span>
                  <p className="text-lg font-bold mt-3" style={{ color: "#E6EDF3" }}>Johannes 3</p>
                  <p className="text-sm mt-0.5" style={{ color: "#6E7681" }}>Statenvertaling</p>
                  <div className="mt-3 h-1 rounded-full" style={{ backgroundColor: "#21262D" }}>
                    <div className="h-1 rounded-full w-2/3" style={{ background: "linear-gradient(90deg, #6366F1, #8B5CF6)" }} />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "#6E7681" }}>Voortgang: vers 16/36</p>
                </div>
                <button className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                  Doorgaan →
                </button>
              </div>
            </div>

            {/* Quick access */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6E7681" }}>Snel naar</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Bijbelstudie", icon: "📖", from: "#6366F1", to: "#4F46E5" },
                  { label: "Leesplannen", icon: "📋", from: "#10B981", to: "#059669" },
                  { label: "Notities", icon: "✏️", from: "#F59E0B", to: "#D97706" },
                  { label: "Hulpbronnen", icon: "📚", from: "#EC4899", to: "#DB2777" },
                ].map(q => (
                  <div key={q.label} className="rounded-xl border p-4 cursor-pointer group" style={{ backgroundColor: "#161B22", borderColor: "#1C2333" }}>
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center text-lg mb-3" style={{ background: `linear-gradient(135deg, ${q.from}33, ${q.to}22)` }}>{q.icon}</div>
                    <p className="text-sm font-medium" style={{ color: "#C9D1D9" }}>{q.label}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Selector */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-sm px-5 py-2.5 rounded-full shadow-xl z-50" style={{ backgroundColor: "#161B22", border: "1px solid #1C2333", color: "#C9D1D9" }}>
        <Link href="/preview/1" className="hover:text-indigo-300" style={{ color: "#A5B4FC" }}>← Stijl 1</Link>
        <span style={{ color: "#6E7681" }}>·</span>
        <Link href="/preview/2" className="hover:text-indigo-300" style={{ color: "#A5B4FC" }}>← Stijl 2</Link>
        <span style={{ color: "#6E7681" }}>·</span>
        <span className="font-semibold">Stijl 3 - Modern Dark</span>
      </div>
    </div>
  )
}
