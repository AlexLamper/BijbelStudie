"use client"

import { Button } from "../components/ui/button"
import { ArrowLeft, Home } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslation } from "./i18n/client"
import "./globals.css"

export default function NotFound() {
  const router = useRouter()
  
  const { t } = useTranslation("common")

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="text-6xl font-light text-gray-400 dark:text-gray-500">404</div>
          <h1 className="text-2xl font-medium text-foreground">
            {t("page_not_found") || "Page Not Found"}
          </h1>
          <p className="text-muted-foreground">
            {t("page_not_found_message") || "The page you're looking for doesn't exist."}
          </p>
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {t("page_not_found_description") || "Sorry, we couldn't find the page you were looking for."}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t("continue_your_study") || "Continue your study"}
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Button 
            onClick={handleGoBack} 
            variant="outline" 
            className="flex items-center gap-2 bg-transparent hover:bg-gray-100 dark:bg-transparent dark:hover:bg-gray-800 dark:text-white dark:border-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("go_back") || "Go Back"}
          </Button>

          <Button 
            onClick={handleGoHome} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
          >
            <Home className="h-4 w-4" />
            {t("home") || "Home"}
          </Button>
        </div>
      </div>
    </div>
  )
}
