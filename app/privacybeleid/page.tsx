import Link from "next/link"
import { Metadata } from "next";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { PublicFrame, NumberedSections } from "../../components/content/PublicFrame";

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
    title: "Account verwijderen en bewaartermijnen",
    body: "U kunt uw account op elk moment verwijderen: in de app via Profiel > Account verwijderen, of per e-mail aan info@bijbelstudie.io. Daarmee verwijderen we uw account en de gegevens die erbij horen, zoals notities, markeringen, bladwijzers, leesgeschiedenis en voortgang. Een beveiligingskopie bewaren we maximaal 90 dagen, uitsluitend om een onterechte verwijdering te kunnen herstellen; daarna wordt ook die definitief gewist. Alle details staan op bijbelstudie.io/account-verwijderen.",
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
    body: "Als u vragen heeft over dit privacybeleid, neem dan contact met ons op via info@bijbelstudie.io.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PublicFrame
      eyebrow="Privacy"
      title="Privacybeleid"
      lead="Hoe wij uw gegevens verzamelen, gebruiken en beschermen."
    >
      <NumberedSections sections={sections} />

      <div className="mt-3 flex justify-center">
        <Link
          href="/"
          className="inline-flex h-11 w-full items-center justify-center rounded-btn bg-teal px-5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90 sm:w-auto"
        >
          Terug naar home
        </Link>
      </div>
    </PublicFrame>
  )
}
