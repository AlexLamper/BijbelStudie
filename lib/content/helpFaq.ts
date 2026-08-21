import type { Faq } from "./homeFaq";

/**
 * The help centre content, grouped by topic.
 *
 * Written out here rather than pulled from app/i18n/locales/nl/help.json: the
 * site is Dutch-only, the help page needs far more than the three entries that
 * file held, and the FAQPage structured data has to describe text that is
 * literally on the page.
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
        a: "Voor bijbellezen, notities en leesplannen wel, omdat je voortgang aan je account wordt gekoppeld en op elk apparaat beschikbaar moet zijn. De bibliotheek met publiek-domein werken en de begeleide studies zijn zonder account te bekijken.",
      },
      {
        q: "Waar begin ik het beste?",
        a: "Open een bijbelboek dat je wilt bestuderen, of schrijf je in voor een leesplan zodat je elke dag een leesportie krijgt. Weet je niet waar te beginnen, kijk dan bij de begeleide studies - die nemen je stap voor stap door een gedeelte heen.",
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
        a: "Ja. In de vergelijkingsweergave zet je vertalingen naast elkaar per vers. Juist op de plekken waar ze uiteenlopen zit meestal de interessantste vraag van je studie.",
      },
      {
        q: "Wat is de grondtekstfunctie?",
        a: "Bij elk hoofdstuk kun je de Hebreeuwse of Griekse grondtekst opvragen, woord voor woord uitgelijnd met de Nederlandse vertaling. Je hoeft de taal niet te kennen: je ziet welk oorspronkelijk woord achter een vertaling zit en waar datzelfde woord elders voorkomt.",
      },
      {
        q: "Welke bijbelcommentaren zijn beschikbaar?",
        a: "Matthew Henry (Nederlandse vertaling), Karl August Dachsel en King Comments, allemaal per vers te raadplegen naast de bijbeltekst. De commentaren horen bij het Pro-abonnement.",
      },
      {
        q: "Kan ik naar de gesproken tekst luisteren?",
        a: "Ja, met de voorleesfunctie laat je een hoofdstuk hardop voorlezen terwijl je meeleest.",
      },
    ],
  },
  {
    id: "leesplannen",
    title: "Leesplannen en voortgang",
    faqs: [
      {
        q: "Hoe werkt een bijbelleesplan?",
        a: "Je schrijft je in voor een leesplan en krijgt dagelijkse leesporties. Je voortgang wordt bijgehouden en je kunt altijd verdergaan waar je gebleven was. Loop je een dag achter, dan schuift het plan mee in plaats van dat je opnieuw moet beginnen.",
      },
      {
        q: "Wat is een streak?",
        a: "Het aantal dagen achter elkaar waarop je hebt gelezen of gestudeerd. De streak loopt door zolang je elke dag iets doet en is bedoeld als steuntje bij het volhouden, niet als eis.",
      },
      {
        q: "Wat is het verschil tussen 'gelezen' en 'bestudeerd'?",
        a: "Een hoofdstuk doorlezen telt anders dan een hoofdstuk bestuderen met notities en commentaar. Beide leveren voortgang op, maar studeren telt zwaarder mee, omdat het meer tijd en aandacht kost.",
      },
      {
        q: "Kan ik een eigen leesplan maken?",
        a: "Ja. Naast de kant-en-klare plannen kun je zelf een plan samenstellen: kies de bijbelboeken en de looptijd, en de dagelijkse porties worden voor je berekend.",
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
        a: "Met een gratis account vijf vragen per dag. Met Pro is het aantal onbeperkt.",
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
        a: "Klik op de inlogpagina op 'Wachtwoord vergeten' en vul je e-mailadres in. Je ontvangt een e-mail met een link om een nieuw wachtwoord in te stellen. Komt de e-mail niet aan, controleer dan je spamfolder.",
      },
      {
        q: "Kan ik mijn e-mailadres of naam wijzigen?",
        a: "Ja, via Instellingen in je account. Daar pas je ook je profielfoto en je leesvoorkeuren aan.",
      },
      {
        q: "Hoe verwijder ik mijn account?",
        a: "Neem contact met ons op via de contactpagina. We verwijderen je account en de bijbehorende gegevens; je notities en voortgang gaan daarbij definitief verloren.",
      },
      {
        q: "Zijn mijn notities privé?",
        a: "Ja. Je notities zijn alleen voor jou zichtbaar, tenzij je ze zelf deelt in een studiegroep.",
      },
    ],
  },
  {
    id: "abonnement",
    title: "Abonnement en betaling",
    faqs: [
      {
        q: "Wat kost BijbelStudie Pro?",
        a: "Pro kost €9,99 per maand, maandelijks gefactureerd, of €89,99 per jaar, in één keer gefactureerd. Zonder Pro blijft bijbellezen, notities, leesplannen, begeleide studies, de bibliotheek en vijf AI-vragen per dag gratis beschikbaar.",
      },
      {
        q: "Wat krijg ik met Pro?",
        a: "Toegang tot alle bijbelcommentaren, onbeperkt gebruik van de AI-assistent, en historische context bij de gedeelten die je bestudeert.",
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

/** Flattened list for the FAQPage structured data. */
export const ALL_HELP_FAQS: Faq[] = HELP_TOPICS.flatMap(topic => topic.faqs);
