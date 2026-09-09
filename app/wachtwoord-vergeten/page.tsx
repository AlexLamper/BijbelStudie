"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft } from "lucide-react";
import AuthTreeBackdrop from "../../components/auth/AuthTreeBackdrop";
import { EYEBROW, PANEL_DEEP, SCENE_BG, TEAL_ON_DARK } from "../../components/scene/tokens";

/**
 * Dutch only.
 *
 * This page carried an en/nl/de table keyed on `params.lng`, but the route has
 * no `[lng]` segment - `useParams()` returns nothing for it - so `language`
 * resolved to "en" every single time and a Dutch-only site served an English
 * password screen. The strings are inline now, in the one language the app
 * ships (CLAUDE.md: "UI is Dutch-only").
 */
const COPY = {
  title: "Wachtwoord resetten",
  subtitle: "Voer je e-mailadres in en we sturen je een link om je wachtwoord te resetten.",
  backButton: "Terug naar inloggen",
  email: "E-mailadres",
  sendResetLink: "Reset link versturen",
  sending: "Versturen...",
  rememberPassword: "Weet je je wachtwoord weer?",
  signIn: "Inloggen",
  errors: {
    emailRequired: "Voer je e-mailadres in",
    invalidEmail: "Voer een geldig e-mailadres in",
    somethingWrong: "Er ging iets mis. Probeer opnieuw.",
  },
};

/** Literal colours only: this page is a landscape at night - see tokens.ts. */
const FIELD =
  "w-full rounded-lg border border-white/20 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/40 hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white";
const QUIET_LINK =
  "rounded font-medium text-white no-underline underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-white";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError(COPY.errors.emailRequired);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(COPY.errors.invalidEmail);
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.error || COPY.errors.somethingWrong);
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setError(COPY.errors.somethingWrong);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: SCENE_BG }}>
      {/* The same night as /inloggen, full bleed here because there is only one
          column of copy. It sits behind everything and nothing waits on it, and
          below `sm` it is not asked for at all - the panel covers it there, so
          a phone never pays for the canvas chunk. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        <AuthTreeBackdrop />
      </div>

      <div className="relative z-10 min-h-screen px-5 py-16 sm:px-8">
        <Link
          href="/api/auth/signin"
          className="inline-flex items-center gap-1.5 rounded text-sm text-white/70 no-underline outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {COPY.backButton}
        </Link>

        <div className="mx-auto mt-14 w-full max-w-md sm:mt-20">
          <div className="mb-6 flex items-center gap-2.5">
            <Image src="/images/icon-192.png" alt="BijbelStudie" width={28} height={28} className="rounded-md" priority />
            <span className="text-lg font-bold text-white">BijbelStudie</span>
          </div>

          <div className={`p-7 ${PANEL_DEEP}`}>
            <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>Account</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{COPY.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{COPY.subtitle}</p>

            {/* Success Message */}
            {message && (
              <div role="status" className="mt-5 rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-sm text-white">
                {message}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div role="alert" className="mt-5 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/85">
                  {COPY.email}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={FIELD}
                  placeholder="jouw@email.nl"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="press flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/30 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {COPY.sending}
                  </>
                ) : (
                  COPY.sendResetLink
                )}
              </button>
            </form>

            {/* Back to Sign In */}
            <p className="mt-6 text-center text-sm text-white/70">
              {COPY.rememberPassword}{" "}
              <Link href="/api/auth/signin" className={QUIET_LINK}>
                {COPY.signIn}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
