import type { Metadata } from "next";
import Link from "next/link";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { PublicFrame } from "../../components/content/PublicFrame";

/**
 * Public account-deletion page: the "Delete account URL" in Google Play's Data
 * safety form. Play requires it to be reachable without the app and without
 * signing in, to name the app, to give the steps, and to say what is deleted
 * and what is kept for how long. Keep the lists in step with
 * lib/accountPurge.ts (what is removed) and models/DeletedAccount.js (the
 * 90-day archive).
 */
export const metadata: Metadata = generatePageMetadata("accountDeletion");

const SUPPORT_EMAIL = "info@bijbelstudie.io";
const MAILTO =
  `mailto:${SUPPORT_EMAIL}` +
  `?subject=${encodeURIComponent("Account verwijderen")}` +
  `&body=${encodeURIComponent(
    "Verwijder alstublieft mijn BijbelStudie-account en alle bijbehorende gegevens.\n\n" +
      "E-mailadres van mijn account: \n" +
      "Ingelogd met (e-mail, Google of Apple): \n",
  )}`;

const DELETED = [
  "Je account en profiel: naam, e-mailadres en profielfoto",
  "Notities, markeringen en bladwijzers",
  "Leesgeschiedenis, voortgang, reeksen en je Levensboom",
  "Voortgang in studies en leesplannen",
  "Gegevens over je gebruik van de AI-assistent",
  "Berichten in groepen; je lidmaatschap van groepen en leesplannen vervalt",
  "Alle inlogsessies, op elk apparaat",
];

const KEPT = [
  {
    title: "Beveiligingskopie: maximaal 90 dagen",
    body: "Voordat we iets verwijderen maken we een kopie, zodat een onterechte verwijdering hersteld kan worden. Die kopie is niet in gebruik en wordt binnen 90 dagen definitief gewist.",
  },
  {
    title: "Feedback en app-statistieken: anoniem",
    body: "Feedback die je hebt gegeven en gebruiksstatistieken blijven bestaan, maar zonder je naam, e-mailadres of account. Ze zijn daarna niet meer tot jou te herleiden.",
  },
  {
    title: "Groepen van anderen",
    body: "Groepen en leesplannen blijven bestaan voor de andere deelnemers. Jij wordt eruit verwijderd.",
  },
  {
    title: "Betaalgegevens bij de winkel",
    body: "Aankopen via de App Store, Google Play of de website worden verwerkt door Apple, Google en Stripe. Zij bewaren hun eigen administratie volgens hun wettelijke bewaartermijnen.",
  },
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface px-4 py-[18px] sm:px-[22px]">
      {children}
    </section>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[15px] font-bold leading-7 text-ink">{children}</h2>;
}

const bodyClass = "text-[13.5px] leading-[1.7] text-ink-body";
const linkClass = "font-semibold text-teal hover:text-teal-dark dark:text-teal-400 dark:hover:text-teal-300";

export default function AccountDeletionPage() {
  return (
    <PublicFrame
      eyebrow="Account"
      title="Account verwijderen"
      lead="Zo verwijder je je BijbelStudie-account en de gegevens die erbij horen. De app (iPhone, iPad en Android) en de website delen één account: verwijderen geldt overal."
    >
      <Card>
        <CardTitle>1. In de app (direct)</CardTitle>
        <ol className={`${bodyClass} mt-2 list-decimal space-y-1 pl-5`}>
          <li>Open de BijbelStudie-app en log in.</li>
          <li>Ga naar het tabblad <strong>Profiel</strong> en scrol naar beneden.</li>
          <li>Tik op <strong>Account verwijderen</strong> en bevestig.</li>
        </ol>
        <p className={`${bodyClass} mt-2`}>Je account en gegevens worden meteen verwijderd.</p>
      </Card>

      <Card>
        <CardTitle>2. Zonder de app (per e-mail)</CardTitle>
        <p className={`${bodyClass} mt-1`}>
          Heb je de app niet meer? Stuur een e-mail naar{" "}
          <a href={MAILTO} className={linkClass}>
            {SUPPORT_EMAIL}
          </a>{" "}
          met als onderwerp <strong>Account verwijderen</strong>. Stuur hem bij voorkeur vanaf het e-mailadres van je
          account en vermeld hoe je inlogt (e-mail, Google of Apple). Log je in met Apple en heb je je e-mailadres
          verborgen, noem dan het privé-relay-adres dat Apple voor BijbelStudie heeft aangemaakt.
        </p>
        <p className={`${bodyClass} mt-2`}>
          We kunnen je vragen te bevestigen dat het account van jou is. Daarna verwijderen we het binnen 30 dagen en laten
          we het je per e-mail weten.
        </p>
        <a
          href={MAILTO}
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-btn bg-teal px-5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90 sm:w-auto"
        >
          Verwijderverzoek e-mailen
        </a>
      </Card>

      <Card>
        <CardTitle>Heb je een abonnement? Zeg dat apart op</CardTitle>
        <p className={`${bodyClass} mt-1`}>
          Een account verwijderen stopt een lopend abonnement niet. Zeg het op waar je het hebt afgesloten:
        </p>
        <ul className={`${bodyClass} mt-2 list-disc space-y-1 pl-5`}>
          <li>
            <strong>iPhone of iPad:</strong> Instellingen &gt; je naam &gt; Abonnementen &gt; BijbelStudie.
          </li>
          <li>
            <strong>Android:</strong> Google Play Store &gt; je profielfoto &gt; Betalingen en abonnementen &gt;
            Abonnementen &gt; BijbelStudie.
          </li>
          <li>
            <strong>Via de website betaald:</strong> vermeld het in je e-mail, dan zeggen wij het voor je op.
          </li>
        </ul>
      </Card>

      <Card>
        <CardTitle>Wat we verwijderen</CardTitle>
        <ul className={`${bodyClass} mt-2 list-disc space-y-1 pl-5`}>
          {DELETED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Wat blijft, en hoe lang</CardTitle>
        <div className="mt-1 space-y-3">
          {KEPT.map((item) => (
            <div key={item.title}>
              <h3 className="text-[13.5px] font-semibold text-ink">{item.title}</h3>
              <p className={bodyClass}>{item.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="px-1 text-[12.5px] leading-[1.6] text-ink-muted">
        Vragen? Mail{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
          {SUPPORT_EMAIL}
        </a>{" "}
        of lees ons{" "}
        <Link href="/privacybeleid" className={linkClass}>
          privacybeleid
        </Link>
        .
      </p>
    </PublicFrame>
  );
}
