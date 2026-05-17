/*
"use client";
import { useSession } from "next-auth/react";
import { useTranslation } from "../../app/i18n/client";
import { useEffect, useState } from "react";

interface WelcomeCardProps {
  lng: string;
}

export function WelcomeCard({ lng }: WelcomeCardProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(" ")[0] || "Student";
  const { t } = useTranslation(lng, "welcome");
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    const getTimeBasedGreeting = () => {
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
    setGreeting(getTimeBasedGreeting());
  }, []);

  return (
    <div className="p-8 shadow-lg border dark:shadow-gray-900/20 bg-white dark:bg-[#23263a]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className=" text-2xl lg:text-3xl font-bold text-foreground">
          {t(greeting)}, {userName}!
        </h2>
        <p className=" text-gray-600 dark:text-gray-300 text-right">
          {new Intl.DateTimeFormat(lng, { dateStyle: "full" }).format(new Date())}
        </p>
      </div>
    </div>
  );
}
*/

// Dashboard component commented out - Study page is now the default
export function WelcomeCard() {
  return null;
}

