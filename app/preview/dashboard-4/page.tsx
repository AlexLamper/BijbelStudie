// DASHBOARD CONCEPT 4 - "Groeioverzicht"
// Kerngedachte: het platform laat je GROEIEN als bijbelstudent.
// Centrum: je voortgang en ontwikkeling over tijd. Data-gedreven zelfinzicht.

import Link from "next/link"
import {
  TrendingUp, Flame, StickyNote, BookOpen,
  BarChart2, CalendarDays, ArrowRight, Star,
} from "lucide-react"

const NAV = [
  { href: "/preview/dashboard-1", label: "Concept 1 - Dagelijks Kompas" },
  { href: "/preview/dashboard-2", label: "Concept 2 - Bijbelreis" },
  { href: "/preview/dashboard-3", label: "Concept 3 - Studiewerkblad" },
  { href: "/preview/dashboard-4", label: "Concept 4 - Groeioverzicht", active: true },
]

const T = { teal: "#0D9488", border: "#E5E7EB", text: "#111827", muted: "#6B7280", bg: "#F9FAFB", card: "#FFFFFF" }

// Reading heatmap: 52 weken × 7 dagen (vereenvoudigd: 12 weken tonen)
const HEATMAP_WEEKS = Array.from({ length: 15 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    const r = Math.random()
    if (w === 14 && d > 4) return 0
    return r > 0.45 ? (r > 0.8 ? 3 : r > 0.65 ? 2 : 1) : 0
  })
)

const MONTH_LABELS = ["Feb", "Mrt", "Apr", "Mei"]
const DAY_LABELS = ["", "Di", "", "Do", "", "Za", ""]

const HEATMAP_COLORS: Record<number, string> = {
  0: "#F3F4F6",
  1: "#CCFBF1",
  2: "#5EEAD4",
  3: "#0D9488",
}

const BADGES = [
  { name: "Eerste week",    icon: "🔥", earned: true,  desc: "7 dagen op rij gelezen" },
  { name: "30-dagenreeks",  icon: "⚡", earned: false, desc: "30 dagen aaneengesloten" },
  { name: "Notities-held",  icon: "✏️", earned: true,  desc: "25 notities geschreven" },
  { name: "Evangelist",     icon: "📖", earned: true,  desc: "Alle 4 evangeliën gelezen" },
  { name: "Brieven-lezer",  icon: "📜", earned: false, desc: "Alle brieven van Paulus" },
  { name: "90-dagenreeks",  icon: "👑", earned: false, desc: "90 dagen op rij gelezen" },
]

const MONTHLY_STATS = [
  { month: "Jan", chapters: 18, notes: 6 },
  { month: "Feb", chapters: 24, notes: 10 },
  { month: "Mrt", chapters: 31, notes: 14 },
  { month: "Apr", chapters: 28, notes: 9 },
  { month: "Mei", chapters: 22, notes: 8 },
]
const MAX_CH = 31

export default function DashboardConcept4() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", minHeight: "100vh", backgroundColor: T.bg }}>

      {/* Preview nav */}
      <div style={{ backgroundColor: "#1F2937", padding: "10px 24px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: n.active ? 600 : 400, textDecoration: "none",
            backgroundColor: n.active ? T.teal : "rgba(255,255,255,0.08)",
            color: n.active ? "white" : "rgba(255,255,255,0.6)",
          }}>{n.label}</Link>
        ))}
      </div>

      {/* Concept label */}
      <div style={{ padding: "20px 32px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.teal, margin: 0 }}>Concept 4</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "2px 0 4px" }}>Groeioverzicht</h1>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
          Het platform als spiegel van je groei. Centrum = data en voortgang over tijd. Je ziet hoe je jezelf ontwikkelt als bijbelstudent.
        </p>
      </div>

      <div style={{ padding: "20px 32px 40px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 1100 }}>

        {/* Top stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "Dagreeks",          val: "12",  sub: "Persoonlijk record: 21",   icon: Flame,     color: "#EA580C", bg: "rgba(234,88,12,0.08)" },
            { label: "Notities",          val: "34",  sub: "+8 deze maand",            icon: StickyNote,color: "#D97706", bg: "rgba(217,119,6,0.08)" },
            { label: "Hoofdstukken",      val: "142", sub: "+22 deze maand",           icon: BookOpen,  color: T.teal,    bg: "rgba(13,148,136,0.08)" },
            { label: "Bijbelboeken",      val: "22",  sub: "van 66 begonnen",          icon: BarChart2, color: "#6366F1", bg: "rgba(99,102,241,0.08)" },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: T.muted, margin: 0 }}>{s.label}</p>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={15} color={s.color} />
                </div>
              </div>
              <p style={{ fontSize: 32, fontWeight: 800, color: T.text, margin: "0 0 2px", lineHeight: 1 }}>{s.val}</p>
              <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Heatmap + maandgrafiek */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>

          {/* Leeskalender */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CalendarDays size={16} color={T.teal} />
                <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: 0 }}>Leeskalender</p>
              </div>
              <div style={{ display: "flex", gap: 6, fontSize: 11, color: T.muted, alignItems: "center" }}>
                <span>Minder</span>
                {[0,1,2,3].map(l => (
                  <div key={l} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: HEATMAP_COLORS[l] }} />
                ))}
                <span>Meer</span>
              </div>
            </div>

            {/* Month labels */}
            <div style={{ display: "flex", marginLeft: 20, marginBottom: 4, gap: 2 }}>
              {MONTH_LABELS.map((m, i) => (
                <span key={m} style={{ fontSize: 10, color: T.muted, flex: i < 3 ? "4 0 0" : "3 0 0", paddingLeft: 2 }}>{m}</span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 3 }}>
              {/* Day labels */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 2 }}>
                {DAY_LABELS.map((d, i) => (
                  <span key={i} style={{ fontSize: 9, color: T.muted, height: 12, lineHeight: "12px" }}>{d}</span>
                ))}
              </div>
              {/* Grid */}
              {HEATMAP_WEEKS.map((week, wi) => (
                <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {week.map((val, di) => (
                    <div key={di} style={{
                      width: 12, height: 12, borderRadius: 2,
                      backgroundColor: HEATMAP_COLORS[val] || "#F3F4F6",
                    }} />
                  ))}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: T.muted, margin: "10px 0 0" }}>142 hoofdstukken gelezen in de afgelopen 15 weken</p>
          </div>

          {/* Maandelijkse staafgrafiek */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <TrendingUp size={16} color={T.teal} />
              <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: 0 }}>Maandelijkse activiteit</p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 120 }}>
              {MONTHLY_STATS.map(s => (
                <div key={s.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                  <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2 }}>
                    {/* Notes bar */}
                    <div style={{ width: "100%", borderRadius: "4px 4px 0 0", height: `${(s.notes / 14) * 40}%`, backgroundColor: "rgba(13,148,136,0.2)" }} />
                    {/* Chapters bar */}
                    <div style={{ width: "100%", borderRadius: "4px 4px 0 0", height: `${(s.chapters / MAX_CH) * 60}%`, backgroundColor: T.teal }} />
                  </div>
                  <span style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>{s.month}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.muted }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: T.teal }} /> Hoofdstukken
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.muted }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: "rgba(13,148,136,0.2)" }} /> Notities
              </div>
            </div>
          </div>
        </div>

        {/* Badges / prestaties */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Star size={16} color={T.teal} />
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.text, margin: 0 }}>
              Prestaties <span style={{ color: T.muted, fontWeight: 400 }}>· 3 van 6 behaald</span>
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
            {BADGES.map(b => (
              <div key={b.name} style={{
                padding: 16, borderRadius: 12, textAlign: "center",
                border: `1px solid ${b.earned ? "rgba(13,148,136,0.2)" : T.border}`,
                backgroundColor: b.earned ? "rgba(13,148,136,0.04)" : T.bg,
                opacity: b.earned ? 1 : 0.45,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{b.icon}</div>
                <p style={{ fontSize: 11, fontWeight: 700, color: b.earned ? T.text : T.muted, margin: "0 0 3px" }}>{b.name}</p>
                <p style={{ fontSize: 10, color: T.muted, margin: 0, lineHeight: 1.4 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA: bekijk je voortgang in de app */}
        <div style={{ backgroundColor: "#1F2937", borderRadius: 16, padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "#9CA3AF", fontSize: 12, margin: "0 0 2px" }}>Klaar voor vandaag?</p>
            <p style={{ color: "white", fontSize: 16, fontWeight: 700, margin: 0 }}>Bouw je reeks uit - lees Mattheüs 7</p>
          </div>
          <Link href="/studie" style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 20px",
            borderRadius: 10, backgroundColor: T.teal, color: "white",
            fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Begin nu <ArrowRight size={13} />
          </Link>
        </div>

      </div>
    </div>
  )
}
