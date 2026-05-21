// DASHBOARD CONCEPT 3 - "Studiewerkblad"
// Kerngedachte: het platform is een STUDIEHULPMIDDEL.
// Centrum: de actieve studie-sessie. Tools zijn prominent; het gaat om DIEPTE.

import Link from "next/link"
import {
  PenLine, Layers, MessageCircle,
  ChevronRight, ArrowRight, Info, Lightbulb,
} from "lucide-react"

const NAV = [
  { href: "/preview/dashboard-1", label: "Concept 1 - Dagelijks Kompas" },
  { href: "/preview/dashboard-2", label: "Concept 2 - Bijbelreis" },
  { href: "/preview/dashboard-3", label: "Concept 3 - Studiewerkblad", active: true },
  { href: "/preview/dashboard-4", label: "Concept 4 - Groeioverzicht" },
]

const T = { teal: "#0D9488", border: "#E5E7EB", text: "#111827", muted: "#6B7280", bg: "#F9FAFB", card: "#FFFFFF" }

const METHODS = [
  { id: "inductief", name: "Inductief",     tag: "Grondig",      color: T.teal,    icon: Layers,         desc: "Observeer · Interpreteer · Toepas" },
  { id: "soap",      name: "SOAP",          tag: "Dagelijks",    color: "#6366F1", icon: PenLine,        desc: "Schrift · Observatie · Toepassing · Gebed" },
  { id: "solvat",    name: "SOLVAT",        tag: "Systematisch", color: "#0284C7", icon: Info,           desc: "6 stappen diepgaand onderzoek" },
  { id: "lectio",    name: "Lectio Divina", tag: "Contemplatief",color: "#DB2777", icon: MessageCircle,  desc: "Lees · Overweeg · Bid · Rust" },
]

const MY_NOTES = [
  { ref: "Mattheüs 5:3",   method: "SOAP",     text: "De zaligsprekingen keren de wereld op zijn kop. Arm zijn in de geest is...", date: "gisteren" },
  { ref: "Mattheüs 5:9",   method: "Inductief", text: "Vredemakers worden kinderen Gods genoemd. De betekenis van vrede in de Hebreeuwse context...", date: "2 dagen" },
  { ref: "Psalm 23:2",     method: "Lectio",    text: "Stille wateren. God dwingt niet, Hij leidt zachtjes. Dit heeft me diep geraakt...", date: "4 dagen" },
  { ref: "Romeinen 8:28",  method: "SOAP",     text: "Alle dingen werken mee ten goede. Niet alles is goed, maar God gebruikt alles...", date: "6 dagen" },
]

const COMMENTARIES = [
  { name: "Matthew Henry (NL)", passage: "Mattheüs 5:3-12", preview: "De Zaligsprekingen beschrijven de karaktereigenschappen van het hemelse Koninkrijk..." },
  { name: "Karl August Dachsel", passage: "Mattheüs 5:3",    preview: "De arme van geest erkent zijn geestelijke onvermogen en leegt zich voor God..." },
]

export default function DashboardConcept3() {
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
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.teal, margin: 0 }}>Concept 3</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "2px 0 4px" }}>Studiewerkblad</h1>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
          Het platform als actief studiehulpmiddel. Centrum = de studie-sessie zelf. Methode, commentaar, notities staan centraal.
        </p>
      </div>

      <div style={{ padding: "20px 32px 40px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 1100 }}>

        {/* 2-col: actieve sessie + methode kiezer */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>

          {/* Actieve studie */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 11, color: T.muted, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Actieve studie</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: "0 0 2px" }}>Mattheüs 5</p>
                <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>Statenvertaling · Inductieve methode</p>
              </div>
              <Link href="/studie" style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 8, backgroundColor: T.teal, color: "white",
                fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>
                Open <ArrowRight size={13} />
              </Link>
            </div>

            {/* Drie studiestappen als workflow */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { step: "1", title: "Observeer",    desc: "Wat staat er letterlijk? Markeer sleutelwoorden.", done: true },
                { step: "2", title: "Interpreteer", desc: "Wat betekent het in context? Raadpleeg commentaar.", done: true },
                { step: "3", title: "Toepassen",    desc: "Wat betekent dit voor mijn leven vandaag?",         done: false },
              ].map(s => (
                <div key={s.step} style={{
                  padding: 14, borderRadius: 10, border: `1px solid ${s.done ? "rgba(13,148,136,0.2)" : T.border}`,
                  backgroundColor: s.done ? "rgba(13,148,136,0.04)" : T.bg,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: s.done ? T.teal : T.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: s.done ? "white" : T.muted }}>{s.step}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.done ? T.teal : T.text }}>{s.title}</span>
                  </div>
                  <p style={{ fontSize: 11, color: T.muted, margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Commentaar sectie */}
            <div style={{ marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: "#FFFBF0", border: "1px solid #FDE68A" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Lightbulb size={13} color="#D97706" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.06em" }}>Commentaar · Matthew Henry</span>
              </div>
              <p style={{ fontSize: 12, color: "#78350F", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                &ldquo;De Zaligsprekingen beschrijven de karaktereigenschappen van burgers van het hemelse Koninkrijk. Arm van geest zijn betekent het eigen onvermogen erkennen...&rdquo;
              </p>
            </div>
          </div>

          {/* Kies een methode */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, margin: "0 0 14px" }}>Kies een studiemethode</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {METHODS.map(m => (
                <div key={m.id} style={{
                  padding: "12px 14px", borderRadius: 10, border: `1px solid ${m.id === "inductief" ? `${m.color}40` : T.border}`,
                  backgroundColor: m.id === "inductief" ? `${m.color}08` : T.bg,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${m.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <m.icon size={15} color={m.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: m.id === "inductief" ? m.color : T.text }}>{m.name}</span>
                      {m.id === "inductief" && <span style={{ fontSize: 10, backgroundColor: `${m.color}15`, color: m.color, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>Actief</span>}
                    </div>
                    <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>{m.desc}</p>
                  </div>
                  <ChevronRight size={14} color={T.muted} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notities */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PenLine size={16} color={T.teal} />
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.text, margin: 0 }}>
                Mijn studieannotaties <span style={{ color: T.muted, fontWeight: 400 }}>· 34 notities</span>
              </p>
            </div>
            <Link href="/notities" style={{ fontSize: 12, color: T.teal, textDecoration: "none", fontWeight: 600 }}>Alle notities →</Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {MY_NOTES.map(n => (
              <div key={n.ref} style={{ padding: 14, backgroundColor: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.teal }}>{n.ref}</span>
                  <span style={{ fontSize: 10, color: "#9CA3AF", backgroundColor: T.card, padding: "1px 5px", borderRadius: 4, border: `1px solid ${T.border}` }}>{n.method}</span>
                </div>
                <p style={{ fontSize: 12, color: T.muted, margin: "0 0 6px", lineHeight: 1.55, fontStyle: "italic" }}>
                  {n.text}
                </p>
                <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0 }}>{n.date} geleden</p>
              </div>
            ))}
          </div>
        </div>

        {/* Commentaren */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <MessageCircle size={16} color={T.teal} />
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.text, margin: 0 }}>Bijbelcommentaren</p>
            <span style={{ fontSize: 11, backgroundColor: "rgba(13,148,136,0.08)", color: T.teal, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>Pro</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {COMMENTARIES.map(c => (
              <div key={c.name} style={{ padding: 16, borderRadius: 10, border: `1px solid ${T.border}`, backgroundColor: T.bg }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: "0 0 2px" }}>{c.name}</p>
                <p style={{ fontSize: 11, color: T.teal, margin: "0 0 8px" }}>{c.passage}</p>
                <p style={{ fontSize: 12, color: T.muted, margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>{c.preview}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
