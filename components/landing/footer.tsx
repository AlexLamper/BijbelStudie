"use client"

import Link from "next/link"
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react'
import { useTranslation } from "../../app/i18n/client"

export function Footer() {
  const { t } = useTranslation("footer")

  return (
    <footer className="bg-[#262626] dark:bg-card py-16 lg:py-20">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* About BijbelStudie */}
          <div className="space-y-4">
            <h3 className="font-['Inter'] text-lg font-semibold text-white dark:text-card-foreground mb-6">
              {t("about_bijbelstudie")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`/#about`}
                  className="font-['Inter'] text-gray-300 dark:text-muted-foreground hover:text-white dark:hover:text-card-foreground transition-colors duration-200"
                >
                  {t("about_us")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/#features`}
                  className="font-['Inter'] text-gray-300 dark:text-muted-foreground hover:text-white dark:hover:text-card-foreground transition-colors duration-200"
                >
                  {t("features")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/#pricing`}
                  className="font-['Inter'] text-gray-300 dark:text-muted-foreground hover:text-white dark:hover:text-card-foreground transition-colors duration-200"
                >
                  {t("pricing")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/#faq`}
                  className="font-['Inter'] text-gray-300 dark:text-muted-foreground hover:text-white dark:hover:text-card-foreground transition-colors duration-200"
                >
                  {t("faq")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-['Inter'] text-lg font-semibold text-white dark:text-card-foreground mb-6">
              {t("support")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`/auth/signin`}
                  className="font-['Inter'] text-gray-300 dark:text-muted-foreground hover:text-white dark:hover:text-card-foreground transition-colors duration-200"
                >
                  {t("signin")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/auth/register`}
                  className="font-['Inter'] text-gray-300 dark:text-muted-foreground hover:text-white dark:hover:text-card-foreground transition-colors duration-200"
                >
                  {t("signup")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/help`}
                  className="font-['Inter'] text-gray-300 dark:text-muted-foreground hover:text-white dark:hover:text-card-foreground transition-colors duration-200"
                >
                  {t("help")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/contact`}
                  className="font-['Inter'] text-gray-300 dark:text-muted-foreground hover:text-white dark:hover:text-card-foreground transition-colors duration-200"
                >
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-['Inter'] text-lg font-semibold text-white dark:text-card-foreground mb-6">
              {t("legal")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`/privacy-policy`}
                  className="font-['Inter'] text-gray-300 dark:text-muted-foreground hover:text-white dark:hover:text-card-foreground transition-colors duration-200"
                >
                  {t("privacy_policy")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/terms-of-service`}
                  className="font-['Inter'] text-gray-300 dark:text-muted-foreground hover:text-white dark:hover:text-card-foreground transition-colors duration-200"
                >
                  {t("terms_of_service")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect/Social */}
          <div className="space-y-4">
            <h3 className="font-['Inter'] text-lg font-semibold text-white dark:text-card-foreground mb-6">
              {t("connect")}
            </h3>
            <div className="flex space-x-4">
              <Link 
                href="#" 
                className="w-10 h-10 bg-brand dark:bg-secondary hover:bg-brand/90 dark:hover:bg-secondary/80 text-white dark:text-foreground hover:text-white rounded-full flex items-center justify-center transition-all duration-200"
              >
                <Facebook className="w-5 h-5" />
              </Link>
              <Link 
                href="#" 
                className="w-10 h-10 bg-brand dark:bg-secondary hover:bg-brand/90 dark:hover:bg-secondary/80 text-white dark:text-foreground hover:text-white rounded-full flex items-center justify-center transition-all duration-200"
              >
                <Twitter className="w-5 h-5" />
              </Link>
              <Link 
                href="#" 
                className="w-10 h-10 bg-brand dark:bg-secondary hover:bg-brand/90 dark:hover:bg-secondary/80 text-white dark:text-foreground hover:text-white rounded-full flex items-center justify-center transition-all duration-200"
              >
                <Instagram className="w-5 h-5" />
              </Link>
              <Link 
                href="#" 
                className="w-10 h-10 bg-brand dark:bg-secondary hover:bg-brand/90 dark:hover:bg-secondary/80 text-white dark:text-foreground hover:text-white rounded-full flex items-center justify-center transition-all duration-200"
              >
                <Youtube className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Section */}
        <div className="mt-12 pt-8 border-t border-gray-600 flex flex-col gap-3 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <p className="font-['Inter'] text-gray-400">
            &copy; {new Date().getFullYear()} BijbelStudie. All rights reserved.
          </p>
          <p className="font-['Inter'] text-gray-400 md:ml-auto md:text-right">
            Gemaakt door <span className="text-gray-300">Alex Lamper</span>
          </p>
        </div>
      </div>
    </footer>
  )
}