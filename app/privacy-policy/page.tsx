import Link from "next/link"
import Image from "next/image"
import { Metadata } from "next";
import { cookies } from "next/headers";
import { ArrowLeft, Shield } from "lucide-react";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { Footer } from "../../components/landing/footer";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('privacyPolicy', lng);
}

const sections = [
  {
    title: "Informatie die we verzamelen",
    body: "We verzamelen informatie die u rechtstreeks aan ons verstrekt, zoals wanneer u een account aanmaakt, deelneemt aan communityfuncties of contact met ons opneemt voor ondersteuning. Dit kan uw naam, e-mailadres en andere informatie omvatten die u zelf besluit te verstrekken.",
  },
  {
    title: "Hoe we uw informatie gebruiken",
    body: "We gebruiken de verzamelde informatie om onze diensten te leveren, te onderhouden en te verbeteren, om met u te communiceren en om uw ervaring op BijbelStudie te personaliseren.",
  },
  {
    title: "Delen en openbaarmaking van informatie",
    body: "We delen uw persoonlijke gegevens niet met derden, behalve zoals beschreven in dit beleid. We kunnen informatie delen met dienstverleners die namens ons diensten verrichten, of wanneer dit wettelijk verplicht is.",
  },
  {
    title: "Gegevensbeveiliging",
    body: "We nemen redelijke maatregelen om uw persoonlijke gegevens te beschermen tegen verlies, diefstal, misbruik en ongeoorloofde toegang, openbaarmaking, wijziging en vernietiging.",
  },
  {
    title: "Uw keuzes",
    body: "U kunt bepaalde informatie over uw account inzien en bijwerken door in te loggen op uw accountinstellingen. U kunt zich ook afmelden voor promotionele communicatie door de instructies in die berichten te volgen.",
  },
  {
    title: "Cookies",
    body: "We gebruiken cookies en vergelijkbare technologieën om informatie te verzamelen over uw activiteit, browser en apparaat. U kunt uw cookievoorkeuren beheren via uw browserinstellingen.",
  },
  {
    title: "Wijzigingen in dit beleid",
    body: "We kunnen dit privacybeleid van tijd tot tijd bijwerken. We stellen u op de hoogte van eventuele wijzigingen door het nieuwe privacybeleid op deze pagina te plaatsen.",
  },
  {
    title: "Neem contact met ons op",
    body: "Als u vragen heeft over dit privacybeleid, neem dan contact met ons op via privacy@bijbelstudie.com.",
  },
];

export default function PrivacyPolicyPage() {
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
            Terug naar home
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        {/* Title */}
        <section className="border-b border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto px-6 py-14 lg:py-16 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 mb-5">
              <Shield className="h-3.5 w-3.5 text-teal-600" />
              <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Privacy</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900">
              Privacybeleid
            </h1>
            <p className="mt-4 text-base text-gray-500">
              Hoe wij uw gegevens verzamelen, gebruiken en beschermen.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-14 lg:py-16">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 lg:p-10 space-y-9">
              {sections.map((s, i) => (
                <div key={s.title}>
                  <h2 className="flex items-center gap-3 text-lg font-bold text-gray-900 mb-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 text-sm font-bold tabular-nums">
                      {i + 1}
                    </span>
                    {s.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-600 sm:pl-10">{s.body}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/"
                className="inline-flex items-center justify-center gap-2 font-semibold text-white px-7 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors">
                Terug naar home
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
