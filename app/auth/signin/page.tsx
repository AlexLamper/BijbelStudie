"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "../../i18n/client"
import Link from "next/link"
import Image from "next/image"
import { Button } from "../../../components/ui/button"
import { LanguageSwitcher } from "../../../components/language-switcher"
import { ModeToggle } from "../../../components/dark-mode-toggle"
import { getProviders, signIn, ClientSafeProvider } from "next-auth/react"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function SignInPage() {
  const { t } = useTranslation("auth")
  
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  
  // Email/Password sign-in state
  const [emailFormData, setEmailFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [emailSignInLoading, setEmailSignInLoading] = useState(false)
  const [emailSignInError, setEmailSignInError] = useState("")

  // Carousel state for right side
  const slides = [
    {
      image: "/images/dashboard.png",
      heading: t("signin.features.introducingFeatures"),
      text: t("signin.features.analyzeTrends")
    },
    {
      image: "/images/signin/nature.jpg",
      heading: t("signin.features.trackProgress"),
      text: t("signin.features.trackProgressDesc")
    },
    {
      image: "/images/signin/sea.jpg",
      heading: t("signin.features.joinCommunity"),
      text: t("signin.features.joinCommunityDesc")
    }
  ]
  const [current, setCurrent] = useState(0)
  
  const goNext = () => setCurrent((prev) => (prev + 1) % slides.length)
  const goPrev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    fetchProviders()
  }, [])

  const handleSignIn = async (providerId: string) => {
    setIsLoading(true)
    setLoadingProvider(providerId)
    await signIn(providerId, { callbackUrl: `/study` })
    // Note: The page will redirect, but we set this in case there's a delay
    setTimeout(() => {
      setIsLoading(false)
      setLoadingProvider(null)
    }, 5000)
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailSignInError("")

    if (!emailFormData.email || !emailFormData.password) {
      setEmailSignInError(t("signin.errors.missingFields"))
      return
    }

    setEmailSignInLoading(true)

    try {
      const result = await signIn("credentials", {
        email: emailFormData.email,
        password: emailFormData.password,
        redirect: false,
      })

      if (result?.error) {
        setEmailSignInError(t("signin.errors.invalidCredentials"))
      } else if (result?.ok) {
        window.location.href = `/study`
      }
    } catch (error) {
      console.error("Sign in error:", error)
      setEmailSignInError(t("signin.errors.signInFailed"))
    } finally {
      setEmailSignInLoading(false)
    }
  }

  const handleEmailFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEmailFormData(prev => ({ ...prev, [name]: value }))
    setEmailSignInError("")
  }

  return (
    <div>
      {/* Top-left back button */}
      <div className="fixed top-4 left-4 z-30">
        <Link href={`/`} className="flex items-center gap-2 text-gray-500 dark:text-muted-foreground hover:text-[#798777] dark:hover:text-foreground text-sm font-['Inter'] font-medium transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20" className="inline-block">
            <path d="M12.5 16L7.5 10L12.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t("signin.backButton")}
        </Link>
      </div>
      
      {/* Top-right global controls */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-3 w-auto">
        <LanguageSwitcher />
        <ModeToggle />
      </div>

      <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-background text-[#262626] dark:text-foreground relative">
        {/* Left Side: Sign In Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 py-16 md:py-0 relative z-10 bg-white dark:bg-background">
          {/* Logo above form */}
          <div className="w-full max-w-md mx-auto mb-6">
            <div className="flex items-center">
              <Image
                src="/images/logo-text.svg"
                alt="BijbelStudie Logo"
                width={20}
                height={20}
                className="object-contain w-40 h-15 mr-3 dark:invert"
                priority
              />
            </div>
          </div>
          
          <div className="w-full max-w-md mx-auto bg-white dark:bg-card shadow-xl border border-gray-200 dark:border-border p-8">
            <h1 className="font-['Merriweather'] text-4xl font-bold text-[#262626] dark:text-card-foreground mb-2 text-left">{t("signin.title")}</h1>
            <p className="font-['Inter'] text-sm text-gray-600 dark:text-muted-foreground mb-6 text-left">
              {t("signin.alreadyHaveAccount")} <Link href={`/auth/register`} className="text-[#798777] hover:text-[#6a7a68] dark:text-[#e0e0e0] dark:hover:text-[#d0d0d0] font-medium">{t("signin.createNow")}</Link>
            </p>
            
            {/* Error Message */}
            {emailSignInError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 text-sm font-['Inter']">
                {emailSignInError}
              </div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-5">
              <div className="text-left">
                <label htmlFor="email" className="block text-sm font-medium font-['Inter'] text-[#262626] dark:text-card-foreground mb-1">{t("signin.email")}</label>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  placeholder={t("signin.email")}
                  value={emailFormData.email}
                  onChange={handleEmailFormChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-border bg-white dark:bg-background text-[#262626] dark:text-foreground font-['Inter'] focus:outline-none focus:border-[#798777] dark:focus:border-[#9aaa98] transition-colors" 
                />
              </div>
              
              <div className="text-left">
                <label htmlFor="password" className="block text-sm font-medium font-['Inter'] text-[#262626] dark:text-card-foreground mb-1">{t("signin.password")}</label>
                <div className="relative">
                  <input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    autoComplete="current-password" 
                    placeholder={t("signin.password")}
                    value={emailFormData.password}
                    onChange={handleEmailFormChange}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-border bg-white dark:bg-background text-[#262626] dark:text-foreground font-['Inter'] focus:outline-none focus:border-[#798777] dark:focus:border-[#9aaa98] transition-colors" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#798777] dark:hover:text-[#9aaa98] transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center text-sm font-['Inter'] text-gray-600 dark:text-muted-foreground">
                  <input type="checkbox" className="mr-2 border-gray-300 dark:border-border text-[#798777] focus:ring-[#798777]" />
                  {t("signin.saveAccount")}
                </label>
                <Link href={`/auth/forgot-password`} className="text-xs font-['Inter'] text-[#798777] hover:text-[#6a7a68] dark:text-[#e0e0e0] dark:hover:text-[#d0d0d0] font-medium">{t("signin.forgotPassword")}</Link>
              </div>
              
              <button 
                type="submit" 
                disabled={emailSignInLoading}
                className="w-full py-3 bg-brand hover:bg-brand/90 dark:bg-[#e0e0e0] dark:hover:bg-[#d0d0d0] disabled:bg-gray-400 text-white dark:text-black font-['Inter'] font-medium text-lg transition-colors"
              >
                {emailSignInLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t("signin.signingInEmail")}
                  </span>
                ) : (
                  t("signin.signInButton")
                )}
              </button>
              
              <div className="flex items-center my-4">
                <div className="flex-grow h-px bg-gray-300 dark:bg-border" />
                <span className="mx-4 text-gray-500 dark:text-muted-foreground text-sm font-['Inter']">{t("signin.or")}</span>
                <div className="flex-grow h-px bg-gray-300 dark:bg-border" />
              </div>

              {/* Dynamic Provider Buttons - Exclude credentials provider */}
              {providers ? (
                Object.values(providers)
                  .filter((provider) => provider.id !== "credentials")
                  .map((provider) => (
                  <Button
                    key={provider.id}
                    variant="outline"
                    onClick={() => handleSignIn(provider.id)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-border py-3 text-[#262626] dark:text-foreground bg-white dark:bg-background hover:bg-gray-50 dark:hover:bg-accent font-['Inter'] font-medium transition-colors rounded-none"
                  >
                    {isLoading && loadingProvider === provider.id ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t("signin.signingIn")}
                      </span>
                    ) : (
                      <>
                        {provider.name === "Google" && (
                          <span className="mr-2 flex items-center">
                            <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4"/>
                              <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7252 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853"/>
                              <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.03298C-0.371021 20.0112 -0.371021 28.0009 3.03298 34.7825L11.0051 28.6006Z" fill="#FBBC04"/>
                              <path d="M24.48 9.49932C27.9016 9.44641 31.2086 10.7339 33.6866 13.0973L40.5387 6.24523C36.2 2.17101 30.4414 -0.068932 24.48 0.00161733C15.4055 0.00161733 7.10718 5.11644 3.03296 13.2296L11.005 19.4115C12.901 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335"/>
                            </svg>
                          </span>
                        )}
                        {provider.name === "Facebook" && (
                          <span className="text-lg">📘</span>
                        )}
                        {t("signin.signInWith")} {provider.name}
                      </>
                    )}
                  </Button>
                ))
              ) : (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-muted-foreground" />
                </div>
              )}
            </form>
          </div>
        </div>
        
        {/* Right Side: Carousel (hidden on small screens, visible md+ ) */}
        <div className="hidden md:flex w-full md:w-1/2 min-h-[400px] items-center justify-center relative overflow-hidden dark:bg-card shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-none">
          <div className="absolute inset-0 bg-background dark:bg-card z-0" />
            <div className="relative z-10 flex flex-col items-center justify-center px-8 py-16 w-full">
              <div className="mb-8 w-full flex justify-center items-center gap-4">
                
                {/* Backward arrow */}
                <button
                  aria-label="Previous"
                  onClick={goPrev}
                  className="p-3 hover:opacity-70 transition-opacity"
                  style={{ lineHeight: 0 }}
                  type="button"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M15 19l-7-7 7-7"
                      className="stroke-[#798777] dark:stroke-[#e0e0e0]"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Image container */}
                <div className="relative w-[90%] max-w-[480px] aspect-video overflow-hidden shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15),0_8px_24px_-4px_rgba(0,0,0,0.1)] bg-gray-100 dark:bg-[#1a1d2a]">
                  <Image
                    src={slides[current].image}
                    alt={slides[current].heading}
                    fill
                    className="object-cover transition-all duration-300"
                    sizes="(max-width: 768px) 80vw, (max-width: 1200px) 50vw, 480px"
                    quality={95}
                    priority
                    style={{
                      filter: 'brightness(0.98) saturate(1.1)',
                    }}
                  />
                </div>

                {/* Forward arrow */}
                <button
                  aria-label="Next"
                  onClick={goNext}
                  className="p-3 hover:opacity-70 transition-opacity"
                  style={{ lineHeight: 0 }}
                  type="button"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 5l7 7-7 7"
                      className="stroke-[#798777] dark:stroke-[#e0e0e0]"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <h2 className="font-['Merriweather'] font-semibold text-2xl md:text-3xl text-[#262626] dark:text-foreground text-center tracking-normal mb-3">
                {slides[current].heading}
              </h2>
              <p className="font-['Inter'] font-normal text-sm md:text-base text-gray-600 dark:text-muted-foreground text-center max-w-2xl leading-relaxed mb-1">
                {slides[current].text}
              </p>
            </div>
          </div>
      </div>
    </div>
  )
}
