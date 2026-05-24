"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff, ArrowLeft, Check, BookOpen, BookMarked, StickyNote, Library } from "lucide-react"

const BENEFITS = [
  "Bijbel lezen in meerdere vertalingen",
  "Persoonlijke notities bij verzen",
  "Bijbelleesplannen volgen",
  "Bewezen studiemethoden gebruiken",
  "Voortgang en streak bijhouden",
]

const PANEL_FEATURES = [
  { icon: BookOpen,    title: "Bijbelvertalingen",    desc: "Lees de Statenvertaling en meer vertalingen" },
  { icon: BookMarked,  title: "10 begeleide studies", desc: "Over personen, thema's en gebeurtenissen" },
  { icon: StickyNote,  title: "Notities & markering", desc: "Sla inzichten op bij elk vers" },
  { icon: Library,     title: "Studiemethoden",       desc: "Inductief, SOAP, SOLVAT en meer" },
]

function FeaturePanel() {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16 relative overflow-hidden"
      style={{ backgroundColor: "#1F2937" }}
    >
      <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #0D9488, transparent)", transform: "translate(30%, -30%)" }} />
      <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #0D9488, transparent)", transform: "translate(-30%, 30%)" }} />

      <div className="relative z-10 space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#2DD4BF" }}>
            Gratis beginnen
          </p>
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight">
            Alles wat je nodig hebt<br />voor Bijbelstudie
          </h2>
          <p className="mt-4 leading-relaxed text-sm" style={{ color: "#9CA3AF" }}>
            Maak in minder dan een minuut een gratis account aan.
          </p>
        </div>

        <div className="space-y-2.5">
          {BENEFITS.map((b) => (
            <div key={b} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(13,148,136,0.25)" }}>
                <Check className="h-3 w-3" style={{ color: "#2DD4BF" }} />
              </div>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{b}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {PANEL_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl p-4 border"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}>
              <Icon className="h-4 w-4 mb-2" style={{ color: "#2DD4BF" }} />
              <p className="text-white text-xs font-semibold">{title}</p>
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(p => ({ ...p, [name]: value }))
    setError("")
  }

  const validate = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("Vul alle velden in."); return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Voer een geldig e-mailadres in."); return false
    }
    if (formData.password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens bevatten."); return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Wachtwoorden komen niet overeen."); return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push("/auth/signin?registered=true")
      } else {
        setError(data.error || "Registratie mislukt. Probeer het opnieuw.")
      }
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* Left: Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 md:px-16 xl:px-24 py-12 relative">
        <Link href="/" className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Terug
        </Link>

        <div className="max-w-sm mx-auto w-full space-y-7">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image src="/images/favicon.ico" alt="BijbelStudie" width={28} height={28} className="rounded-md" priority />
            <span className="font-bold text-lg text-foreground">BijbelStudie</span>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Account aanmaken
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              Al een account?{" "}
              <Link href="/auth/signin" className="text-teal-600 dark:text-teal-400 hover:underline font-medium">
                Log hier in
              </Link>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Naam</label>
              <input
                id="name" name="name" type="text" required autoComplete="name"
                value={formData.name} onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                placeholder="Jouw naam"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mailadres</label>
              <input
                id="email" name="email" type="email" required autoComplete="email"
                value={formData.email} onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                placeholder="jouw@email.nl"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Wachtwoord</label>
              <div className="relative">
                <input
                  id="password" name="password" type={showPassword ? "text" : "password"} required autoComplete="new-password"
                  value={formData.password} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                  placeholder="Minimaal 8 tekens"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bevestig wachtwoord</label>
              <div className="relative">
                <input
                  id="confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} required autoComplete="new-password"
                  value={formData.confirmPassword} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                  placeholder="Herhaal wachtwoord"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Account aanmaken...</>
              ) : "Account aanmaken"}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Door te registreren ga je akkoord met onze{" "}
            <Link href="/terms-of-service" className="underline hover:text-foreground">servicevoorwaarden</Link>
            {" "}en{" "}
            <Link href="/privacy-policy" className="underline hover:text-foreground">privacybeleid</Link>.
          </p>
        </div>
      </div>

      {/* Right: Feature panel */}
      <FeaturePanel />
    </div>
  )
}
