"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslation } from "../../app/i18n/client"

export function Footer() {
  const { t } = useTranslation("footer")

  return (
    <footer style={{ backgroundColor: "#1F2937", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-14 lg:py-16">

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12">

          {/* Brand column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/images/favicon.ico" alt="BijbelStudie" width={22} height={22} className="rounded-md" />
              <span className="font-bold text-sm text-white">BijbelStudie</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
              Online bijbelstudie platform voor serieuze bijbelstudenten. Gratis beginnen, altijd.
            </p>
          </div>

          {/* About */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              {t("about_bijbelstudie")}
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/#about",    label: t("about_us") },
                { href: "/#features", label: t("features") },
                { href: "/#pricing",  label: t("pricing") },
                { href: "/#faq",      label: t("faq") },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: "#9CA3AF" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              {t("support")}
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/auth/signin",   label: t("signin") },
                { href: "/auth/register", label: t("signup") },
                { href: "/help",          label: t("help") },
                { href: "/contact",       label: t("contact") },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: "#9CA3AF" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              {t("legal")}
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/privacy-policy",   label: t("privacy_policy") },
                { href: "/terms-of-service", label: t("terms_of_service") },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: "#9CA3AF" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            &copy; {new Date().getFullYear()} BijbelStudie. Alle rechten voorbehouden.
          </p>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            Gemaakt door <span style={{ color: "#2DD4BF" }}>Alex Lamper</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
