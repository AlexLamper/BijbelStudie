// STYLE PREVIEW 2 — "Warm Scripture"
// Parchment background · Forest green sidebar · Amber accent · Lora serif headings

import Link from "next/link"
import {
  LayoutDashboard, BookOpen, BookMarked, StickyNote,
  Library, User, Settings, Sun,
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

export default function Preview2() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif", backgroundColor: "#FAF6EF" }}>

      {/* Sidebar — warm forest green */}
      <aside className="w-60 flex-shrink-0 flex flex-col" style={{ backgroundColor: "#1E3A2F" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "#2D5240" }}>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#C17A3F" }}>✝</div>
            <span className="text-white font-bold text-base" style={{ fontFamily: "Georgia, serif", letterSpacing: "0.02em" }}>BijbelStudie</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ icon: Icon, label, active }) => (
            <div key={label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer"
              style={active
                ? { backgroundColor: "#C17A3F", color: "white", fontWeight: 500 }
                : { color: "#9DB8A8" }}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </div>
          ))}
        </nav>

        <div className="px-3 pb-4 pt-2 border-t space-y-0.5" style={{ borderColor: "#2D5240" }}>
          {BOTTOM.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer" style={{ color: "#9DB8A8" }}>
              <Icon className="h-4 w-4" />{label}
            </div>
          ))}
          <div className="flex items-center gap-2.5 mt-2 px-3 py-2 rounded-md" style={{ backgroundColor: "#2D5240" }}>
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#C17A3F" }}>A</div>
            <div>
              <p className="text-white text-xs font-medium">Alex Lamper</p>
              <p className="text-xs" style={{ color: "#9DB8A8" }}>Lid</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-6 flex-shrink-0"
          style={{ borderColor: "#E8DFD0", backgroundColor: "#FDF9F3" }}>
          <h1 className="text-base font-semibold" style={{ fontFamily: "Georgia, serif", color: "#2C1A0E" }}>Dashboard</h1>
          <div className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F0E8DC", color: "#8B6A3E" }}>
              <Sun className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#C17A3F" }}>A</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#FAF6EF" }}>
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Welcome */}
            <div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: "#2C1A0E" }}>
                Goedemorgen, Alex
              </h2>
              <p className="text-sm mt-0.5" style={{ color: "#9B856B" }}>Zondag 18 mei 2025</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Dagreeks", value: "12 dagen", icon: "🔥", bg: "#FEF3E2" },
                { label: "Notities", value: "34", icon: "✒️", bg: "#E8F4EC" },
                { label: "Leesplan", value: "68%", icon: "📜", bg: "#EDE8FB" },
                { label: "Hoofdstukken", value: "142", icon: "📖", bg: "#FEE4CC" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 border" style={{ backgroundColor: "#FFFDF8", borderColor: "#E8DFD0" }}>
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center text-lg mb-3" style={{ backgroundColor: s.bg }}>{s.icon}</div>
                  <p className="text-xl font-bold" style={{ color: "#2C1A0E" }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9B856B" }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Daily verse — featured prominently */}
              <div className="col-span-2 rounded-xl border p-6" style={{ backgroundColor: "#FFFDF8", borderColor: "#E8DFD0" }}>
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#C17A3F" }}>✦ Vers van de dag</span>
                </div>
                <blockquote className="text-xl leading-relaxed" style={{ fontFamily: "Georgia, serif", color: "#2C1A0E", fontStyle: "italic" }}>
                  &ldquo;Uw woord is een lamp voor mijn voet en een licht op mijn pad.&rdquo;
                </blockquote>
                <div className="mt-5 pt-5 border-t flex items-center justify-between" style={{ borderColor: "#E8DFD0" }}>
                  <cite className="not-italic font-semibold text-sm" style={{ color: "#C17A3F" }}>Psalm 119:105 — Statenvertaling</cite>
                  <button className="text-xs font-medium px-3 py-1.5 rounded-md" style={{ backgroundColor: "#F0E8DC", color: "#8B6A3E" }}>Lees context</button>
                </div>
              </div>

              {/* Continue */}
              <div className="rounded-xl border p-5 flex flex-col justify-between" style={{ backgroundColor: "#FFFDF8", borderColor: "#E8DFD0" }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9B856B" }}>Verder lezen</p>
                  <p className="text-lg font-bold mt-3" style={{ fontFamily: "Georgia, serif", color: "#2C1A0E" }}>Johannes 3</p>
                  <p className="text-sm mt-0.5" style={{ color: "#9B856B" }}>Statenvertaling</p>
                </div>
                <button className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#C17A3F" }}>
                  Doorgaan →
                </button>
              </div>
            </div>

            {/* Methods teaser */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#9B856B" }}>Studiemethoden</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: "Inductieve methode", sub: "Observeer · Interpreteer · Toepas", tag: "Populair" },
                  { name: "SOAP methode", sub: "Dagelijks bijbellezen", tag: "Beginners" },
                  { name: "SOLVAT methode", sub: "Systematisch & grondig", tag: "Gevorderd" },
                ].map(m => (
                  <div key={m.name} className="rounded-xl border p-5 cursor-pointer group" style={{ backgroundColor: "#FFFDF8", borderColor: "#E8DFD0" }}>
                    <div className="flex items-start justify-between mb-3">
                      <p className="font-semibold text-sm" style={{ fontFamily: "Georgia, serif", color: "#2C1A0E" }}>{m.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FEE4CC", color: "#8B6A3E" }}>{m.tag}</span>
                    </div>
                    <p className="text-xs" style={{ color: "#9B856B" }}>{m.sub}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Selector */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white text-sm px-5 py-2.5 rounded-full shadow-xl z-50" style={{ backgroundColor: "#1E3A2F" }}>
        <Link href="/preview/1" className="text-green-300 hover:text-green-200">← Stijl 1</Link>
        <span className="opacity-40">·</span>
        <span className="font-semibold">Stijl 2 — Warm Scripture</span>
        <span className="opacity-40">·</span>
        <Link href="/preview/3" className="text-green-300 hover:text-green-200">Stijl 3 →</Link>
      </div>
    </div>
  )
}
