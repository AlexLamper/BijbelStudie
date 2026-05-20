"use client"

import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  message?: string
  size?: "sm" | "md" | "lg"
  fullHeight?: boolean
}

export function LoadingSpinner({ 
  message, 
  size = "md",
  fullHeight = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  }

  const containerClass = fullHeight ? "min-h-screen" : "py-12"

  return (
    <div className={`flex items-center justify-center ${containerClass}`}>
      <div className="text-center">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-[#0D9488] mx-auto mb-4`} />
        {message && (
          <p className="font-inter text-gray-700 text-base font-medium dark:text-gray-200">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
