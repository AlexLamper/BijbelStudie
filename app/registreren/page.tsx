"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { safeRedirect } from "../../lib/safeRedirect"
import AuthTreeBackdrop from "../../components/auth/AuthTreeBackdrop"
import { EYEBROW, SCENE_BG, TEAL_ON_DARK } from "../../components/scene/tokens"
// The identical mark + halo treatment as /inloggen, imported rather than
// duplicated so the two pages can never drift apart.
import { BrandMark } from "../inloggen/BrandMark"

/**
 * Every colour on this page is a literal - see app/inloggen/page.tsx. The page
 * is a landscape at night and the reader's light/dark setting must not repaint
 * it.
 */
const FIELD =
  "w-full rounded-lg border border-white/20 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/40 hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white"
const LABEL = "mb-1.5 block text-sm font-medium text-white/85"
const QUIET_LINK =
  "rounded font-medium text-white no-underline underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-white"

const BENEFITS = [
  "Persoonlijke notities bij elk vers",
  "Begeleide studies en leesplannen",
  "Directe uitleg via de AI-assistent",
]

function FeaturePanel() {
  return (
    <div
      className="relative hidden overflow-hidden px-12 lg:flex lg:w-1/2 lg:flex-col lg:justify-center xl:px-16"
      style={{ backgroundColor: SCENE_BG }}
    >
      {/* The reader's future: a grown boom at night behind the copy. */}
      <AuthTreeBackdrop />

      <div className="relative z-10 max-w-md space-y-7 text-white">
        <div>
          <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>Gratis beginnen</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Maak een account en ga vandaag nog aan de slag.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Behoud je notities, volg je leesplan en krijg direct antwoord op je Bijbelvragen.
          </p>
        </div>

        <ul className="space-y-3 border-t border-white/15 pt-5">
          {BENEFITS.map((b) => (
            <li key={b} className="text-sm text-white/85">{b}</li>
          ))}
        </ul>

        <p className="rounded-2xl border border-white/20 bg-black/40 p-5 text-sm leading-relaxed text-white/85 backdrop-blur-md">
          Je persoonlijke studieruimte, gratis. Je boom groeit mee met wat je leest.
        </p>
      </div>
    </div>
  )
}

function RegisterPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Validated: an unchecked `next` here would be an open redirect on the page
  // where the user has just typed a password.
  const nextTarget = safeRedirect(searchParams.get("next"))
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
        // Sign in straight away and continue to `next`, so a visitor who came
        // here to buy lands back on checkout instead of being bounced through
        // the login form and losing the thread.
        const signInResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (signInResult?.ok) {
          window.location.href = nextTarget
        } else {
          router.push(`/inloggen?registered=true&next=${encodeURIComponent(nextTarget)}`)
        }
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
    <div className="flex min-h-screen" style={{ backgroundColor: SCENE_BG }}>
      {/* Left: the form. Nothing is drawn in front of it and nothing it shows
          waits on anything else - the same discipline as /inloggen. */}
      <div className="relative flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 md:px-16 xl:px-24">
        <Link
          href="/"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded text-sm text-white/70 no-underline outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Terug
        </Link>

        <div className="mx-auto w-full max-w-sm space-y-7">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-lg font-bold text-white">BijbelStudie</span>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Account aanmaken
            </h1>
            <p className="mt-1.5 text-sm text-white/70">
              Al een account?{" "}
              <Link href="/inloggen" className={QUIET_LINK}>
                Log hier in
              </Link>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className={LABEL}>Naam</label>
              <input
                id="name" name="name" type="text" required autoComplete="name"
                value={formData.name} onChange={handleChange}
                className={FIELD}
                placeholder="Jouw naam"
              />
            </div>

            <div>
              <label htmlFor="email" className={LABEL}>E-mailadres</label>
              <input
                id="email" name="email" type="email" required autoComplete="email"
                value={formData.email} onChange={handleChange}
                className={FIELD}
                placeholder="jouw@email.nl"
              />
            </div>

            <div>
              <label htmlFor="password" className={LABEL}>Wachtwoord</label>
              <div className="relative">
                <input
                  id="password" name="password" type={showPassword ? "text" : "password"} required autoComplete="new-password"
                  value={formData.password} onChange={handleChange}
                  className={`${FIELD} pr-10`}
                  placeholder="Minimaal 8 tekens"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white">
                  {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className={LABEL}>Bevestig wachtwoord</label>
              <div className="relative">
                <input
                  id="confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} required autoComplete="new-password"
                  value={formData.confirmPassword} onChange={handleChange}
                  className={`${FIELD} pr-10`}
                  placeholder="Herhaal wachtwoord"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white">
                  {showConfirm ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="press mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/30 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Account aanmaken...</>
              ) : "Account aanmaken"}
            </button>
          </form>

          <p className="text-center text-xs text-white/60">
            Door te registreren ga je akkoord met onze{" "}
            <Link href="/algemene-voorwaarden" className={QUIET_LINK}>servicevoorwaarden</Link>
            {" "}en{" "}
            <Link href="/privacybeleid" className={QUIET_LINK}>privacybeleid</Link>.
          </p>
        </div>
      </div>

      {/* Right: Feature panel */}
      <FeaturePanel />
    </div>
  )
}

export default function RegisterPage() {
  // useSearchParams requires a Suspense boundary in the app router.
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  )
}
