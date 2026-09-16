import type { Metadata } from "next";
import Link from "next/link";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { PublicFrame } from "../../components/content/PublicFrame";

/**
 * Privacy policy for the website and the app (the app links here via
 * `privacyPolicyUrl`). Every statement is taken from the code, not assumed:
 * keep it in step with
 *  - lib/accountPurge.ts and /account-verwijderen (what deletion removes),
 *  - lib/dataRetention.ts and the TTL indexes in models/ (every bewaartermijn),
 *  - lib/analyticsSchema.ts (what the statistics can contain),
 *  - the SDKs in the app's pubspec.yaml and the providers in lib/ (ontvangers).
 * A new processor, data field or retention period means a change here and a new
 * "laatst bijgewerkt" date.
 */
export const metadata: Metadata = generatePageMetadata("privacyPolicy");

const LAST_UPDATED = "16 september 2026";
const SUPPORT_EMAIL = "info@bijbelstudie.io";

type Item = { title: string; body: string };

const DATA: Item[] = [
  {
    title: "Account",
    body: "Je naam, e-mailadres en wachtwoord. Het wachtwoord slaan we alleen versleuteld op (als bcrypt-hash), nooit leesbaar. Log je in met Google of Apple, dan ontvangen we van hen een account-ID, je naam en je e-mailadres; bij Apple kan dat een privé-relayadres zijn. Optioneel: een profielfoto (bij inloggen met Google de foto van je Google-account) en een korte bio.",
  },
  {
    title: "Instellingen",
    body: "Je gekozen bijbelvertaling en commentaar, leesweergave, voorleesstem, herinneringstijd en tijdzone, en je antwoorden bij de introductie, zoals hoe je het liefst studeert.",
  },
  {
    title: "Studie en lezen",
    body: "Notities, markeringen en bladwijzers; gelezen hoofdstukken, je laatst gelezen plek en leesgeschiedenis; voortgang in studies, lessen, quizzen en leesplannen.",
  },
  {
    title: "Levensboom en voortgang",
    body: "Je reeks (streak), XP, niveau, badges en de keuzes voor je Levensboom. Alleen als je zelf een openbaar profiel aanzet, zijn je voornaam, je Levensboom, niveau en badges zichtbaar voor iedereen met de link.",
  },
  {
    title: "Groepen (website)",
    body: "De groepen waarvan je lid bent, je berichten en reacties, notities die je met een groep deelt en je voortgang in de groep. De andere leden van die groep zien je naam, profielfoto, berichten en voortgang.",
  },
  {
    title: "AI-assistent",
    body: "Je vraag, de eerdere berichten in hetzelfde gesprek en het hoofdstuk waar je bent (boek, hoofdstuk, vertaling en de tekst daarvan). We tellen per dag hoeveel vragen je stelt, voor de daglimiet. Meld je een antwoord met AI-antwoord melden, dan bewaren we de reden, je eventuele toelichting, je vraag, het AI-antwoord, waar in de app het stond, het AI-model, het platform, de app-versie en je apptype, gekoppeld aan je account (met naam en e-mailadres).",
  },
  {
    title: "Feedback",
    body: "Je bericht, beoordeling of antwoorden op korte vragen, de pagina waar je was, je browser- of apptype en context zoals de studie of les, het platform, de app-versie en grove categorieën (bijvoorbeeld hoe lang je BijbelStudie al gebruikt). Geef je feedback zonder account, dan alleen de naam en het e-mailadres die je zelf invult.",
  },
  {
    title: "Abonnementen en aankopen",
    body: "Of je Pro hebt, via welk platform (App Store, Google Play of de website), de status, looptijd en einddatum. Bij een abonnement via de website ook je klant- en abonnementsnummer bij Stripe en, als je opzegt, de reden die je opgeeft. Je kaart- of betaalgegevens komen nooit bij ons: die verwerken Apple, Google of Stripe.",
  },
  {
    title: "Gebruiksstatistieken",
    body: "We meten zelf een beperkt aantal gebeurtenissen: welk soort pagina je opent (zonder hoofdstuk of zoekterm), klikken op bepaalde knoppen en de stappen rond een abonnement (prijzen bekeken, plan gekozen, aankoop gestart, voltooid of afgebroken). Een gebeurtenis bevat alleen vaste waarden, zoals het platform of de gekozen looptijd, en nooit vrije tekst of je IP-adres. Ben je ingelogd, dan is ze gekoppeld aan je account; op de website zonder account aan een willekeurig nummer in je browser. De laadsnelheid van de website meten we anoniem met Vercel Speed Insights.",
  },
  {
    title: "Technische gegevens",
    body: "Bij elk verzoek verwerkt onze server je IP-adres, je browser- of apptype en de opgevraagde pagina; die staan kort in de serverlogs van onze hostingpartij. Je IP-adres gebruiken we ook om misbruik te beperken (een maximum aantal verzoeken per uur of dag). Bij inloggen in de app slaan we het platform (iOS of Android) op bij je inlogsessie.",
  },
  {
    title: "Overig",
    body: "De tekst die je op de website laat voorlezen. Je e-mailadres als je een link aanvraagt om je wachtwoord te herstellen. Wat je ons zelf per e-mail stuurt, om je vraag te beantwoorden.",
  },
];

const DEVICE_ONLY = [
  "Je inloggegevens voor de app, in de beveiligde opslag van je telefoon (Keychain of Keystore)",
  "Gedownloade hoofdstukken en commentaren, zodat je offline kunt lezen",
  "Je recente zoekopdrachten. Een zoekopdracht gaat wel naar onze server om resultaten te vinden, maar we slaan hem daar niet op",
  "Wijzigingen die nog niet zijn gesynchroniseerd",
  "Herinneringen en meldingen: die plant de app op je apparaat in. We gebruiken geen pushdienst",
  "Instellingen die alleen voor dit apparaat gelden, zoals het thema, en of we je al eens vroegen de app te beoordelen",
];

const BASES: Item[] = [
  {
    title: "Uitvoering van de overeenkomst",
    body: "Je account aanmaken en inloggen; je notities, markeringen, voortgang en Levensboom opslaan en tussen je apparaten synchroniseren; groepen; antwoorden van de AI-assistent; voorlezen; Pro-toegang leveren en je abonnement beheren; de e-mail om je wachtwoord te herstellen.",
  },
  {
    title: "Gerechtvaardigd belang",
    body: "Beveiliging en het beperken van misbruik (serverlogs, limieten per IP-adres, inlogsessies); een tijdelijke beveiligingskopie van een verwijderd account, zodat een onterechte verwijdering te herstellen is; BijbelStudie verbeteren met onze eigen gebruiksstatistieken, je feedback en meldingen over AI-antwoorden; de laadsnelheid meten. Deze verwerkingen zijn beperkt gehouden. Je kunt er bezwaar tegen maken.",
  },
  {
    title: "Toestemming",
    body: "Meldingen en herinneringen op je apparaat (via de toestemming van iOS of Android), een openbaar Levensboom-profiel en contactgegevens die je vrijwillig bij feedback invult. Je kunt je toestemming altijd intrekken, bijvoorbeeld door meldingen of je openbare profiel uit te zetten.",
  },
  {
    title: "Wettelijke plicht",
    body: "We bewaren de administratie van betalingen via de website zolang de fiscale bewaarplicht dat vereist.",
  },
];

type Recipient = { name: string; role: string; data: string; location: string };

const RECIPIENTS: Recipient[] = [
  {
    name: "Vercel Inc.",
    role: "Hosting van de website en de server van de app, serverlogs en Speed Insights",
    data: "Alle verzoeken, inclusief IP-adres en browser- of apptype",
    location: "Verenigde Staten",
  },
  {
    name: "MongoDB Inc. (MongoDB Atlas)",
    role: "Database",
    data: "Alles wat we volgens dit beleid opslaan",
    location: "Verenigde Staten",
  },
  {
    name: "Google (Gemini API)",
    role: "Antwoorden van de AI-assistent",
    data: "Je vraag, het gesprek en het hoofdstuk waarover je vraagt. Geen naam, e-mailadres of account-ID",
    location: "Verenigde Staten",
  },
  {
    name: "Google (Cloud Text-to-Speech)",
    role: "Voorlezen op de website",
    data: "De tekst die wordt voorgelezen. Geen accountgegevens",
    location: "Verenigde Staten",
  },
  {
    name: "Resend Inc.",
    role: "E-mail om je wachtwoord te herstellen",
    data: "Je e-mailadres, naam en de inhoud van de e-mail",
    location: "Verenigde Staten",
  },
  {
    name: "RevenueCat Inc.",
    role: "Abonnementen in de app",
    data: "Je account-ID (een nummer), aankoop- en abonnementsgegevens van Apple of Google, en app- en apparaatinformatie zoals platform, app-versie en land",
    location: "Verenigde Staten",
  },
  {
    name: "Stripe",
    role: "Betalingen en abonnementen op de website",
    data: "Je e-mailadres, betaalgegevens en abonnement. Stripe is voor een deel ook zelf verantwoordelijk, bijvoorbeeld voor fraudebestrijding",
    location: "Ierland en Verenigde Staten",
  },
];

const RETENTION: Item[] = [
  {
    title: "Account, profiel, instellingen, notities, markeringen, bladwijzers, leesgeschiedenis, voortgang, Levensboom en groepsberichten",
    body: "Zolang je account bestaat. Verwijder je je account, dan wissen we ze direct.",
  },
  {
    title: "Beveiligingskopie van een verwijderd account",
    body: "90 dagen. Daarna wordt de kopie automatisch en definitief gewist.",
  },
  {
    title: "Inlogsessies",
    body: "In de app verloopt een sessie 90 dagen na het laatste gebruik; de sessiegegevens wissen we automatisch 30 dagen na het verlopen. Op de website verloopt je sessie 30 dagen na je laatste bezoek. Uitloggen of je account verwijderen beëindigt je sessies direct.",
  },
  {
    title: "Verwijderde notities, markeringen en bladwijzers",
    body: "Een kenmerk dat iets is verwijderd, zodat je andere apparaten dat ook doen: 180 dagen, daarna automatisch gewist.",
  },
  {
    title: "AI-assistent",
    body: "Gesprekken bewaren we niet bij je account; het aantal vragen per dag wel, zolang je account bestaat. Korte eerste vragen bewaren we met het antwoord maximaal 1 jaar in een cache zonder koppeling aan jou, zodat dezelfde vraag bij hetzelfde hoofdstuk niet opnieuw naar de AI gaat.",
  },
  {
    title: "Feedback en meldingen over AI-antwoorden",
    body: "Maximaal 2 jaar gekoppeld aan jou. Daarna, of direct als je je account verwijdert, halen we je account, naam, e-mailadres, contactgegevens en browser- of apptype weg, en bij een melding over een AI-antwoord ook je vraag en toelichting. De reden en het AI-antwoord blijven bewaard, net als wat je in gewone feedback hebt geschreven. Zet daar dus geen persoonlijke gegevens in, of vraag ons de tekst te verwijderen.",
  },
  {
    title: "Gebruiksstatistieken",
    body: "400 dagen, daarna automatisch gewist. Verwijder je je account, dan koppelen we ze direct los.",
  },
  {
    title: "Link om je wachtwoord te herstellen",
    body: "1 uur geldig.",
  },
  {
    title: "IP-adressen voor het beperken van misbruik",
    body: "Alleen in het werkgeheugen van de server, maximaal 24 uur. Serverlogs bewaart Vercel kort, volgens zijn eigen logtermijnen.",
  },
  {
    title: "Betalingen via de website",
    body: "De betalingsadministratie bij Stripe bewaren we 7 jaar, vanwege de fiscale bewaarplicht.",
  },
];

const RIGHTS = [
  "Inzage: vragen welke gegevens we van je hebben.",
  "Correctie: je naam, profiel en instellingen pas je zelf aan; voor andere gegevens helpen we je.",
  "Verwijdering: je hele account, of losse notities, markeringen en bladwijzers, die je zelf kunt wissen.",
  "Beperking: vragen dat we je gegevens tijdelijk niet gebruiken.",
  "Overdraagbaarheid: je gegevens ontvangen in een gangbaar, machineleesbaar bestand.",
  "Bezwaar: tegen verwerking op basis van ons gerechtvaardigd belang, zoals de gebruiksstatistieken.",
  "Toestemming intrekken: voor alles wat op toestemming berust.",
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

function ItemList({ items }: { items: Item[] }) {
  return (
    <div className="mt-2 space-y-3">
      {items.map((item) => (
        <div key={item.title}>
          <h3 className="text-[13.5px] font-semibold text-ink">{item.title}</h3>
          <p className={bodyClass}>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

const bodyClass = "break-words text-[13.5px] leading-[1.7] text-ink-body";
const linkClass = "font-semibold text-teal hover:text-teal-dark dark:text-teal-400 dark:hover:text-teal-300";

function Mail() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
      {SUPPORT_EMAIL}
    </a>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <PublicFrame
      eyebrow="Privacy"
      title="Privacybeleid"
      lead={
        <>
          Welke gegevens BijbelStudie verwerkt, waarom, met wie we ze delen, hoe lang we ze bewaren en welke rechten je
          hebt. Dit beleid geldt voor de website www.bijbelstudie.io en de BijbelStudie-app voor iPhone, iPad en
          Android. Laatst bijgewerkt: {LAST_UPDATED}.
        </>
      }
    >
      <Card>
        <CardTitle>In het kort</CardTitle>
        <ul className={`${bodyClass} mt-2 list-disc space-y-1 pl-5`}>
          <li>We verkopen je gegevens niet en tonen geen advertenties.</li>
          <li>Geen advertentie- of trackingcookies en geen trackingdiensten van derden.</li>
          <li>Je vragen aan de AI-assistent gaan naar Google (Gemini) om een antwoord te maken, zonder je naam of e-mailadres.</li>
          <li>
            Je kunt je account en alle bijbehorende gegevens altijd verwijderen, in de app of via{" "}
            <Link href="/account-verwijderen" className={linkClass}>
              bijbelstudie.io/account-verwijderen
            </Link>
            .
          </li>
        </ul>
      </Card>

      <Card>
        <CardTitle>1. Wie wij zijn</CardTitle>
        <p className={`${bodyClass} mt-1`}>
          BijbelStudie is verantwoordelijk voor de verwerking van je persoonsgegevens zoals in dit beleid beschreven. De
          website en de app delen één account, dus dit beleid geldt voor allebei. Vragen over privacy stuur je naar{" "}
          <Mail />.
        </p>
      </Card>

      <Card>
        <CardTitle>2. Welke gegevens we verwerken</CardTitle>
        <ItemList items={DATA} />
        <h3 className="mt-4 text-[13.5px] font-semibold text-ink">Over je geloof</h3>
        <p className={bodyClass}>
          We vragen niet naar je geloofsovertuiging. Toch kan het gebruik van een bijbelstudie-app, en wat je schrijft in
          notities, groepsberichten of vragen aan de AI, iets zeggen over je levensbeschouwing. We gebruiken die gegevens
          alleen om de functies te leveren die je zelf gebruikt. We maken er geen profielen van en gebruiken of delen ze
          niet voor andere doelen.
        </p>
      </Card>

      <Card>
        <CardTitle>3. Gegevens die alleen op je apparaat blijven</CardTitle>
        <p className={`${bodyClass} mt-1`}>De app bewaart dit alleen op je telefoon of tablet. Verwijder je de app, dan is het weg.</p>
        <ul className={`${bodyClass} mt-2 list-disc space-y-1 pl-5`}>
          {DEVICE_ONLY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>4. Waarvoor we gegevens gebruiken, en op welke grond</CardTitle>
        <ItemList items={BASES} />
        <p className={`${bodyClass} mt-3`}>
          We gebruiken je gegevens niet voor advertenties, verkopen ze niet en nemen geen besluiten over je die alleen op
          automatische verwerking berusten en die je in aanmerkelijke mate treffen.
        </p>
      </Card>

      <Card>
        <CardTitle>5. De AI-assistent</CardTitle>
        <ul className={`${bodyClass} mt-2 list-disc space-y-1 pl-5`}>
          <li>
            Je vraag, de eerdere berichten in hetzelfde gesprek en het hoofdstuk waarover je vraagt, gaan naar de Gemini
            API van Google. Je naam, e-mailadres en account-ID sturen we niet mee.
          </li>
          <li>
            We gebruiken de betaalde Gemini API. Volgens de voorwaarden van Google gebruikt Google die gegevens dan niet
            om zijn producten of AI-modellen te verbeteren. Google bewaart ze wel een beperkte tijd om misbruik op te
            sporen en aan wettelijke verplichtingen te voldoen.
          </li>
          <li>Zet geen persoonlijke gegevens van jezelf of anderen in je vraag.</li>
          <li>
            Antwoorden van de AI kunnen onjuist of onvolledig zijn. Lees ze kritisch en leg ze naast de Bijbel zelf. Klopt
            een antwoord niet, of is het ongepast? Gebruik dan <strong>AI-antwoord melden</strong> bij het antwoord.
          </li>
        </ul>
      </Card>

      <Card>
        <CardTitle>6. Met wie we gegevens delen</CardTitle>
        <p className={`${bodyClass} mt-1`}>
          We verkopen je gegevens niet. Deze dienstverleners verwerken gegevens in onze opdracht:
        </p>
        <div className="mt-2 space-y-3">
          {RECIPIENTS.map((r) => (
            <div key={r.name}>
              <h3 className="text-[13.5px] font-semibold text-ink">{r.name}</h3>
              <p className={bodyClass}>
                {r.role}. Gegevens: {r.data}. Locatie: {r.location}.
              </p>
            </div>
          ))}
        </div>
        <h3 className="mt-4 text-[13.5px] font-semibold text-ink">Zelfstandige partijen</h3>
        <ul className={`${bodyClass} list-disc space-y-1 pl-5`}>
          <li>
            <strong>Apple en Google</strong>, als je met hen inlogt of via de App Store of Google Play koopt. Zij
            verwerken dat onder hun eigen privacybeleid; wij ontvangen alleen wat hierboven staat.
          </li>
          <li>
            <strong>Wikimedia Foundation</strong>: sommige foto&apos;s bij studies laadt de app rechtstreeks van
            Wikimedia Commons. Wikimedia ziet daarbij je IP-adres, zoals bij elke website.
          </li>
          <li>
            <strong>Andere gebruikers</strong>: leden van je groepen, en iedereen met de link als je een openbaar
            Levensboom-profiel aanzet.
          </li>
          <li>
            <strong>Overheidsinstanties</strong>, alleen als de wet ons daartoe verplicht.
          </li>
        </ul>
        <p className={`${bodyClass} mt-3`}>
          Bijbelteksten, commentaren en de dagtekst halen we op bij onze eigen dienst bijbelapi.com. Daarbij gaan geen
          persoonsgegevens mee.
        </p>
        <h3 className="mt-4 text-[13.5px] font-semibold text-ink">Buiten de Europese Unie</h3>
        <p className={bodyClass}>
          Een deel van deze partijen verwerkt gegevens in de Verenigde Staten. Dat mag op grond van het EU-VS Data
          Privacy Framework, voor partijen die daarbij zijn aangesloten, of op grond van de standaardcontractbepalingen
          van de Europese Commissie in de verwerkersovereenkomst met die partij.
        </p>
      </Card>

      <Card>
        <CardTitle>7. Hoe lang we gegevens bewaren</CardTitle>
        <ItemList items={RETENTION} />
        <p className={`${bodyClass} mt-3`}>
          Apple, Google, RevenueCat en Stripe bewaren hun eigen administratie van aankopen volgens hun eigen termijnen.
        </p>
      </Card>

      <Card>
        <CardTitle>8. Je account verwijderen</CardTitle>
        <ul className={`${bodyClass} mt-2 list-disc space-y-1 pl-5`}>
          <li>
            <strong>In de app:</strong> Profiel &gt; Account verwijderen. Je account en gegevens worden meteen
            verwijderd.
          </li>
          <li>
            <strong>Zonder de app:</strong> mail <Mail /> met als onderwerp &quot;Account verwijderen&quot;. We
            verwijderen je account binnen 30 dagen en laten het je weten.
          </li>
          <li>Een abonnement stopt niet vanzelf: zeg het apart op waar je het hebt afgesloten.</li>
        </ul>
        <p className={`${bodyClass} mt-2`}>
          Wat we precies verwijderen en wat anoniem blijft, staat op{" "}
          <Link href="/account-verwijderen" className={linkClass}>
            Account verwijderen
          </Link>
          .
        </p>
      </Card>

      <Card>
        <CardTitle>9. Je rechten</CardTitle>
        <ul className={`${bodyClass} mt-2 list-disc space-y-1 pl-5`}>
          {RIGHTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className={`${bodyClass} mt-2`}>
          Stuur je verzoek naar <Mail />. We kunnen je vragen te bevestigen dat het account van jou is, en reageren
          binnen een maand. Ben je het niet eens met hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de{" "}
          <a href="https://autoriteitpersoonsgegevens.nl" rel="noopener" className={linkClass}>
            Autoriteit Persoonsgegevens
          </a>
          .
        </p>
      </Card>

      <Card>
        <CardTitle>10. Cookies en opslag in je browser</CardTitle>
        <p className={`${bodyClass} mt-1`}>De website gebruikt alleen deze cookies:</p>
        <ul className={`${bodyClass} mt-2 list-disc space-y-1 pl-5`}>
          <li>
            <strong>Inlogcookies</strong> (next-auth): houden je ingelogd en beveiligen het inloggen. Tot 30 dagen na je laatste bezoek.
          </li>
          <li>
            <strong>Taal</strong> (i18next): de taal van de website. 1 jaar.
          </li>
          <li>
            <strong>Startpagina gezien</strong> (bs_seen_landing): zonder account slaan we de introductie over als je die
            al hebt gezien. 1 jaar.
          </li>
        </ul>
        <p className={`${bodyClass} mt-2`}>
          In de opslag van je browser bewaren we daarnaast een willekeurig nummer voor onze eigen statistieken
          (bs_anon_id) en instellingen zoals je gekozen commentaar en voorleesstem. Er zijn geen cookies van derden;
          Vercel Speed Insights werkt zonder cookies. Omdat we alleen noodzakelijke cookies en eigen statistieken met
          weinig gevolgen voor je privacy gebruiken, vragen we geen cookietoestemming. Je kunt cookies en opgeslagen
          gegevens altijd wissen in je browser; daarna ben je uitgelogd. De app gebruikt geen cookies.
        </p>
      </Card>

      <Card>
        <CardTitle>11. Kinderen</CardTitle>
        <p className={`${bodyClass} mt-1`}>
          BijbelStudie is bedoeld voor mensen van 16 jaar en ouder. Ben je jonger dan 16, gebruik BijbelStudie dan alleen
          met toestemming van je ouder of voogd. Blijkt dat we zonder die toestemming gegevens hebben van iemand onder de
          16, dan verwijderen we die. Ouders kunnen hiervoor mailen naar <Mail />.
        </p>
      </Card>

      <Card>
        <CardTitle>12. Beveiliging</CardTitle>
        <ul className={`${bodyClass} mt-2 list-disc space-y-1 pl-5`}>
          <li>Alle verbindingen van de website en de app lopen via HTTPS.</li>
          <li>
            Wachtwoorden slaan we op als bcrypt-hash. De app bewaart je inlogtokens in de beveiligde opslag van je
            apparaat; onze server bewaart daarvan alleen een hash.
          </li>
          <li>Alleen de beheerder heeft toegang tot de productiedatabase.</li>
          <li>We beperken het aantal verzoeken per IP-adres en per account om misbruik tegen te gaan.</li>
          <li>
            Bij een datalek met risico&apos;s voor je privacy melden we dat aan de Autoriteit Persoonsgegevens en, als
            dat nodig is, aan jou.
          </li>
        </ul>
      </Card>

      <Card>
        <CardTitle>13. Wijzigingen</CardTitle>
        <p className={`${bodyClass} mt-1`}>
          Verandert BijbelStudie, dan passen we dit beleid aan. Bovenaan staat wanneer het voor het laatst is bijgewerkt.
          Belangrijke wijzigingen maken we duidelijk zichtbaar in de app of op de website.
        </p>
      </Card>

      <Card>
        <CardTitle>14. Contact</CardTitle>
        <p className={`${bodyClass} mt-1`}>
          Vragen over dit beleid of over je gegevens? Mail <Mail />.
        </p>
      </Card>
    </PublicFrame>
  );
}
