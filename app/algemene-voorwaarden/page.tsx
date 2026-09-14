"use client";

import Link from "next/link";
import { useTranslation } from "../i18n/client";
import { PublicFrame, NumberedSections } from "../../components/content/PublicFrame";

export default function TermsOfServicePage() {
  const { t } = useTranslation("terms-of-service");

  const sections = [
    { title: t("acceptance_of_terms"),     body: t("acceptance_description") },
    { title: t("description_of_service"),  body: t("service_description") },
    // Billing terms sit high on the page: they are the pre-contract information
    // a subscriber is entitled to, not fine print to bury under conduct rules.
    { title: t("subscriptions"),           body: t("subscriptions_description") },
    { title: t("cancellation"),            body: t("cancellation_description") },
    { title: t("withdrawal"),              body: t("withdrawal_description") },
    { title: t("user_accounts"),           body: t("user_accounts_description") },
    { title: t("user_conduct"),            body: t("conduct_description") },
    { title: t("intellectual_property"),   body: t("intellectual_property_description") },
    { title: t("termination"),             body: t("termination_description") },
    { title: t("changes_to_terms"),        body: t("changes_description") },
    { title: t("contact_us"),              body: t("contact_description") },
  ];

  return (
    <PublicFrame
      eyebrow="Juridisch"
      title={t("terms_of_service")}
      lead="De voorwaarden voor het gebruik van BijbelStudie."
    >
      <NumberedSections
        sections={sections.map(s => ({ title: s.title.replace(/^\s*\d+\.\s*/, ""), body: s.body }))}
      />

      <div className="mt-3 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Link
          href="/registreren"
          className="inline-flex h-11 items-center justify-center rounded-btn bg-teal px-5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
        >
          {t("sign_up")}
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-btn border border-line bg-surface px-5 text-[14px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft"
        >
          {t("return_to_home")}
        </Link>
      </div>
    </PublicFrame>
  );
}
