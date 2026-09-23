import type { Faq } from "./homeFaq";
import { FREE_AI_DAILY_CAP, FREE_NOTE_LIMIT, PRO_AI_DAILY_CAP } from "../entitlements";

/**
 * The help centre content, grouped by topic.
 *
 * Written out here rather than pulled through i18next: the site is Dutch-only,
 * and the FAQPage structured data has to describe text that is literally on
 * the page.
 */
export interface HelpTopic {
  id: string;
  title: string;
  faqs: Faq[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "aan-de-slag",
    title: "Aan de slag",
    faqs: [
      {
        q: "Hoe maak ik een account aan?",
        a: "Klik op 'Gratis beginnen' en registreer met je e-mailadres, of log in met Google. Aanmelden duurt minder dan een minuut en er is geen creditcard voor nodig.",
      },
      {
        q: "Heb ik een account nodig om de Bijbel te lezen?",
        a: "Voor bijbellezen, notities en voortgang wel, omdat je voortgang aan je account wordt gekoppeld en op elk apparaat beschikbaar moet zijn. De begeleide studies zijn zonder account te bekijken.",
      },
      {
        q: "Waar begin ik het beste?",
        a: "Open een bijbelboek dat je wilt bestuderen en lees op je eigen tempo. Weet je niet waar te beginnen, kijk dan bij de begeleide studies - die nemen je stap voor stap door een gedeelte heen.",
      },
      {
        q: "Werkt BijbelStudie op mijn telefoon?",
        a: "Ja. De website werkt op telefoon, tablet en computer, en er is daarnaast een iOS-app. Je account en je voortgang zijn overal hetzelfde.",
      },
    ],
  },
  {
    id: "bijbel-lezen",
    title: "Bijbel lezen en studeren",
    faqs: [
      {
        q: "Welke bijbelvertalingen kan ik lezen?",
        a: "Vier Nederlandse vertalingen: de Statenvertaling, de Canisiusbijbel 1939, De Heilige Schrift 1917 en de NBG-vertaling 1951. Daarnaast zes Engelse vertalingen (King James Version, American Standard Version, NET Bible, World English Bible, Geneva Bible 1599 en Coverdale Bible 1535) en drie Duitse (Elberfelder 1905, Luther 1912 en Schlachter 2000).",
      },
      {
        q: "Kan ik twee vertalingen naast elkaar leggen?",
        a: "Nog niet in één scherm: je wisselt met de vertalingkeuze tussen vertalingen. Lees een lastig vers in twee vertalingen na elkaar; juist op de plekken waar ze uiteenlopen zit meestal de interessantste vraag van je studie.",
      },
      {
        q: "Wat is de grondtekstfunctie?",
        a: "Bij elk hoofdstuk kun je de Hebreeuwse of Griekse grondtekst opvragen, woord voor woord uitgelijnd met de Nederlandse vertaling. Je hoeft de taal niet te kennen: je ziet welk oorspronkelijk woord achter een vertaling zit en waar datzelfde woord elders voorkomt.",
      },
      {
        q: "Welke bijbelcommentaren zijn beschikbaar?",
        a: "KingComments (Ger de Koning), Matthew Henry in Nederlandse vertaling, Johannes Calvijn en Karl August Dachsel, allemaal per vers te raadplegen naast de bijbeltekst. KingComments is gratis en volledig te lezen; de overige commentaren horen bij het Pro-abonnement.",
      },
      {
        q: "Kan ik naar de gesproken tekst luisteren?",
        a: "Ja, met de voorleesfunctie laat je een hoofdstuk hardop voorlezen terwijl je meeleest.",
      },
      {
        q: "Kan ik een los hoofdstuk bestuderen zonder een hele studie te volgen?",
        a: "Ja. Kies in de lezer 'Bestudeer dit hoofdstuk', of kies op de pagina Studies een boek en een hoofdstuk. Je doorloopt dan dezelfde stappen als in een studie: inleiding, bijbelse context, lezen, verdieping, toetsing en toepassing. Je hoeft daarvoor geen studie te starten, en het hoofdstuk telt wel mee voor de studie van dat boek, mocht je die later volgen. Losse studies zijn gratis; alleen de Pro-commentaren en de extra AI-vragen horen bij Pro.",
      },
    ],
  },
  {
    id: "voortgang",
    title: "Voortgang en streak",
    faqs: [
      {
        q: "Wat is een streak?",
        a: "Het aantal dagen achter elkaar waarop je hebt gelezen of gestudeerd. De streak loopt door zolang je elke dag iets doet en is bedoeld als steuntje bij het volhouden, niet als eis.",
      },
      {
        q: "Wat is het verschil tussen 'gelezen' en 'bestudeerd'?",
        a: "Een hoofdstuk doorlezen telt anders dan een hoofdstuk bestuderen met notities en commentaar. Beide leveren voortgang op, maar studeren telt zwaarder mee, omdat het meer tijd en aandacht kost.",
      },
    ],
  },
  {
    id: "ai-assistent",
    title: "De AI-assistent",
    faqs: [
      {
        q: "Wat kan de AI-assistent voor mij doen?",
        a: "Je kunt elke vraag stellen over de Bijbel, bijbelse geschiedenis, theologie en het geloofsleven. De assistent weet welk hoofdstuk je leest, onderbouwt antwoorden met bijbelverzen en beantwoordt alleen vragen over de Schrift en het christelijk geloof.",
      },
      {
        q: "Hoeveel vragen kan ik stellen?",
        a: `Met een gratis account ${FREE_AI_DAILY_CAP} vragen per dag. Met Pro zijn het er ${PRO_AI_DAILY_CAP} per dag.`,
      },
      {
        q: "Kan ik de antwoorden vertrouwen?",
        a: "Gebruik ze als studiehulp, niet als gezag. Een AI klinkt bij een fout antwoord even zeker als bij een juist antwoord. Toets wat je leest altijd aan de bijbeltekst zelf en, als het ergens op aankomt, aan een commentaar.",
      },
    ],
  },
  {
    id: "account",
    title: "Account en wachtwoord",
    faqs: [
      {
        q: "Hoe reset ik mijn wachtwoord?",
        a: "Klik op de inlogpagina op 'Wachtwoord vergeten' en vul je e-mailadres in. Je ontvangt een e-mail met een link om een nieuw wachtwoord in te stellen. Komt de e-mail niet aan, controleer dan je spamfolder. Weet je je wachtwoord nog en wil je het alleen veranderen? Dat doe je onder Instellingen > Account. Log je in met Google of Apple, dan heb je geen apart wachtwoord.",
      },
      {
        q: "Kan ik mijn e-mailadres of naam wijzigen?",
        a: "Ja, via Instellingen in je account. Daar pas je ook je profielfoto en je leesvoorkeuren aan.",
      },
      {
        q: "Hoe verwijder ik mijn account?",
        a: "Ga naar Instellingen > Account en kies onderaan 'Account verwijderen'. Ter bevestiging typ je je e-mailadres (en je wachtwoord, als je dat gebruikt). Je account en de bijbehorende gegevens worden meteen verwijderd; je notities en voortgang gaan daarbij definitief verloren. Heb je een abonnement via de website, zeg dat dan eerst op onder Instellingen > Abonnement. In de app vind je dezelfde optie onder Profiel.",
      },
      {
        q: "Zijn mijn notities privé?",
        a: "Ja. Je notities zijn alleen voor jou zichtbaar.",
      },
    ],
  },
  {
    id: "abonnement",
    title: "Abonnement en betaling",
    faqs: [
      {
        q: "Wat kost BijbelStudie Pro?",
        a: `Pro kost €9,99 per maand, maandelijks gefactureerd, of €89,99 per jaar, in één keer gefactureerd. Zonder Pro blijven bijbellezen, markeringen, begeleide studies, het KingComments-commentaar, meedoen met studiegroepen en ${FREE_AI_DAILY_CAP} AI-vragen per dag gratis. Zonder Pro schrijf je ${FREE_NOTE_LIMIT} notities, op de website en in de app samen.`,
      },
      {
        q: "Wat krijg ik met Pro?",
        a: `Toegang tot de overige bijbelcommentaren - Matthew Henry, Calvijn en Dachsel - naast het gratis KingComments, de Hebreeuwse en Griekse grondtekst bij elk vers, ${PRO_AI_DAILY_CAP} AI-vragen per dag in plaats van ${FREE_AI_DAILY_CAP}, onbeperkt notities, zoveel studiegroepen leiden als je wilt, voorlezen met natuurlijke stemmen, streakbescherming en extra bomen en landschappen voor je boom. Had je Pro nog niet eerder, dan zijn de eerste 7 dagen gratis.`,
      },
      {
        q: "Hoe zeg ik mijn abonnement op?",
        a: "Via Instellingen kun je je abonnement op elk moment opzeggen. Je houdt toegang tot Pro tot het einde van de periode die je al betaald hebt.",
      },
      {
        q: "Ik heb Pro gekocht in de app - werkt dat ook op de website?",
        a: "Ja. Een aankoop via de App Store wordt op de website als Pro herkend zodra je met hetzelfde account inlogt.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy en veiligheid",
    faqs: [
      {
        q: "Is mijn persoonlijke data veilig?",
        a: "We gebruiken beveiligde verbindingen (HTTPS/TLS) en slaan je gegevens versleuteld op. Je data wordt nooit verkocht aan derden.",
      },
      {
        q: "Welke gegevens verzamelen jullie?",
        a: "Alleen wat nodig is om de dienst te leveren: je accountgegevens, je notities, je leesvoortgang en je voorkeuren. Het volledige overzicht staat in het privacybeleid.",
      },
    ],
  },
];

/**
 * The fragment id of one question on /help, e.g.
 * `account-hoe-reset-ik-mijn-wachtwoord`. Derived from the topic and the
 * question text so the command palette and the page can never disagree:
 * lowercase, accents stripped, everything that is not a letter or a digit
 * collapsed to one hyphen, capped at 80 characters.
 */
export function faqAnchor(topicId: string, question: string): string {
  const slug = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${topicId}-${slug}`.slice(0, 80).replace(/-+$/g, "");
}

/** Flattened list for the FAQPage structured data. */
export const ALL_HELP_FAQS: Faq[] = HELP_TOPICS.flatMap(topic => topic.faqs);
