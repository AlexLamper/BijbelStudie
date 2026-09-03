"use client";

import { Header } from "../../components/landing/navbar";
import { Footer } from "../../components/landing/footer";
import { useTranslation } from "../i18n/client";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Mail } from "lucide-react";

export default function ContactPage() {
	const { t } = useTranslation("contact");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6 text-center">{t("title")}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 text-center">{t("description")}</p>
          <Card>
            <CardHeader>
              <CardTitle>{t("contact_info")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-brand mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t("email")}</h3>
                  <p className="text-gray-600 dark:text-gray-400">info@bijbelstudie.io</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
