"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { getProviders, signIn, ClientSafeProvider } from "next-auth/react"
import { Loader2, Eye, EyeOff, BookOpen, ArrowLeft } from "lucide-react"

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M47.532 24.553C47.532 22.921 47.4 21.281 47.117 19.676H24.48V28.918H37.443C36.906 31.899 35.177 34.536 32.646 36.211V42.208H40.38C44.922 38.028 47.532 31.855 47.532 24.553Z" fill="#4285F4"/>
    <path d="M24.48 48.002C30.953 48.002 36.412 45.876 40.389 42.208L32.655 36.211C30.503 37.675 27.725 38.504 24.489 38.504C18.228 38.504 12.919 34.28 11.014 28.601H3.033V34.782C7.107 42.887 15.406 48.002 24.48 48.002Z" fill="#34A853"/>
    <path d="M11.005 28.601C9.999 25.62 9.999 22.392 11.005 19.412V13.23H3.033C-0.371 20.011 -0.371 28.001 3.033 34.782L11.005 28.601Z" fill="#FBBC04"/>
    <path d="M24.48 9.499C27.902 9.446 31.209 10.734 33.687 13.097L40.539 6.245C36.2 2.171 30.441-0.069 24.48 0.002C15.406 0.002 7.107 5.116 3.033 13.23L11.005 19.412C12.901 13.723 18.219 9.499 24.48 9.499Z" fill="#EA4335"/>
  </svg>
)

import { BookMarked, StickyNote, Library } from "lucide-react"

const PANEL_FEATURES = [
  { icon: BookOpen,    title: "Meerdere vertalingen",  desc: "Statenvertaling, HSV, KJV en meer" },
  { icon: BookMarked,  title: "Leesplannen",            desc: "Lees de Bijbel systematisch door" },
  { icon: StickyNote,  title: "Notities & markering",   desc: "Maak aantekeningen bij verzen" },
  { icon: Library,     title: "Studiemethoden",         desc: "Inductief, SOAP, SOLVAT en meer" },
]

function FeaturePanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16 relative overflow-hidden"
      style={{ backgroundColor: "#1F2937" }}>
      <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #0D9488, transparent)", transform: "translate(30%, -30%)" }} />
      <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #0D9488, transparent)", transform: "translate(-30%, 30%)" }} />

      <div className="relative z-10 space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#2DD4BF" }}>BijbelStudie Platform</p>
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight">
            Bestudeer de Bijbel<br />systematisch en diep
          </h2>
          <p className="mt-4 leading-relaxed text-sm" style={{ color: "#9CA3AF" }}>
            Interactieve bijbelstudie met commentaren, leesplannen en bewezen studiemethoden.
          </p>
        </div>

        <div className="rounded-xl p-5 border" style={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#0D9488" }}>
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Johannes 5:39</p>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>Statenvertaling</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed italic" style={{ color: "rgba(255,255,255,0.8)" }}>
            &ldquo;Onderzoekt de Schriften; want gij meent in dezelve het eeuwige leven te hebben; en die zijn het, die van Mij getuigen.&rdquo;
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {PANEL_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}>
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

export default function SignInPage() {
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    getProviders().then(setProviders)
  }, [])

  const handleOAuth = async (providerId: string) => {
    setIsLoading(true)
    setLoadingProvider(providerId)
    await signIn(providerId, { callbackUrl: "/dashboard" })
    setTimeout(() => { setIsLoading(false); setLoadingProvider(null) }, 5000)
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!formData.email || !formData.password) {
      setError("Vul je e-mail en wachtwoord in.")
      return
    }
    setEmailLoading(true)
    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })
      if (result?.error) {
        setError("Onjuist e-mailadres of wachtwoord.")
      } else if (result?.ok) {
        window.location.href = "/dashboard"
      }
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.")
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* Left: Form */}
      <div className="flex-1 lg:w-1/2 flex flex-col justify-center px-6 sm:px-10 md:px-16 xl:px-24 py-12 relative">
        {/* Back link */}
        <Link href="/" className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Terug
        </Link>

        <div className="max-w-sm mx-auto w-full space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image src="/images/favicon.ico" alt="BijbelStudie" width={28} height={28} className="rounded-md" priority />
            <span className="font-bold text-lg text-foreground">BijbelStudie</span>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Welkom terug
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              Nog geen account?{" "}
              <Link href="/auth/register" className="text-teal-600 dark:text-teal-400 hover:underline font-medium">
                Maak er gratis een aan
              </Link>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Email form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                E-mailadres
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={e => { setFormData(p => ({ ...p, email: e.target.value })); setError("") }}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors placeholder:text-gray-400"
                placeholder="jouw@email.nl"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Wachtwoord
                </label>
                <Link href="/auth/forgot-password" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
                  Vergeten?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={e => { setFormData(p => ({ ...p, password: e.target.value })); setError("") }}
                  className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors placeholder:text-gray-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {emailLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Inloggen...</>
              ) : "Inloggen"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs text-muted-foreground">of ga verder met</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* OAuth providers */}
          {providers ? (
            <div className="space-y-3">
              {Object.values(providers)
                .filter(p => p.id !== "credentials")
                .map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => handleOAuth(provider.id)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {isLoading && loadingProvider === provider.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Verbinden...</>
                    ) : (
                      <>
                        {provider.name === "Google" && GOOGLE_SVG}
                        Verdergaan met {provider.name}
                      </>
                    )}
                  </button>
                ))}
            </div>
          ) : (
            <div className="flex justify-center py-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Door in te loggen ga je akkoord met onze{" "}
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

