// Dashboard component commented out - Study page is now the default
export default function WelcomeBanner() {
  return null;
}

/*
"use client"

import { BookOpen, FileText } from "lucide-react"
import { Button } from "../ui/button"
import { useSession } from "next-auth/react"
import { useTranslation } from "../../app/i18n/client"
import { useEffect, useState } from "react"
import StreakTracker from "../streak"

interface WelcomeBannerProps {
  params: {
    lng: string
  }
}

export default function WelcomeBannerOld({ params: { lng } }: WelcomeBannerProps) {
  const { data: session } = useSession()
  const userName = session?.user?.name?.split(" ")[0] || "Student"
  const { t } = useTranslation(lng, "welcome")
  const [greeting, setGreeting] = useState<string>("")

  useEffect(() => {
    const getTimeBasedGreetingKey = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        return "good_morning";
      } else if (hour >= 12 && hour < 18) {
        return "good_afternoon";
      } else if (hour >= 18 && hour < 22) {
        return "good_evening";
      } else {
        return "good_night";
      }
    };
    setGreeting(getTimeBasedGreetingKey());
  }, []);

  return (
    <div className="rounded-xl p-6 max-md:p-4 border mb-8 max-md:mb-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10 dark:border-[#91969e52]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-2 text-foreground">
            {t(greeting)}, {userName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">{t("continue_your_biblical_journey")}</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-shrink-0">
          <div className="flex flex-row gap-3">
            <Button className="gap-2 max-sm:text-xs max-sm:px-2 max-sm:py-1 max-sm:h-auto">
              <BookOpen className="h-4 w-4 max-sm:h-3 max-sm:w-3" />
              <span className="max-sm:truncate">{t("resume_course")}</span>
            </Button>
            <Button variant="outline" className="gap-2 max-sm:text-xs max-sm:px-2 max-sm:py-1 max-sm:h-auto">
              <FileText className="h-4 w-4 max-sm:h-3 max-sm:w-3" />
              <span className="max-sm:truncate">{t("take_quiz")}</span>
            </Button>
          </div>
          <StreakTracker />
        </div>
      </div>
    </div>
  )
}
*/

