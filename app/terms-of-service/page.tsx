"use client";

import { Button } from "../../components/ui/button";
import Link from "next/link";
import { useTranslation } from "../i18n/client";
import { Footer } from "../../components/Footer/client";

export default function TermsOfServicePage() {
  const { t } = useTranslation("terms-of-service");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">{t("terms_of_service")}</h1>

        <div className="bg-gray-200 dark:bg-[#3d3d3ff2] shadow-md rounded-lg p-6 mb-8">
          <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">{t("acceptance_of_terms")}</h2>
            <p className="">{t("acceptance_description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">{t("description_of_service")}</h2>
            <p className="">{t("service_description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">{t("user_accounts")}</h2>
            <p className="">{t("user_accounts_description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">{t("user_conduct")}</h2>
            <p className="">{t("conduct_description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">{t("intellectual_property")}</h2>
            <p className="">{t("intellectual_property_description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">{t("termination")}</h2>
            <p className="">{t("termination_description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">{t("changes_to_terms")}</h2>
            <p className="">{t("changes_description")}</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold mb-4">{t("contact_us")}</h2>
            <p className="">{t("contact_description")}</p>
          </section>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base font-semibold">
            <Link href={`/api/auth/signin`}>{t("sign_up")}</Link>
          </Button>
          <Button asChild size="lg" className="w-full sm:w-auto text-base font-semibold">
            <Link href={`/`}>{t("return_to_home")}</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
