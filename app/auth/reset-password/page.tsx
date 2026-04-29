"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Button } from "../../../components/ui/button";
import Image from "next/image";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { ModeToggle } from "../../../components/dark-mode-toggle";

const translations = {
  en: {
    title: "Set New Password",
    subtitle: "Enter your new password below.",
    backButton: "Back to Sign In",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    resetPassword: "Reset Password",
    resettingPassword: "Resetting Password...",
    rememberPassword: "Remember your password?",
    signIn: "Sign in",
    passwordRequirements: "Password must be at least 8 characters long",
    resetSuccessful: "Password reset successful! Redirecting to sign in...",
    invalidResetLink: "Invalid reset link. Please request a new password reset.",
    errors: {
      allFieldsRequired: "All fields are required",
      passwordTooShort: "Password must be at least 8 characters long",
      passwordMismatch: "Passwords do not match",
      invalidResetLink: "Invalid reset link",
      resetFailed: "Password reset failed. Please try again.",
    }
  },
  nl: {
    title: "Nieuw Wachtwoord Instellen",
    subtitle: "Voer hieronder je nieuwe wachtwoord in.",
    backButton: "Terug naar Inloggen",
    newPassword: "Nieuw Wachtwoord",
    confirmNewPassword: "Bevestig Nieuw Wachtwoord",
    resetPassword: "Wachtwoord Resetten",
    resettingPassword: "Wachtwoord Resetten...",
    rememberPassword: "Weet je je wachtwoord weer?",
    signIn: "Inloggen",
    passwordRequirements: "Wachtwoord moet minimaal 8 tekens lang zijn",
    resetSuccessful: "Wachtwoord succesvol gereset! Doorverwijzen naar inloggen...",
    invalidResetLink: "Ongeldige reset link. Vraag een nieuwe wachtwoord reset aan.",
    errors: {
      allFieldsRequired: "Alle velden zijn verplicht",
      passwordTooShort: "Wachtwoord moet minimaal 8 tekens lang zijn",
      passwordMismatch: "Wachtwoorden komen niet overeen",
      invalidResetLink: "Ongeldige reset link",
      resetFailed: "Wachtwoord reset mislukt. Probeer opnieuw.",
    }
  },
  de: {
    title: "Neues Passwort Festlegen",
    subtitle: "Gib dein neues Passwort unten ein.",
    backButton: "Zurück zur Anmeldung",
    newPassword: "Neues Passwort",
    confirmNewPassword: "Neues Passwort Bestätigen",
    resetPassword: "Passwort Zurücksetzen",
    resettingPassword: "Passwort Zurücksetzen...",
    rememberPassword: "Erinnerst du dich an dein Passwort?",
    signIn: "Anmelden",
    passwordRequirements: "Passwort muss mindestens 8 Zeichen lang sein",
    resetSuccessful: "Passwort erfolgreich zurückgesetzt! Weiterleitung zur Anmeldung...",
    invalidResetLink: "Ungültiger Reset-Link. Bitte fordere einen neuen Passwort-Reset an.",
    errors: {
      allFieldsRequired: "Alle Felder sind erforderlich",
      passwordTooShort: "Passwort muss mindestens 8 Zeichen lang sein",
      passwordMismatch: "Passwörter stimmen nicht überein",
      invalidResetLink: "Ungültiger Reset-Link",
      resetFailed: "Passwort-Reset fehlgeschlagen. Bitte versuche es erneut.",
    }
  }
};

function ResetPasswordForm() {
  const params = useParams();
  const lng = params.lng as string;
  const language = (lng === "nl" ? "nl" : lng === "de" ? "de" : "en") as "en" | "nl" | "de";
  const t = translations[language];
  
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
      setError(t.errors.invalidResetLink);
    }
  }, [token, t.errors.invalidResetLink]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.password || !formData.confirmPassword) {
      setError(t.errors.allFieldsRequired);
      return false;
    }

    if (formData.password.length < 8) {
      setError(t.errors.passwordTooShort);
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t.errors.passwordMismatch);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError(t.errors.invalidResetLink);
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
          router.push("/api/auth/signin?message=Password reset successful! Please sign in with your new password.");
        }, 2000);
      } else {
        setError(data.error || t.errors.resetFailed);
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setError(t.errors.resetFailed);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7ff] dark:bg-gradient-to-b dark:from-[#0d0f17] dark:to-[#181b23] text-gray-900 dark:text-white px-4">
        <div className="w-full max-w-md mx-auto bg-white dark:bg-[#23263a] rounded-2xl shadow-xl border border-gray-200 dark:border-[#23263a] p-8 text-center">
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg">
            {t.resetSuccessful}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top-left back button */}
      <div className="fixed top-4 left-4 z-30">
        <Link href="/api/auth/signin" className="flex items-center gap-2 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20" className="inline-block">
            <path d="M12.5 16L7.5 10L12.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t.backButton}
        </Link>
      </div>

      {/* Top-right theme toggle */}
      <div className="fixed top-4 right-4 z-30">
        <ModeToggle />
      </div>

      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-background text-[#262626] dark:text-foreground px-4">
        <div className="w-full max-w-md mx-auto bg-white dark:bg-card rounded-none shadow-xl border border-gray-200 dark:border-border p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <Image
              src="/images/logo-text.svg"
              alt="BijbelStudie Logo"
              width={30}
              height={30}
              className="object-contain w-40 h-15 mr-3 dark:invert"
              priority
            />
          </div>

          {/* Header */}
          <h1 className="font-['Merriweather'] text-3xl font-bold text-[#262626] dark:text-card-foreground mb-2 text-center">{t.title}</h1>
          <p className="font-['Inter'] text-sm text-gray-600 dark:text-muted-foreground mb-6 text-center">
            {t.subtitle}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 text-sm font-['Inter']">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Field */}
            <div className="text-left">
              <label htmlFor="password" className="block text-sm font-medium font-['Inter'] text-[#262626] dark:text-card-foreground mb-1">
                {t.newPassword}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-border bg-white dark:bg-background text-[#262626] dark:text-foreground font-['Inter'] focus:outline-none focus:border-[#798777] dark:focus:border-[#9aaa98] transition-colors"
                  placeholder={t.newPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#798777] dark:hover:text-[#9aaa98] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs font-['Inter'] text-gray-500 dark:text-muted-foreground mt-1">{t.passwordRequirements}</p>
            </div>

            {/* Confirm Password Field */}
            <div className="text-left">
              <label htmlFor="confirmPassword" className="block text-sm font-medium font-['Inter'] text-[#262626] dark:text-card-foreground mb-1">
                {t.confirmNewPassword}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-border bg-white dark:bg-background text-[#262626] dark:text-foreground font-['Inter'] focus:outline-none focus:border-[#798777] dark:focus:border-[#9aaa98] transition-colors"
                  placeholder={t.confirmNewPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#798777] dark:hover:text-[#9aaa98] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !token}
              className="w-full py-3 bg-brand hover:bg-brand/90 dark:bg-[#e0e0e0] dark:hover:bg-[#d0d0d0] disabled:bg-gray-400 text-white dark:text-black font-['Inter'] font-medium text-lg transition-colors rounded-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t.resettingPassword}
                </span>
              ) : (
                t.resetPassword
              )}
            </Button>
          </form>

          {/* Back to Sign In */}
          <p className="font-['Inter'] text-sm text-gray-600 dark:text-muted-foreground mt-6 text-center">
            {t.rememberPassword}{" "}
            <Link href="/api/auth/signin" className="text-[#798777] hover:text-[#6a7a68] font-medium">
              {t.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
