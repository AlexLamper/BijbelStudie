// DASHBOARD CONCEPT 1 — "Dagelijks Kompas"
// Kerngedachte: het platform is er voor een DAGELIJKSE DISCIPLINE.
// Centrum: wat moet ik vandaag doen? Heb ik het gedaan?

import Link from "next/link"
import {
  CheckCircle2, Circle, Flame, BookOpen, PenLine,
  ArrowRight, ChevronRight, BarChart2, CalendarDays,
} from "lucide-react"

const NAV = [
  { href: "/preview/dashboard-1", label: "Concept 1 — Dagelijks Kompas", active: true },
  { href: "/preview/dashboard-2", label: "Concept 2 — Bijbelreis" },
  { href: "/preview/dashboard-3", label: "Concept 3 — Studiewerkblad" },
  { href: "/preview/dashboard-4", label: "Concept 4 — Groeioverzicht" },
]

const T = { teal: "#0D9488", border: "#E5E7EB", text: "#111827", muted: "#6B7280", bg: "#F9FAFB", card: "#FFFFFF" }

const DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]
const STREAK_DATA = [true, true, true, true, false, true, true]

const TASKS = [
  { label: "Vers van de dag gelezen",    done: true },
  { label: "Bijbelhoofdstuk gelezen",    done: true },
  { label: "Notitie geschreven",         done: false },
  { label: "Leesplan bijgewerkt",        done: false },
]

const PLAN_DAYS = Array.from({ length: 30 }, (_, i) => i < 20)

export default function DashboardConcept1() {
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
      <div style={{ padding: "20px 32px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.teal, margin: 0 }}>Concept 1</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "2px 0 4px" }}>Dagelijks Kompas</h1>
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
            Het platform als dagelijkse spirituele routine. Centrum = vandaag. Heb je je dagelijkse discipline volgehouden?
          </p>
        </div>
      </div>

      <div style={{ padding: "20px 32px 40px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 1100 }}>

        {/* Row 1: Greeting + streak */}
        <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>

          {/* Greeting + verse */}
          <div style={{ flex: 2, backgroundColor: "#1F2937", borderRadius: 16, padding: "28px 32px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.15), transparent)", transform: "translate(40%, -40%)" }} />
            <p style={{ color: "#9CA3AF", fontSize: 13, margin: "0 0 4px" }}>Goedemorgen, Alex</p>
            <h2 style={{ color: "white", fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>Donderdag 18 mei 2025</h2>
            <div style={{ borderLeft: "2px solid #0D9488", paddingLeft: 16 }}>
              <p style={{ color: "#E5E7EB", fontSize: 15, fontStyle: "italic", fontFamily: "Georgia, serif", lineHeight: 1.7, margin: "0 0 8px" }}>
                &ldquo;Uw woord is een lamp voor mijn voet, en een licht op mijn pad.&rdquo;
              </p>
              <p style={{ color: "#2DD4BF", fontSize: 12, fontWeight: 600, margin: 0 }}>Psalm 119:105 · Statenvertaling</p>
            </div>
            <Link href="/study" style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6, color: "#2DD4BF", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Lees dit hoofdstuk <ChevronRight size={14} />
            </Link>
          </div>

          {/* Streak */}
          <div style={{ flex: 1, backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, margin: 0 }}>Dagreeks</p>
              <Flame size={18} color="#EA580C" />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: T.text, lineHeight: 1 }}>12</span>
              <span style={{ fontSize: 14, color: T.muted }}>dagen</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {DAYS.map((d, i) => (
                <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", height: 28, borderRadius: 4, backgroundColor: STREAK_DATA[i] ? T.teal : "#F3F4F6" }} />
                  <span style={{ fontSize: 9, color: T.muted }}>{d}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>Nog 3 dagen voor een nieuwe badge</p>
          </div>
        </div>

        {/* Row 2: Vandaag + doorgaan + plan */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 16 }}>

          {/* Today's checklist */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <CalendarDays size={16} color={T.teal} />
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.text, margin: 0 }}>Vandaag</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {TASKS.map(task => (
                <div key={task.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {task.done
                    ? <CheckCircle2 size={16} color={T.teal} style={{ flexShrink: 0 }} />
                    : <Circle size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 13, color: task.done ? T.muted : T.text, textDecoration: task.done ? "line-through" : "none" }}>
                    {task.label}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, height: 4, backgroundColor: "#F3F4F6", borderRadius: 4 }}>
              <div style={{ width: "50%", height: "100%", backgroundColor: T.teal, borderRadius: 4 }} />
            </div>
            <p style={{ fontSize: 11, color: T.muted, margin: "6px 0 0" }}>2 van 4 voltooid</p>
          </div>

          {/* Doorgaan */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, margin: "0 0 14px" }}>Verder lezen</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(13,148,136,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={18} color={T.teal} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>Mattheüs 5</p>
                  <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>Statenvertaling</p>
                </div>
              </div>
            </div>
            <Link href="/study" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", borderRadius: 10, backgroundColor: T.teal, color: "white",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              Doorgaan <ArrowRight size={14} />
            </Link>
          </div>

          {/* Leesplan */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, margin: "0 0 14px" }}>Leesplan</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 2px" }}>Bijbel in een jaar</p>
            <p style={{ fontSize: 12, color: T.muted, margin: "0 0 14px" }}>Dag 248 van 365 · 68% voltooid</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 12 }}>
              {PLAN_DAYS.map((done, i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: done ? T.teal : "#F3F4F6" }} />
              ))}
              <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: T.border, border: `2px solid ${T.teal}` }} />
            </div>
            <p style={{ fontSize: 12, color: T.muted, margin: "0 0 10px" }}>Vandaag: Lukas 14-15</p>
            <Link href="/plans" style={{ fontSize: 13, fontWeight: 600, color: T.teal, textDecoration: "none" }}>
              Open leesplan →
            </Link>
          </div>
        </div>

        {/* Row 3: Recent notities */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PenLine size={16} color={T.teal} />
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.text, margin: 0 }}>Recente notities</p>
            </div>
            <Link href="/notes" style={{ fontSize: 12, color: T.teal, textDecoration: "none", fontWeight: 600 }}>Alle notities →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { ref: "Mattheüs 5:3", text: "Zalig de armen van geest, want hunner is het Koninkrijk der hemelen..." },
              { ref: "Psalm 23:1", text: "De Heere is mijn Herder — hieruit volgt alles. Geen tekort, geen vrees..." },
              { ref: "Johannes 15:5", text: "Ik ben de Wijnstok. Verblijven in Hem betekent dagelijks afhankelijkheid..." },
            ].map(n => (
              <div key={n.ref} style={{ backgroundColor: T.bg, borderRadius: 10, padding: 14, border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: T.teal, margin: "0 0 6px" }}>{n.ref}</p>
                <p style={{ fontSize: 12, color: T.muted, margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>{n.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
