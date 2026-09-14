"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useTranslation } from "../i18n/client";
import { PublicFrame } from "../../components/content/PublicFrame";
import { CONTACT_EMAIL } from "../../lib/seo/constants";

export default function ContactPage() {
  const { t } = useTranslation("contact");

  return (
    <PublicFrame eyebrow="Contact" title={t("title")} lead={t("description")}>
      <div className="rounded-card border border-line bg-surface px-4 py-5 sm:px-[22px]">
        <h2 className="text-[16.5px] font-bold text-ink">{t("contact_info")}</h2>

        <div className="mt-4 flex items-center gap-3 border-t border-line-soft pt-4">
          {/* Identifies the row as an e-mail address. */}
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-teal-faint text-teal dark:text-teal-400">
            <Mail size={17} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-ink-muted">{t("email")}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="block break-all text-[14.5px] font-semibold text-ink no-underline hover:text-teal dark:hover:text-teal-400"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-4 flex h-[38px] w-full items-center justify-center rounded-[9px] border border-line text-[13px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft sm:inline-flex sm:w-auto sm:px-5"
        >
          Mail het team
        </a>
      </div>

      <p className="px-1 text-[12.5px] leading-[1.6] text-ink-faint">
        Een vraag over je account of abonnement? Kijk eerst bij{" "}
        <Link href="/help" className="font-semibold text-teal no-underline hover:text-teal-dark dark:text-teal-400 dark:hover:text-teal-300">
          Help
        </Link>
        .
      </p>
    </PublicFrame>
  );
}
