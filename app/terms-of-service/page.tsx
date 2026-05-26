"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, FileText } from "lucide-react";
import { useTranslation } from "../i18n/client";
import { Footer } from "../../components/landing/footer";

export default function TermsOfServicePage() {
  const { t } = useTranslation("terms-of-service");

  const sections = [
    { title: t("acceptance_of_terms"),     body: t("acceptance_description") },
    { title: t("description_of_service"),  body: t("service_description") },
    { title: t("user_accounts"),           body: t("user_accounts_description") },
    { title: t("user_conduct"),            body: t("conduct_description") },
    { title: t("intellectual_property"),   body: t("intellectual_property_description") },
    { title: t("termination"),             body: t("termination_description") },
    { title: t("changes_to_terms"),        body: t("changes_description") },
    { title: t("contact_us"),              body: t("contact_description") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/images/favicon.ico" alt="" width={26} height={26} className="rounded-md" priority />
            <span className="font-bold text-base text-gray-900">BijbelStudie</span>
          </Link>
          <Link href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            {t("return_to_home")}
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        {/* Title */}
        <section className="border-b border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto px-6 py-14 lg:py-16 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 mb-5">
              <FileText className="h-3.5 w-3.5 text-teal-600" />
              <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Juridisch</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900">
              {t("terms_of_service")}
            </h1>
            <p className="mt-4 text-base text-gray-500">
              De voorwaarden voor het gebruik van BijbelStudie.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-14 lg:py-16">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 lg:p-10 space-y-9">
              {sections.map((s, i) => (
                <div key={i}>
                  <h2 className="flex items-center gap-3 text-lg font-bold text-gray-900 mb-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 text-sm font-bold tabular-nums">
                      {i + 1}
                    </span>
                    {s.title.replace(/^\s*\d+\.\s*/, "")}
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-600 sm:pl-10">{s.body}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-10">
              <Link href="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold text-white px-7 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors">
                {t("sign_up")}
              </Link>
              <Link href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold px-7 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white hover:bg-gray-50 transition-colors">
                {t("return_to_home")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
