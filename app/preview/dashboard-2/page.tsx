// DASHBOARD CONCEPT 2 - "Bijbelreis"
// Kerngedachte: het platform is een REIS door de Bijbel.
// Centrum: waar ben je in de Bijbel? Wat heb je al gelezen?

import Link from "next/link"
import { BookOpen, MapPin, BookMarked, ArrowRight, CheckCircle2 } from "lucide-react"

const NAV = [
  { href: "/preview/dashboard-1", label: "Concept 1 - Dagelijks Kompas" },
  { href: "/preview/dashboard-2", label: "Concept 2 - Bijbelreis", active: true },
  { href: "/preview/dashboard-3", label: "Concept 3 - Studiewerkblad" },
  { href: "/preview/dashboard-4", label: "Concept 4 - Groeioverzicht" },
]

const T = { teal: "#0D9488", border: "#E5E7EB", text: "#111827", muted: "#6B7280", bg: "#F9FAFB", card: "#FFFFFF" }

const OT_BOOKS = [
  { name: "Genesis",      done: true },
  { name: "Exodus",       done: true },
  { name: "Leviticus",    done: false },
  { name: "Numeri",       done: false },
  { name: "Deuteronomium",done: false },
  { name: "Jozua",        done: true },
  { name: "Richtere",     done: true },
  { name: "Ruth",         done: true },
  { name: "1 Samuël",     done: false },
  { name: "2 Samuël",     done: false },
  { name: "1 Koningen",   done: false },
  { name: "2 Koningen",   done: false },
  { name: "Psalmen",      done: true },
  { name: "Spreuken",     done: true },
  { name: "Jesaja",       done: false },
  { name: "Jeremia",      done: false },
]

const NT_BOOKS = [
  { name: "Mattheüs",     done: true,    current: false },
  { name: "Markus",       done: true,    current: false },
  { name: "Lukas",        done: false,   current: false },
  { name: "Johannes",     done: true,    current: false },
  { name: "Handelingen",  done: false,   current: false },
  { name: "Romeinen",     done: true,    current: false },
  { name: "1 Korinthe",   done: false,   current: false },
  { name: "2 Korinthe",   done: false,   current: false },
  { name: "Galaten",      done: true,    current: false },
  { name: "Efeziërs",     done: false,   current: false },
  { name: "Filippenzen",  done: true,    current: false },
  { name: "Kolossenzen",  done: false,   current: false },
  { name: "Openbaring",   done: false,   current: false },
]

const RECENT_CHAPTERS = [
  { book: "Mattheüs", ch: 6, date: "Gisteren" },
  { book: "Mattheüs", ch: 5, date: "2 dagen geleden" },
  { book: "Psalmen",  ch: 23, date: "4 dagen geleden" },
  { book: "Psalmen",  ch: 22, date: "5 dagen geleden" },
  { book: "Romeinen", ch: 8, date: "1 week geleden" },
]

export default function DashboardConcept2() {
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
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.teal, margin: 0 }}>Concept 2</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "2px 0 4px" }}>Bijbelreis</h1>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
          Het platform als een reis door de Bijbel. Centrum = voortgang door het Boek. Welke boeken heb je gelezen? Hoe ver ben je?
        </p>
      </div>

      <div style={{ padding: "20px 32px 40px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 1100 }}>

        {/* Header: where you are */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

          {/* Nu aan het lezen */}
          <div style={{ backgroundColor: "#1F2937", borderRadius: 16, padding: "22px 24px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.2), transparent)", transform: "translate(30%, -30%)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <MapPin size={13} color="#2DD4BF" />
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", margin: 0 }}>Nu aan het lezen</p>
            </div>
            <p style={{ color: "white", fontSize: 22, fontWeight: 800, margin: "0 0 2px" }}>Mattheüs 7</p>
            <p style={{ color: "#9CA3AF", fontSize: 13, margin: "0 0 16px" }}>Statenvertaling · Hoofdstuk 7 van 28</p>
            <div style={{ height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4, marginBottom: 6 }}>
              <div style={{ width: "25%", height: "100%", backgroundColor: T.teal, borderRadius: 4 }} />
            </div>
            <p style={{ color: "#6B7280", fontSize: 11, margin: "0 0 14px" }}>25% van Mattheüs gelezen</p>
            <Link href="/studie" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "#2DD4BF", fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              Verderlezen <ArrowRight size={13} />
            </Link>
          </div>

          {/* Bijbel statistieken */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "22px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, margin: "0 0 16px" }}>Bijbelreis statistieken</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Boeken gelezen",      val: "14", sub: "van 39 OT" },
                { label: "NT boeken gelezen",   val: "8",  sub: "van 27 NT" },
                { label: "Hoofdstukken",        val: "142", sub: "gelezen" },
                { label: "Bijbelboeken",        val: "22",  sub: "van 66 totaal" },
              ].map(s => (
                <div key={s.label} style={{ padding: "10px 12px", backgroundColor: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>{s.val}</p>
                  <p style={{ fontSize: 10, color: T.muted, margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0 }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent gelezen */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "22px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, margin: "0 0 14px" }}>Recentelijk gelezen</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {RECENT_CHAPTERS.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: i === 0 ? "rgba(13,148,136,0.1)" : T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <BookOpen size={13} color={i === 0 ? T.teal : T.muted} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? T.text : T.muted }}>
                      {c.book} {c.ch}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>{c.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bijbelboeken overzicht */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.text, margin: "0 0 2px" }}>Bijbelboeken overzicht</p>
              <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>22 van 66 boeken gelezen · groen = gelezen</p>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: T.muted, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: T.teal }} />
                Gelezen
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#F3F4F6", border: `1px solid ${T.border}` }} />
                Nog te lezen
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.muted, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Oude Testament</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {OT_BOOKS.map(b => (
                  <div key={b.name} style={{
                    padding: "5px 10px", borderRadius: 6, fontSize: 12,
                    backgroundColor: b.done ? "rgba(13,148,136,0.08)" : "#F9FAFB",
                    border: `1px solid ${b.done ? "rgba(13,148,136,0.25)" : T.border}`,
                    color: b.done ? T.teal : T.muted,
                    fontWeight: b.done ? 600 : 400,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    {b.done && <CheckCircle2 size={11} />}
                    {b.name}
                  </div>
                ))}
                <div style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, backgroundColor: "#F9FAFB", border: `1px dashed ${T.border}`, color: "#9CA3AF" }}>
                  + 23 meer...
                </div>
              </div>
            </div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.muted, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nieuwe Testament</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {NT_BOOKS.map(b => (
                  <div key={b.name} style={{
                    padding: "5px 10px", borderRadius: 6, fontSize: 12,
                    backgroundColor: b.done ? "rgba(13,148,136,0.08)" : "#F9FAFB",
                    border: `1px solid ${b.done ? "rgba(13,148,136,0.25)" : T.border}`,
                    color: b.done ? T.teal : T.muted,
                    fontWeight: b.done ? 600 : 400,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    {b.done && <CheckCircle2 size={11} />}
                    {b.name}
                  </div>
                ))}
                <div style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, backgroundColor: "#F9FAFB", border: `1px dashed ${T.border}`, color: "#9CA3AF" }}>
                  + 14 meer...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Aanbevolen volgende boek */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "rgba(13,148,136,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookMarked size={22} color={T.teal} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: T.muted, margin: "0 0 2px" }}>Aanbevolen volgend boek</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 2px" }}>Lukas</p>
              <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>24 hoofdstukken · Je las al Mattheüs en Markus - een logisch vervolg</p>
            </div>
          </div>
          <Link href="/studie" style={{
            padding: "10px 20px", borderRadius: 10, backgroundColor: T.teal, color: "white",
            fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}>
            Begin Lukas 1 <ArrowRight size={13} />
          </Link>
        </div>

      </div>
    </div>
  )
}
