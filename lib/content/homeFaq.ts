/**
 * The homepage FAQ, shared between the rendered accordion and the FAQPage
 * JSON-LD on app/page.tsx.
 *
 * It lives outside the component because the landing page is a client
 * component: the server needs the same array to emit structured data, and two
 * hand-kept copies would drift into structured data that does not match the
 * visible page - which Google treats as a spam signal, not a typo.
 */
import { FREE_AI_DAILY_CAP, FREE_NOTE_LIMIT, PRO_AI_DAILY_CAP } from "../entitlements";

export interface Faq {
  q: string;
  a: string;
}

export const HOME_FAQS: Faq[] = [
  {
    q: "Is BijbelStudie helemaal gratis?",
    a: `Het gratis plan geeft volledige toegang tot bijbellezen, markeringen, begeleide studies, het KingComments-commentaar, studiegroepen en ${FREE_AI_DAILY_CAP} vragen per dag aan de AI-assistent, en u schrijft gratis ${FREE_NOTE_LIMIT} notities. De Pro versie (€9,99 per maand of €89,99 per jaar) voegt de overige bijbelcommentaren, de grondtekst bij elk vers, ${PRO_AI_DAILY_CAP} AI-vragen per dag, onbeperkt notities en voorlezen met natuurlijke stemmen toe.`,
  },
  {
    q: "Wat doet de AI-assistent?",
    a: "U kunt de AI-assistent elke vraag stellen over de Bijbel, bijbelse geschiedenis, theologie en het geloofsleven. De assistent weet welk hoofdstuk u leest, onderbouwt antwoorden met bijbelverzen en beantwoordt alleen vragen over de Schrift en het christelijk geloof. Gebruik de antwoorden als studiehulp en toets ze altijd aan de Bijbel zelf.",
  },
  {
    q: "Welke bijbelvertalingen zijn beschikbaar?",
    a: "In het Nederlands ondersteunen wij vier vertalingen: de Statenvertaling, de Canisiusbijbel 1939, De Heilige Schrift 1917 en de NBG-vertaling 1951. Daarnaast zijn er zes Engelse vertalingen (King James Version, American Standard Version, NET Bible, World English Bible, Geneva Bible 1599 en Coverdale Bible 1535) en drie Duitse (Elberfelder 1905, Luther 1912 en Schlachter 2000). U kunt op elk moment van vertaling wisselen.",
  },
  {
    q: "Kan ik de Bijbel in de grondtekst lezen?",
    a: "Ja. Bij elk hoofdstuk kunt u de Hebreeuwse of Griekse grondtekst opvragen, woord voor woord uitgelijnd met de Nederlandse vertaling. Zo ziet u welk oorspronkelijk woord achter een vertaling zit zonder dat u Hebreeuws of Grieks hoeft te kennen.",
  },
  {
    q: "Worden mijn notities opgeslagen?",
    a: "Ja. Al uw notities en voortgang worden automatisch opgeslagen in uw persoonlijke account en zijn op elk apparaat beschikbaar - in de browser en in de iOS-app.",
  },
  {
    q: "Heb ik een account nodig om te beginnen?",
    a: "Voor bijbellezen, notities en voortgang is een gratis account nodig, zodat uw voortgang bewaard blijft. Aanmelden duurt minder dan een minuut en er is geen creditcard voor nodig. De begeleide studies kunt u zonder account bekijken.",
  },
  {
    q: "Is mijn persoonlijke data veilig?",
    a: "Ja. Wij gebruiken beveiligde verbindingen (HTTPS/TLS) en slaan uw gegevens versleuteld op. Uw data wordt nooit verkocht aan derden en uw notities zijn alleen voor uzelf zichtbaar.",
  },
];
