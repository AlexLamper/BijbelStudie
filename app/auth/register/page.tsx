"use client";

import { useState } from "react";
import { useTranslation } from "../../i18n/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { LanguageSwitcher } from "../../../components/language-switcher";
import Image from "next/image";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { ModeToggle } from "../../../components/dark-mode-toggle";

export default function RegisterPage() {
  const { t } = useTranslation("auth");
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(""); // Clear error when user types
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError(t("register.errors.allFieldsRequired"));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t("register.errors.invalidEmail"));
      return false;
    }

    if (formData.password.length < 8) {
      setError(t("register.errors.passwordTooShort"));
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("register.errors.passwordMismatch"));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful, redirect to sign in
        router.push(`/auth/signin?message=Registration successful! Please sign in.`);
      } else {
        setError(data.error || t("register.errors.registrationFailed"));
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError(t("register.errors.registrationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Top-left back button */}
      <div className="fixed top-4 left-4 z-30">
        <Link href={`/auth/signin`} className="flex items-center gap-2 text-gray-500 dark:text-muted-foreground hover:text-[#798777] dark:hover:text-foreground text-sm font-['Inter'] font-medium transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20" className="inline-block">
            <path d="M12.5 16L7.5 10L12.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t("register.backButton")}
        </Link>
      </div>

      {/* Top-right controls */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-3">
        <LanguageSwitcher />
        <ModeToggle />
      </div>

      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-background text-[#262626] dark:text-foreground px-4">
        <div className="w-full max-w-md mx-auto bg-white dark:bg-card shadow-xl border border-gray-200 dark:border-border p-8">
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
          <h1 className="font-['Merriweather'] text-4xl font-bold text-[#262626] dark:text-card-foreground mb-2 text-center">{t("register.title")}</h1>
          <p className="font-['Inter'] text-sm text-gray-600 dark:text-muted-foreground mb-6 text-center">{t("register.subtitle")}</p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 text-sm font-['Inter']">
              {error}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div className="text-left">
              <label htmlFor="name" className="block text-sm font-medium font-['Inter'] text-[#262626] dark:text-card-foreground mb-1">
                {t("register.name")}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-border bg-white dark:bg-background text-[#262626] dark:text-foreground font-['Inter'] focus:outline-none focus:border-[#798777] dark:focus:border-[#9aaa98] transition-colors"
                placeholder={t("register.name")}
              />
            </div>

            {/* Email Field */}
            <div className="text-left">
              <label htmlFor="email" className="block text-sm font-medium font-['Inter'] text-[#262626] dark:text-card-foreground mb-1">
                {t("register.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-border bg-white dark:bg-background text-[#262626] dark:text-foreground font-['Inter'] focus:outline-none focus:border-[#798777] dark:focus:border-[#9aaa98] transition-colors"
                placeholder={t("register.email")}
              />
            </div>

            {/* Password Field */}
            <div className="text-left">
              <label htmlFor="password" className="block text-sm font-medium font-['Inter'] text-[#262626] dark:text-card-foreground mb-1">
                {t("register.password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-border bg-white dark:bg-background text-[#262626] dark:text-foreground font-['Inter'] focus:outline-none focus:border-[#798777] dark:focus:border-[#9aaa98] transition-colors"
                  placeholder={t("register.password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#798777] dark:hover:text-[#9aaa98] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs font-['Inter'] text-gray-500 dark:text-muted-foreground mt-1">{t("register.passwordRequirements")}</p>
            </div>

            {/* Confirm Password Field */}
            <div className="text-left">
              <label htmlFor="confirmPassword" className="block text-sm font-medium font-['Inter'] text-[#262626] dark:text-card-foreground mb-1">
                {t("register.confirmPassword")}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-border bg-white dark:bg-background text-[#262626] dark:text-foreground font-['Inter'] focus:outline-none focus:border-[#798777] dark:focus:border-[#9aaa98] transition-colors"
                  placeholder={t("register.confirmPassword")}
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-brand hover:bg-brand/90 dark:bg-[#e0e0e0] dark:hover:bg-[#d0d0d0] disabled:bg-gray-400 text-white dark:text-black font-['Inter'] font-medium text-lg transition-colors rounded-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("register.creating")}
                </span>
              ) : (
                t("register.createAccount")
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="font-['Inter'] text-sm text-gray-600 dark:text-muted-foreground mt-6 text-center">
            {t("register.alreadyHaveAccount")}{" "}
            <Link href={`/auth/signin`} className="text-[#798777] hover:text-[#6a7a68] dark:text-[#e0e0e0] dark:hover:text-[#d0d0d0] font-medium">
              {t("register.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
