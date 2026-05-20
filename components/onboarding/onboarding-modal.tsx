"use client"

import { useState, useEffect } from "react"
import { Check, BookOpen, Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Dialog, DialogContent } from "../ui/dialog"
import { useRouter } from "next/navigation"
import Image from "next/image"

const BIBLE_VERSIONS = [
  {
    code: "statenvertaling",
    label: "Statenvertaling",
    desc: "De klassieke Nederlandse bijbelvertaling (1637)",
  },
  {
    code: "basisbijbel",
    label: "BasisBijbel",
    desc: "Moderne, toegankelijke Nederlandse vertaling",
  },
]

const THEMES = [
  { code: "light",  label: "Licht",   desc: "Helder wit — prettig overdag",           icon: Sun },
  { code: "dark",   label: "Donker",  desc: "Rustgevend donker — minder vermoeiend",   icon: Moon },
  { code: "system", label: "Systeem", desc: "Volgt automatisch je apparaatinstelling", icon: Monitor },
]

const TOTAL = 2

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function OnboardingModal({ isOpen: initialIsOpen, onClose, onComplete }: OnboardingModalProps) {
  const [open, setOpen] = useState(initialIsOpen)
  const [step, setStep] = useState(1)
  const { setTheme } = useTheme()
  const router = useRouter()

  const [prefs, setPrefs] = useState({
    translation: "statenvertaling",
    intent: "light",
  })

  useEffect(() => { setOpen(initialIsOpen) }, [initialIsOpen])

  const saveAndClose = async () => {
    try {
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prefs, onboardingCompleted: true }),
      })
      router.refresh()
    } catch {}
  }

  const handleDismiss = async () => {
    await saveAndClose()
    setOpen(false)
    onClose()
  }

  const next = async () => {
    if (step < TOTAL) {
      setStep(s => s + 1)
    } else {
      await saveAndClose()
      setOpen(false)
      onComplete()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleDismiss()}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden gap-0 rounded-2xl border border-gray-200 dark:border-border shadow-2xl">

        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ backgroundColor: "#0D9488" }} />

        {/* Header */}
        <div className="px-7 pt-7 pb-2">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-6">
            <Image src="/images/favicon.ico" alt="" width={22} height={22} className="rounded-md" />
            <span className="font-bold text-sm text-gray-900 dark:text-foreground">BijbelStudie</span>
          </div>

          {/* Step label */}
          <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#0D9488" }}>
            Stap {step} van {TOTAL}
          </p>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-foreground leading-snug">
            {step === 1 ? "Kies je bijbelvertaling" : "Kies je weergave"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-muted-foreground mt-1">
            {step === 1
              ? "Welke vertaling wil je standaard gebruiken bij het studeren?"
              : "Hoe wil je de app weergeven? Je kunt dit later altijd aanpassen."}
          </p>
        </div>

        {/* Options */}
        <div className="px-7 py-5 flex flex-col gap-2.5">

          {step === 1 && BIBLE_VERSIONS.map(v => {
            const active = prefs.translation === v.code
            return (
              <button
                key={v.code}
                onClick={() => setPrefs(p => ({ ...p, translation: v.code }))}
                className="flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: active ? "#0D9488" : "#E5E7EB",
                  backgroundColor: active ? "rgba(13,148,136,0.05)" : "transparent",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: active ? "rgba(13,148,136,0.12)" : "#F3F4F6" }}>
                    <BookOpen className="h-4 w-4" style={{ color: active ? "#0D9488" : "#9CA3AF" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-foreground">{v.label}</p>
                    <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">{v.desc}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: active ? "#0D9488" : "#D1D5DB",
                    backgroundColor: active ? "#0D9488" : "transparent",
                  }}>
                  {active && <Check className="h-3 w-3 text-white" />}
                </div>
              </button>
            )
          })}

          {step === 2 && THEMES.map(t => {
            const active = prefs.intent === t.code
            const Icon = t.icon
            return (
              <button
                key={t.code}
                onClick={() => { setPrefs(p => ({ ...p, intent: t.code })); setTheme(t.code) }}
                className="flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: active ? "#0D9488" : "#E5E7EB",
                  backgroundColor: active ? "rgba(13,148,136,0.05)" : "transparent",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: active ? "rgba(13,148,136,0.12)" : "#F3F4F6" }}>
                    <Icon className="h-4 w-4" style={{ color: active ? "#0D9488" : "#9CA3AF" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-foreground">{t.label}</p>
                    <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: active ? "#0D9488" : "#D1D5DB",
                    backgroundColor: active ? "#0D9488" : "transparent",
                  }}>
                  {active && <Check className="h-3 w-3 text-white" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-7 pb-7">
          <button
            onClick={next}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: "#0D9488" }}
          >
            {step === TOTAL ? "Begin met studeren" : "Volgende"}
          </button>
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-muted-foreground transition-colors"
            >
              Terug
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-gray-100 dark:bg-secondary">
          <div
            className="h-1 transition-all duration-300"
            style={{ width: `${(step / TOTAL) * 100}%`, backgroundColor: "#0D9488" }}
          />
        </div>

      </DialogContent>
    </Dialog>
  )
}
