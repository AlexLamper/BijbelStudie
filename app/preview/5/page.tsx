// STYLE PREVIEW 5 - "Slate & Teal"
// Light slate bg · Charcoal sidebar · Teal accent · Ultra-clean cards

import Link from "next/link"
import { LayoutDashboard, BookOpen, BookMarked, StickyNote, Library, User, Settings, ArrowRight, Moon, Flame } from "lucide-react"

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: BookOpen,         label: "Bijbelstudie" },
  { icon: BookMarked,       label: "Leesplannen" },
  { icon: StickyNote,       label: "Notities" },
  { icon: Library,          label: "Hulpbronnen" },
]
const BOTTOM = [{ icon: User, label: "Profiel" }, { icon: Settings, label: "Instellingen" }]

const SIDEBAR = "#1F2937"   // gray-800
const ACCENT  = "#0D9488"   // teal-600
const PAGE_BG = "#F3F4F6"   // gray-100
const BORDER  = "#E5E7EB"

export default function Preview5() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif", backgroundColor: PAGE_BG }}>

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ backgroundColor: SIDEBAR }}>
        <div className="px-4 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: ACCENT }}>
              <span className="text-white font-bold text-xs">B</span>
            </div>
            <span className="text-white font-semibold text-sm">BijbelStudie</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
            <span>🔍</span> Zoeken...
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          <p className="px-3 py-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Menu</p>
          {NAV.map(({ icon: Icon, label, active }) => (
            <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer"
              style={{
                backgroundColor: active ? "rgba(13,148,136,0.2)" : "transparent",
                color: active ? "#2DD4BF" : "rgba(255,255,255,0.55)",
                borderLeft: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                fontWeight: active ? 600 : 400,
              }}>
              <Icon className="h-4 w-4 flex-shrink-0" />{label}
            </div>
          ))}
        </nav>

        <div className="px-2 pb-3 pt-2 space-y-0.5 border-t border-white/10">
          {BOTTOM.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ color: "rgba(255,255,255,0.45)" }}>
              <Icon className="h-4 w-4" />{label}
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: ACCENT }}>A</div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">Alex Lamper</p>
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>Pro lid</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-white flex items-center justify-between px-6 flex-shrink-0" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: "#CCFBF1", color: "#0F766E" }}>
              <Flame className="h-3 w-3" /> 12 dagenreeks
            </div>
            <button className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400">
              <Moon className="h-3.5 w-3.5" />
            </button>
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: ACCENT }}>A</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5" style={{ backgroundColor: PAGE_BG }}>
          <div className="max-w-4xl mx-auto space-y-5">

            {/* Welcome banner */}
            <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: `linear-gradient(120deg, ${SIDEBAR} 0%, #374151 100%)` }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#2DD4BF" }}>Welkom terug</p>
                <h2 className="text-xl font-bold text-white">Goedemorgen, Alex!</h2>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Zondag 18 mei 2025</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">68<span className="text-lg">%</span></p>
                <p className="text-xs" style={{ color: "#2DD4BF" }}>Leesplan compleet</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Dagreeks",     value: "12",  unit: "dagen", icon: "🔥" },
                { label: "Notities",     value: "34",  unit: "stuks", icon: "✏️" },
                { label: "Hoofdstukken", value: "142", unit: "gelezen", icon: "📖" },
                { label: "Methoden",     value: "4",   unit: "actief", icon: "🔬" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-4 border flex items-center gap-3" style={{ borderColor: BORDER }}>
                  <div className="text-2xl">{s.icon}</div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{s.value} <span className="text-xs font-normal text-gray-400">{s.unit}</span></p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Verse */}
              <div className="col-span-2 bg-white rounded-2xl p-6 border" style={{ borderColor: BORDER }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1 w-4 rounded-full" style={{ backgroundColor: ACCENT }} />
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Vers van de dag</p>
                </div>
                <p className="text-lg leading-loose text-gray-700 italic" style={{ fontFamily: "Georgia, serif" }}>
                  &ldquo;Uw woord is een lamp voor mijn voet en een licht op mijn pad.&rdquo;
                </p>
                <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <span className="font-bold text-sm" style={{ color: ACCENT }}>Psalm 119:105</span>
                  <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#CCFBF1", color: "#0F766E" }}>
                    Lees meer <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Continue + plan */}
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 border" style={{ borderColor: BORDER }}>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Verder lezen</p>
                  <p className="font-bold text-gray-900">Johannes 3</p>
                  <p className="text-xs text-gray-400 mb-3">Statenvertaling</p>
                  <button className="w-full py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>Doorgaan →</button>
                </div>
                <div className="bg-white rounded-xl p-4 border" style={{ borderColor: BORDER }}>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Vandaag te lezen</p>
                  {["Mattheüs 5", "Mattheüs 6"].map((ch, i) => (
                    <div key={ch} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: i === 0 ? ACCENT : BORDER, backgroundColor: i === 0 ? ACCENT : "transparent" }}>
                          {i === 0 && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className="text-xs text-gray-600">{ch}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick nav */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Bijbelstudie", icon: "📖", col: ACCENT },
                { label: "Leesplannen",  icon: "📋", col: "#6366F1" },
                { label: "Notities",     icon: "✏️", col: "#F59E0B" },
                { label: "Hulpbronnen", icon: "📚", col: "#EC4899" },
              ].map(q => (
                <div key={q.label} className="bg-white rounded-xl p-4 border flex items-center justify-between cursor-pointer group hover:shadow-sm transition-all" style={{ borderColor: BORDER }}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: q.col + "18" }}>{q.icon}</div>
                    <span className="text-sm font-semibold text-gray-800">{q.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white text-xs px-4 py-2 rounded-full shadow-xl z-50" style={{ backgroundColor: SIDEBAR }}>
        <Link href="/preview/4" className="opacity-70 hover:opacity-100">← Stijl 4</Link>
        <span className="opacity-30">·</span>
        <span className="font-semibold">Stijl 5 - Slate & Teal</span>
        <span className="opacity-30">·</span>
        <Link href="/preview/6" className="opacity-70 hover:opacity-100">Stijl 6 →</Link>
      </div>
    </div>
  )
}
