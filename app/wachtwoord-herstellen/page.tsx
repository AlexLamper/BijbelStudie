"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
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
  title: "Nieuw wachtwoord instellen",
  subtitle: "Voer hieronder je nieuwe wachtwoord in.",
  backButton: "Terug naar inloggen",
  newPassword: "Nieuw wachtwoord",
  confirmNewPassword: "Bevestig nieuw wachtwoord",
  resetPassword: "Wachtwoord resetten",
  resettingPassword: "Wachtwoord resetten...",
  rememberPassword: "Weet je je wachtwoord weer?",
  signIn: "Inloggen",
  passwordRequirements: "Wachtwoord moet minimaal 8 tekens lang zijn",
  resetSuccessful: "Wachtwoord succesvol gereset! Je wordt doorgestuurd naar inloggen...",
  errors: {
    allFieldsRequired: "Alle velden zijn verplicht",
    passwordTooShort: "Wachtwoord moet minimaal 8 tekens lang zijn",
    passwordMismatch: "Wachtwoorden komen niet overeen",
    invalidResetLink: "Ongeldige reset link. Vraag een nieuwe wachtwoord reset aan.",
    resetFailed: "Wachtwoord reset mislukt. Probeer opnieuw.",
  },
};

/** Literal colours only: this page is a landscape at night - see tokens.ts. */
const FIELD =
  "w-full rounded-lg border border-white/20 bg-black/30 px-3.5 py-2.5 pr-10 text-sm text-white outline-none transition-colors placeholder:text-white/40 hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white";
const LABEL = "mb-1.5 block text-sm font-medium text-white/85";
const QUIET_LINK =
  "rounded font-medium text-white no-underline underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-white";
const EYE_BUTTON =
  "absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white";

/** The night, the logo and the panel every state of this page sits in. */
function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: SCENE_BG }}>
      {/* The same night as /inloggen. It sits behind everything and nothing
          waits on it, and below `sm` it is not asked for at all - the panel
          covers it there, so a phone never pays for the canvas chunk. */}
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
          <div className={`p-7 ${PANEL_DEEP}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(COPY.errors.invalidResetLink);
    }
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.password || !formData.confirmPassword) {
      setError(COPY.errors.allFieldsRequired);
      return false;
    }

    if (formData.password.length < 8) {
      setError(COPY.errors.passwordTooShort);
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(COPY.errors.passwordMismatch);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError(COPY.errors.invalidResetLink);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          // `/inloggen`, not `/api/auth/signin`: NextAuth's own page is not used
          // here (`authOptions.pages.signIn`), and this is a Dutch-only UI.
          router.push("/inloggen");
        }, 2000);
      } else {
        setError(data.error || COPY.errors.resetFailed);
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setError(COPY.errors.resetFailed);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthFrame>
        <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>Account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{COPY.title}</h1>
        <div role="status" className="mt-5 rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-sm text-white">
          {COPY.resetSuccessful}
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>Account</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{COPY.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{COPY.subtitle}</p>

      {/* Error Message */}
      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Password Field */}
        <div>
          <label htmlFor="password" className={LABEL}>
            {COPY.newPassword}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleInputChange}
              className={FIELD}
              placeholder="Minimaal 8 tekens"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
              className={EYE_BUTTON}
            >
              {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-white/60">{COPY.passwordRequirements}</p>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className={LABEL}>
            {COPY.confirmNewPassword}
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={FIELD}
              placeholder="Herhaal wachtwoord"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
              className={EYE_BUTTON}
            >
              {showConfirmPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !token}
          className="press flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/30 outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {COPY.resettingPassword}
            </>
          ) : (
            COPY.resetPassword
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
    </AuthFrame>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen" style={{ backgroundColor: SCENE_BG }} role="status" aria-label="Laden" />
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
