"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { useToast } from "../../hooks/use-toast"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useTranslation } from "../../app/i18n/client"
import { AnimatePresence, motion } from "framer-motion"

interface ProfileFormProps {
  initialName: string
  initialEmail: string
  initialBio: string
}

export function ProfileForm({ initialName, initialEmail, initialBio }: ProfileFormProps) {
  const { t } = useTranslation("profile")
  const [name, setName] = useState(initialName || "")
  const [bio, setBio] = useState(initialBio || "")
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)

  // Add this effect to prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset save status after a delay
  useEffect(() => {
    if (saveStatus !== "idle") {
      const timer = setTimeout(() => {
        setSaveStatus("idle")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSaveStatus("idle")

    try {
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, bio }),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      // Show success state
      setSaveStatus("success")
      
      // Show toast notification
      toast({
        title: t("profile_updated"),
        description: t("profile_updated_success"),
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      
      // Show error state
      setSaveStatus("error")
      
      // Show toast notification
      toast({
        title: t("error"),
        description: t("failed_update_profile_try_again"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {saveStatus === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h3 className=" font-semibold text-green-800 dark:text-green-400">
                    {t("profile_updated")}
                  </h3>
                  <p className=" text-sm text-green-700 dark:text-green-500 mt-1">
                    {t("profile_updated_success")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {saveStatus === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h3 className=" font-semibold text-red-800 dark:text-red-400">
                    {t("error")}
                  </h3>
                  <p className=" text-sm text-red-700 dark:text-red-500 mt-1">
                    {t("failed_update_profile_try_again")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className=" text-gray-900 dark:text-gray-300">{t("display_name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className=" bg-gray-50 dark:bg-background border-border text-foreground mt-2"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email" className=" text-gray-900 dark:text-gray-300">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            value={initialEmail}
            disabled
            className=" bg-gray-50 dark:bg-background border-border text-foreground mt-2 opacity-70"
          />
          <p className=" text-sm text-muted-foreground mt-1">{t("email_cannot_change")}</p>
        </div>
        <div>
          <Label htmlFor="bio" className=" text-gray-900 dark:text-gray-300">{t("bio")}</Label>
          <textarea
            id="bio"
            className=" w-full min-h-[100px] p-2 border bg-gray-50 dark:bg-background border-border text-foreground mt-2"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          ></textarea>
        </div>
        <div className="flex items-center space-x-2">
          <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("saving")}
              </>
            ) : (
              <>
                {saveStatus === "success" ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> {t("saved")}
                  </>
                ) : (
                  t("save_changes")
                )}
              </>
            )}
          </Button>
          
          {saveStatus === "success" && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className=" text-sm text-green-600 dark:text-green-400 flex items-center"
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {t("changes_saved")}
            </motion.span>
          )}
        </div>
      </form>
    </div>
  )
}

