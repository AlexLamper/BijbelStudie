import type { Guide } from "./types";

/** /bijbelstudie/gratis - target: "gratis bijbelstudie", "gratis bijbelstudie materiaal". */
export const GUIDE_FREE: Guide = {
  slug: "gratis",
  path: "/bijbelstudie/gratis",
  metadataKey: "guideFree",
  h1: "Gratis bijbelstudie: alles wat gratis kan",
  intro:
    "Een eerlijk overzicht van wat je zonder te betalen kunt gebruiken voor bijbelstudie in het Nederlands: vertalingen, commentaren, de grondtekst, begeleide studies en publiek-domein bibliotheken.",
  datePublished: "2026-08-21",
  dateModified: "2026-08-21",
  readingMinutes: 9,
  sections: [
    {
      id: "waarom-gratis-kan",
      heading: "Waarom zoveel bijbelstudiemateriaal gratis is",
      body: [
        "Dat er zoveel gratis beschikbaar is, is geen liefdadigheid maar auteursrecht. In Nederland vervalt het auteursrecht zeventig jaar na de dood van de maker. Alles wat daarvoor ligt is publiek domein: iedereen mag het lezen, kopiëren en publiceren.",
        "Voor bijbelstudie is dat buitengewoon gunstig, want een groot deel van het klassieke materiaal valt in die categorie. De Statenvertaling uit 1637, de commentaren van Matthew Henry, de prekenbundels van de Nadere Reformatie, de oude psalmberijmingen - stuk voor stuk vrij te gebruiken.",
        "Wat níet gratis is, zijn moderne vertalingen en recente commentaren. Die vallen nog onder auteursrecht, en waar ze online staan is dat op grond van een licentie.",
      ],
    },
    {
      id: "gratis-vertalingen",
      heading: "Gratis bijbelvertalingen in het Nederlands",
      body: [
        "Voor studie is het nuttig meerdere vertalingen naast elkaar te leggen. Deze zijn in het Nederlands vrij beschikbaar.",
      ],
      list: [
        {
          title: "Statenvertaling (1637)",
          text: "Publiek domein. Zeer brontekstgetrouw en daarom uitstekend voor structuurstudie; het taalgebruik vraagt gewenning. De standaardreferentie voor Nederlandse bijbelstudie.",
        },
        {
          title: "De Heilige Schrift 1917",
          text: "Publiek domein. Een vertaling uit de vroege twintigste eeuw, toegankelijker dan de Statenvertaling maar nog steeds tamelijk letterlijk.",
        },
        {
          title: "Canisiusbijbel 1939",
          text: "Rooms-katholieke vertaling, vrij beschikbaar. Interessant om naast een protestantse vertaling te leggen omdat vertaalkeuzes soms opvallend anders uitvallen.",
        },
        {
          title: "Engelse vertalingen",
          text: "King James Version, American Standard Version, World English Bible, Geneva Bible en Coverdale Bible zijn allemaal vrij. Voor wie Engels leest, verbreedt dat het vergelijkingsmateriaal aanzienlijk.",
        },
      ],
      callout:
        "Op BijbelStudie zijn deze vertalingen gratis te lezen en naast elkaar te vergelijken. De NBG-vertaling 1951 is beschikbaar onder licentie van het Nederlands-Vlaams Bijbelgenootschap.",
    },
    {
      id: "gratis-commentaren",
      heading: "Gratis bijbelcommentaren",
      body: [
        "Een commentaar vertelt je wat je zelf niet kon weten: historische achtergrond, parallellen, en hoe anderen het gedeelte door de eeuwen heen hebben uitgelegd. De eerste drie hieronder zijn publiek domein; KingComments is hedendaags en door de auteur vrij beschikbaar gesteld.",
      ],
      list: [
        {
          title: "Matthew Henry (1662-1714)",
          text: "Het bekendste commentaar op de hele Bijbel, ook in Nederlandse vertaling. Toegankelijk, verhalend en sterk op toepassing gericht. Minder geschikt voor technische exegese.",
        },
        {
          title: "Karl August Dachsel (1818-1893)",
          text: "Een uitgebreid Duits commentaar in Nederlandse vertaling, vers voor vers en met veel aandacht voor de grondtekst.",
        },
        {
          title: "Heinrich Meyer (1800-1873)",
          text: "Kritisch-exegetisch commentaar op het Nieuwe Testament, technischer van aard en nuttig als je wilt weten wat de grammatica van een vers toelaat.",
        },
        {
          title: "KingComments",
          text: "Een hedendaags Nederlandstalig commentaar op de hele Bijbel van Ger de Koning, vrij online beschikbaar gesteld door de auteur. Op BijbelStudie is het voor iedereen gratis en volledig te lezen.",
        },
      ],
    },
    {
      id: "grondtekst",
      heading: "De grondtekst, gratis",
      body: [
        "Dat de Hebreeuwse en Griekse grondtekst tegenwoordig gratis en met woordanalyse beschikbaar is, is een van de grootste veranderingen in bijbelstudie van de laatste twee decennia. Projecten zoals STEPBible stellen volledig geannoteerde teksten onder een open licentie beschikbaar.",
        "Praktisch betekent dat: je kunt bij elk vers zien welk Hebreeuws of Grieks woord onder de Nederlandse vertaling ligt, wat de grondvorm is, en waar datzelfde woord elders voorkomt. Dat was tot voor kort voorbehouden aan wie een theologische opleiding en een plank vol naslagwerken had.",
      ],
    },
    {
      id: "gratis-op-bijbelstudie",
      heading: "Wat op BijbelStudie gratis is",
      body: [
        "Om eerlijk te zijn over waar de grens ligt: hieronder staat precies wat het gratis account biedt en wat niet. Er is geen creditcard nodig om te beginnen en er zit geen proefperiode aan vast die stilzwijgend overgaat in een abonnement.",
      ],
      list: [
        {
          title: "Gratis: de Bijbel lezen",
          text: "Alle beschikbare Nederlandse, Engelse en Duitse vertalingen, met de mogelijkheid ze naast elkaar te vergelijken.",
        },
        {
          title: "Gratis: begeleide studies",
          text: "Tien begeleide studies, stap voor stap door een gedeelte, met voortgang en streak.",
        },
        {
          title: "Gratis: notities en markeringen",
          text: "Onbeperkt notities per hoofdstuk en vers, doorzoekbaar en op elk apparaat beschikbaar.",
        },
        {
          title: "Gratis: begeleide studies",
          text: "Tien uitgewerkte studies over personen, gedeelten, onderwerpen en bijbelboeken.",
        },
        {
          title: "Gratis: de bibliotheek",
          text: "Publiek-domein bijbels, prekenbundels, commentaren en dogmatische werken, zonder account te bekijken.",
        },
        {
          title: "Gratis: 5 AI-vragen per dag",
          text: "De AI-assistent is elke dag vijf vragen lang beschikbaar zonder abonnement.",
        },
        {
          title: "Gratis: het KingComments-commentaar",
          text: "Het vers-voor-vers commentaar van Ger de Koning is volledig en zonder abonnement te lezen, bij elk hoofdstuk.",
        },
        {
          title: "Pro: de overige commentaren, meer AI en de grondtekst",
          text: "€9,99 per maand of €89,99 per jaar. Alleen nodig als je die onderdelen wilt gebruiken - de rest hierboven blijft gratis.",
        },
      ],
    },
    {
      id: "externe-bronnen",
      heading: "Gratis bronnen buiten deze site",
      body: [
        "Een eerlijk overzicht noemt ook wat elders staat. Deze Nederlandse en internationale archieven zijn gratis, betrouwbaar en de moeite waard.",
      ],
      list: [
        {
          title: "DBNL",
          text: "De Digitale Bibliotheek voor de Nederlandse Letteren bevat een groot deel van de Nederlandse theologische literatuur uit de zestiende tot negentiende eeuw, volledig doorzoekbaar.",
        },
        {
          title: "Delpher",
          text: "Gedigitaliseerde Nederlandse boeken, kranten en tijdschriften van de Koninklijke Bibliotheek. Nuttig voor kerkhistorische context.",
        },
        {
          title: "Project Gutenberg en Archive.org",
          text: "Internationale archieven met een groot aanbod aan publiek-domein theologie, vooral Engelstalig.",
        },
        {
          title: "STEPBible",
          text: "Open bijbeldata met grondtekst, woordanalyse en concordantiegegevens onder een Creative Commons-licentie.",
        },
      ],
      callout:
        "Een selectie uit deze archieven is direct doorzoekbaar in de bibliotheek op deze site, met per werk vermeld waarom het publiek domein is.",
    },
  ],
  faqs: [
    {
      q: "Is bijbelstudie online echt gratis?",
      a: "Voor een groot deel wel. Bijbel lezen in meerdere vertalingen, notities maken, begeleide studies doorlopen, het KingComments-commentaar lezen en de publiek-domein bibliotheek raadplegen kan zonder te betalen. Op BijbelStudie is daarnaast elke dag vijf keer de AI-assistent te gebruiken. Alleen de overige bijbelcommentaren, de ruimere AI-limiet en de volledige grondtekst zitten in het betaalde Pro-abonnement.",
    },
    {
      q: "Welke bijbelvertalingen zijn gratis te gebruiken?",
      a: "In het Nederlands zijn de Statenvertaling (1637), De Heilige Schrift 1917 en de Canisiusbijbel 1939 publiek domein. In het Engels onder meer de King James Version, de American Standard Version, de World English Bible, de Geneva Bible en de Coverdale Bible. Moderne vertalingen vallen nog onder auteursrecht en zijn alleen onder licentie beschikbaar.",
    },
    {
      q: "Zijn gratis bijbelcommentaren betrouwbaar?",
      a: "Ze zijn gratis omdat het auteursrecht is vervallen of omdat de auteur ze zelf vrijgeeft, niet omdat ze van mindere kwaliteit zijn. Matthew Henry, Dachsel en Meyer worden nog altijd geraadpleegd, en KingComments is een hedendaags commentaar dat de auteur vrij beschikbaar stelt. Wel zijn het commentaren van hun eigen tijd: ze kennen archeologische en tekstkritische vondsten van na hun overlijden niet. Lees ze als een goed geïnformeerde gesprekspartner, niet als het laatste woord.",
    },
    {
      q: "Heb ik een account nodig om gratis te beginnen?",
      a: "Voor bijbellezen, notities en voortgang wel, omdat je voortgang aan je account gekoppeld wordt. Aanmelden kost minder dan een minuut en er is geen creditcard voor nodig. De bibliotheek en de begeleide studies zijn zonder account te bekijken.",
    },
  ],
  related: [
    {
      href: "/bijbelstudie",
      label: "Bijbelstudie: de complete gids",
      description: "De hoofdgids met methoden, hulpmiddelen en valkuilen.",
    },
    {
      href: "/bijbelstudie/beginnen",
      label: "Bijbelstudie voor beginners",
      description: "Een stappenplan van dertig dagen.",
    },
    {
      href: "/hulpbronnen",
      label: "Bibliotheek",
      description: "De publiek-domein werken die op deze site te lezen zijn.",
    },
    {
      href: "/abonnement",
      label: "Wat kost Pro?",
      description: "Wat er in het betaalde abonnement zit en wat gratis blijft.",
    },
  ],
};
