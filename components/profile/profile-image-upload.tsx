"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { useToast } from "../../hooks/use-toast"
import { Camera, Loader2 } from "lucide-react"
import { useTranslation } from "../../app/i18n/client"

interface ProfileImageUploadProps {
  initialImage?: string
  userName: string
}

export function ProfileImageUpload({ initialImage, userName }: ProfileImageUploadProps) {
  const { t } = useTranslation("profile")
  const [image, setImage] = useState(initialImage)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Max file size 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("file_too_large"),
        description: t("select_image_under_5mb"),
        variant: "destructive",
      })
      return
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: t("invalid_file_type"),
        description: t("select_image_file"),
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const reader = new FileReader()
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string

        // Update the image URL in the database
        const response = await fetch("/api/user/upload-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl }),
        })

        if (!response.ok) {
          throw new Error("Failed to update profile image")
        }

        setImage(imageUrl)
        toast({
          title: t("profile_image_updated"),
          description: t("profile_image_updated_success"),
        })
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: t("error"),
        description: t("failed_update_profile_image_try_again"),
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <Avatar
          className="w-32 h-32 mb-4 cursor-pointer group-hover:opacity-80 transition-opacity"
          onClick={handleImageClick}
        >
          <AvatarImage src={image || "/placeholder.svg"} />
          <AvatarFallback className="text-lg">{userName?.charAt(0)?.toUpperCase()}</AvatarFallback>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-8 h-8 text-white" />
          </div>
        </Avatar>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
      </div>
      <Button onClick={handleImageClick} disabled={isUploading} className="bg-transparent border border-gray-300 dark:border-gray-600 text-foreground hover:bg-accent font-inter rounded-lg">
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("uploading")}
          </>
        ) : (
          t("change_picture")
        )}
      </Button>
    </div>
  )
}

