"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { getProviders, signIn, ClientSafeProvider } from "next-auth/react"
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { safeRedirect } from "../../lib/safeRedirect"
import AuthTreeBackdrop from "../../components/auth/AuthTreeBackdrop"
import { EYEBROW, SCENE_BG, SKEL, TEAL_ON_DARK } from "../../components/scene/tokens"
import { BrandMark } from "./BrandMark"
import ContinueAsGuest from "../../components/auth/ContinueAsGuest"

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M47.532 24.553C47.532 22.921 47.4 21.281 47.117 19.676H24.48V28.918H37.443C36.906 31.899 35.177 34.536 32.646 36.211V42.208H40.38C44.922 38.028 47.532 31.855 47.532 24.553Z" fill="#4285F4"/>
    <path d="M24.48 48.002C30.953 48.002 36.412 45.876 40.389 42.208L32.655 36.211C30.503 37.675 27.725 38.504 24.489 38.504C18.228 38.504 12.919 34.28 11.014 28.601H3.033V34.782C7.107 42.887 15.406 48.002 24.48 48.002Z" fill="#34A853"/>
    <path d="M11.005 28.601C9.999 25.62 9.999 22.392 11.005 19.412V13.23H3.033C-0.371 20.011 -0.371 28.001 3.033 34.782L11.005 28.601Z" fill="#FBBC04"/>
    <path d="M24.48 9.499C27.902 9.446 31.209 10.734 33.687 13.097L40.539 6.245C36.2 2.171 30.441-0.069 24.48 0.002C15.406 0.002 7.107 5.116 3.033 13.23L11.005 19.412C12.901 13.723 18.219 9.499 24.48 9.499Z" fill="#EA4335"/>
  </svg>
)

/**
 * Every colour on this page is a literal.
 *
 * The page is a landscape at night, and the reader's light/dark setting must
 * not repaint it - the same rule the immersive shell states in
 * components/scene/tokens.ts. Nothing here is a theme token.
 */
const FIELD =
  "w-full rounded-lg border border-white/20 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/40 hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white"
const LABEL = "mb-1.5 block text-sm font-medium text-white/85"
const QUIET_LINK =
  "rounded font-medium text-white no-underline underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-white"

const PANEL_BENEFITS = [
  { title: "Persoonlijke notities", desc: "Bewaar inzichten bij elk vers." },
  { title: "Begeleide studies", desc: "Volg een duidelijke bijbelleesroute." },
  { title: "AI-assistent", desc: "Krijg directe uitleg bij jouw vragen." },
]

/**
 * The right half: the tree at night, and what waits behind the form.
 *
 * `hidden lg:flex`, so on a phone the form is the entire page and the canvas is
 * never even asked for.
 */
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
          <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>BijbelStudie</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Log in en ga direct verder met je studie.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Behoud je notities, volg je leesplan en vraag de AI-assistent om uitleg bij elke passage.
          </p>
        </div>

        <figure className="rounded-2xl border border-white/20 bg-black/40 p-5 backdrop-blur-md">
          <blockquote className="text-sm italic leading-relaxed text-white/85">
            &ldquo;Onderzoekt de Schriften; want gij meent in dezelve het eeuwige leven te hebben.&rdquo;
          </blockquote>
          <figcaption className="mt-3 text-xs text-white/60">
            Johannes 5:39 <span aria-hidden>·</span> Statenvertaling
          </figcaption>
        </figure>

        <dl className="space-y-3 border-t border-white/15 pt-5">
          {PANEL_BENEFITS.map(({ title, desc }) => (
            <div key={title}>
              <dt className="text-sm font-semibold text-white">{title}</dt>
              <dd className="mt-0.5 text-xs text-white/65">{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

function SignInPageInner() {
  const searchParams = useSearchParams()
  // Validated to a same-site path: an unchecked value here would be an
  // open redirect on the page where the user types their password.
  const nextTarget = safeRedirect(searchParams.get("next"))
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
    await signIn(providerId, { callbackUrl: nextTarget })
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
        window.location.href = nextTarget
      }
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.")
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: SCENE_BG }}>
      {/* Left: the form.
          Nothing is drawn in front of it and nothing it shows waits on anything
          else - no canvas, no fetch, no gate. /inloggen measured an LCP of 9.33s
          in production; the heading, the fields and the primary button are plain
          markup so they arrive with the document. */}
      <div className="relative flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 md:px-16 lg:w-1/2 xl:px-24">
        <Link
          href="/"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded text-sm text-white/70 no-underline outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Terug
        </Link>

        <div className="mx-auto w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-lg font-bold text-white">
              Bijbel<span style={{ color: "#0F766E" }}>Studie</span>
            </span>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Welkom terug
            </h1>
            <p className="mt-1.5 text-sm text-white/70">
              Nog geen account?{" "}
              <Link href="/registreren" className={QUIET_LINK}>
                Maak er gratis een aan
              </Link>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Email form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className={LABEL}>
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
                className={FIELD}
                placeholder="jouw@email.nl"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-white/85">
                  Wachtwoord
                </label>
                <Link href="/wachtwoord-vergeten" className={`text-xs ${QUIET_LINK}`}>
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
                  className={`${FIELD} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                >
                  {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="press flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/30 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {emailLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Inloggen...</>
              ) : "Inloggen"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-xs text-white/55">of ga verder met</span>
            <div className="h-px flex-1 bg-white/15" />
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
                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/25 bg-black/30 px-4 py-2.5 text-sm font-medium text-white outline-none transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading && loadingProvider === provider.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Verbinden...</>
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
            <div className="space-y-3" role="status" aria-label="Inlogopties laden">
              <div className={`skeleton-pulse h-[42px] w-full rounded-lg ${SKEL}`} />
            </div>
          )}

          {/* Guest mode: the app works without an account, so the auth page
              must not be a wall. The raw `next` goes in; guestTarget decides
              whether a guest can use that page or should land on the studies. */}
          <ContinueAsGuest next={searchParams.get("next")} />

          <p className="text-center text-xs text-white/60">
            Door in te loggen ga je akkoord met onze{" "}
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


export default function SignInPage() {
  // useSearchParams requires a Suspense boundary in the app router.
  return (
    <Suspense fallback={null}>
      <SignInPageInner />
    </Suspense>
  )
}
