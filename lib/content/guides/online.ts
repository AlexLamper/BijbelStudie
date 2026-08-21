import type { Guide } from "./types";

/** /bijbelstudie/online - target: "online bijbelstudie", "bijbel studie online". */
export const GUIDE_ONLINE: Guide = {
  slug: "online",
  path: "/bijbelstudie/online",
  metadataKey: "guideOnline",
  h1: "Online bijbelstudie: wat digitaal beter kan",
  intro:
    "Wat levert online bijbelstudie op ten opzichte van een papieren bijbel, waar is papier nog steeds beter, en hoe zet je een digitale werkwijze op die je een jaar volhoudt.",
  datePublished: "2026-08-21",
  dateModified: "2026-08-21",
  readingMinutes: 11,
  sections: [
    {
      id: "wat-verandert",
      heading: "Wat verandert er als je online studeert?",
      body: [
        "Twintig jaar geleden was een serieuze bijbelstudie een kwestie van een plank vol boeken: meerdere vertalingen, een concordantie, een bijbelatlas, een woordenboek en een paar commentaren. Alles wat op die plank stond, is nu binnen één zoekopdracht bereikbaar.",
        "Dat verandert vooral wat je durft te vragen. Bij een papieren concordantie kost het opzoeken van elke vindplaats van één woord een half uur, en dus vraag je het niet. Online kost het twintig seconden, en dus vraag je het wel - en daar begint het interessante deel van bijbelstudie meestal.",
        "De keerzijde is even reëel. Een scherm is een apparaat dat ook duizend andere dingen kan, en de aandacht die bijbelstudie vraagt is precies wat een scherm het slechtst beschermt.",
      ],
    },
    {
      id: "vijf-voordelen",
      heading: "Vijf dingen die digitaal aantoonbaar beter gaan",
      body: [
        "Niet alles is beter online. Deze vijf wel, en ze zijn de reden dat vrijwel elke serieuze bijbelstudent tegenwoordig gemengd werkt.",
      ],
      list: [
        {
          title: "Vertalingen naast elkaar",
          text: "Twee of drie vertalingen in kolommen naast elkaar laten in één oogopslag zien waar vertalers een keuze moesten maken. Op papier betekent dat drie boeken open en heen en weer bladeren; op een scherm is het één klik. Juist op de plekken waar vertalingen uiteenlopen zit de vraag die je studie verder brengt.",
        },
        {
          title: "Commentaar bij het vers",
          text: "Een papieren commentaar dwingt je het gedeelte op te zoeken en de plaats in je bijbel kwijt te raken. Digitaal staat de uitleg naast het vers dat je leest, wat het verschil maakt tussen een commentaar dat je af en toe pakt en een commentaar dat je werkelijk gebruikt.",
        },
        {
          title: "De grondtekst zonder taalstudie",
          text: "Een interlineaire weergave lijnt het Hebreeuwse of Griekse woord uit met de Nederlandse vertaling. Je hoeft de taal niet te beheersen om te zien dat één Nederlands woord twee verschillende originelen vertaalt - het inzicht waar woordstudie op draait, zonder de jaren studie die daar vroeger voor nodig waren.",
        },
        {
          title: "Zoeken in plaats van bladeren",
          text: "Een thematische studie is met een zoekfunctie een kwestie van minuten in plaats van avonden. Belangrijker nog: je kunt op meerdere woorden tegelijk zoeken, wat de selectieve blik van een thematische studie flink corrigeert.",
        },
        {
          title: "Doorzoekbare notities",
          text: "Aantekeningen in de kantlijn van een papieren bijbel zijn na een jaar niet terug te vinden. Digitale notities per hoofdstuk zijn dat wel, en je eigen studie van vorig jaar wordt daarmee zelf een hulpmiddel.",
        },
      ],
    },
    {
      id: "waar-papier-wint",
      heading: "Waar papier nog steeds wint",
      body: [
        "Het zou oneerlijk zijn te doen alsof digitaal op elk punt beter is. Drie dingen gaan op papier structureel beter, en het is verstandig daar rekening mee te houden.",
      ],
      list: [
        {
          title: "Overzicht over een heel boek",
          text: "Fysiek bladeren geeft een ruimtelijk gevoel voor waar iets staat dat scrollen niet oplevert. Wie een boekstudie doet, doet er goed aan de eerste doorlezing op papier te doen.",
        },
        {
          title: "Aandacht vasthouden",
          text: "Een papieren bijbel kan geen melding tonen. Voor lange, geconcentreerde sessies is dat een reëel voordeel - tenzij je meldingen uitzet, wat de eenvoudigste oplossing is.",
        },
        {
          title: "Onthouden waar je las",
          text: "Onderzoek naar leesbegrip laat consequent zien dat mensen op papier beter onthouden wáár iets stond. Voor wie teksten uit het hoofd wil leren, blijft papier de betere ondergrond.",
        },
      ],
      callout:
        "De praktische conclusie voor de meeste mensen: lees op papier, studeer op een scherm, en houd je notities digitaal.",
    },
    {
      id: "werkwijze",
      heading: "Een digitale werkwijze die je volhoudt",
      body: [
        "Online bijbelstudie mislukt zelden op de techniek. Het mislukt op de opzet: te veel tabbladen, geen vaste plek voor notities, en een scherm dat halverwege iets anders gaat doen. Onderstaande opzet werkt voor de meeste mensen.",
      ],
      steps: [
        {
          title: "Zet meldingen uit voordat je begint",
          text: "Niet halverwege. De onderbreking kost meer dan de melding waard is.",
        },
        {
          title: "Werk met twee panelen, niet met tien tabbladen",
          text: "Links de tekst, rechts het hulpmiddel dat je op dat moment nodig hebt - commentaar, grondtekst of notities. Meer dan twee wordt rommelig.",
        },
        {
          title: "Kies één vaste plek voor notities",
          text: "Bij voorkeur gekoppeld aan het hoofdstuk zelf, zodat je ze terugvindt zonder te zoeken.",
        },
        {
          title: "Volg een leesplan voor de ruggengraat",
          text: "Zodat de vraag 'waar zal ik beginnen' nooit de reden is dat je niet begint.",
        },
        {
          title: "Sluit af met één zin",
          text: "Elke sessie eindigt met een geschreven samenvatting. Dat is wat de sessie achteraf terugvindbaar maakt.",
        },
      ],
    },
    {
      id: "ai-assistent",
      heading: "En een AI-assistent?",
      body: [
        "Een AI-assistent is inmiddels een van de nuttigste hulpmiddelen bij bijbelstudie geworden, en tegelijk het hulpmiddel dat het makkelijkst verkeerd gebruikt wordt.",
        "Waar hij goed in is: uitleggen wat een term betekent, historische context geven, parallelplaatsen aanwijzen, en de vraag beantwoorden die je in een commentaar pas na twintig minuten zoeken had gevonden. Vooral het onderbreken-op-het-moment-zelf is winst: je hoeft je studie niet te stoppen om iets op te zoeken.",
        "Waar je voor moet oppassen: een AI klinkt even zeker bij een juist antwoord als bij een fout antwoord. Behandel elk antwoord als de mening van een goed belezen gesprekspartner, niet als een uitspraak van gezag - toets het aan de tekst zelf en aan een commentaar. En laat hem je conclusie niet overnemen: de waarde van bijbelstudie zit in het zelf zien, niet in het krijgen van een samenvatting.",
      ],
      callout:
        "Praktische regel: gebruik een AI-assistent voor de vraag 'wat moet ik weten om dit te begrijpen', niet voor de vraag 'wat betekent dit voor mij'.",
    },
    {
      id: "samen-online",
      heading: "Samen studeren op afstand",
      body: [
        "Een van de minder besproken voordelen van online bijbelstudie is dat een studiegroep niet meer in dezelfde plaats hoeft te wonen. Dat maakt een groep mogelijk voor mensen voor wie een fysieke kring geen optie is: onregelmatige diensten, beperkte mobiliteit, of eenvoudigweg geen groep in de buurt die past.",
        "Wat online groepen werkend houdt is hetzelfde als bij fysieke groepen: iedereen bereidt hetzelfde gedeelte thuis voor, en de bijeenkomst gaat over de vragen die dat opleverde. Gedeelde notities helpen daarbij aantoonbaar - je ziet waar anderen op vastliepen voordat je bij elkaar komt.",
      ],
    },
  ],
  faqs: [
    {
      q: "Is online bijbelstudie net zo goed als met een papieren bijbel?",
      a: "Voor studie is digitaal op de meeste punten in het voordeel: vertalingen naast elkaar, commentaar bij het vers, de grondtekst zonder taalkennis, zoeken in plaats van bladeren en doorzoekbare notities. Papier wint bij het overzicht over een heel boek, bij lange geconcentreerde sessies en bij het uit het hoofd leren. Veel mensen combineren: lezen op papier, studeren op een scherm.",
    },
    {
      q: "Wat heb ik nodig voor online bijbelstudie?",
      a: "Een apparaat met internet en een plek om notities te bewaren. Meerdere vertalingen, bijbelcommentaren, de grondtekst en leesplannen zijn tegenwoordig online beschikbaar, waarvan een groot deel gratis.",
    },
    {
      q: "Kan ik de grondtekst gebruiken zonder Hebreeuws of Grieks te kennen?",
      a: "Ja. Een interlineaire weergave zet het oorspronkelijke woord onder of naast de Nederlandse vertaling, zodat je kunt zien welk woord waar staat en waar hetzelfde woord elders voorkomt. Kennis van de taal maakt het rijker maar is niet nodig om er iets aan te hebben.",
    },
    {
      q: "Kun je een AI-assistent vertrouwen bij bijbelstudie?",
      a: "Gebruik hem als goed belezen gesprekspartner, niet als gezag. Een AI is sterk in achtergrond, terminologie en parallelplaatsen, maar klinkt bij een fout antwoord even zeker als bij een juist antwoord. Toets antwoorden altijd aan de tekst zelf en aan een commentaar, en laat je eigen waarneming niet vervangen door een samenvatting.",
    },
  ],
  related: [
    {
      href: "/bijbelstudie",
      label: "Bijbelstudie: de complete gids",
      description: "De hoofdgids met methoden, hulpmiddelen en valkuilen.",
    },
    {
      href: "/bijbelstudie/gratis",
      label: "Gratis bijbelstudie",
      description: "Welke online bronnen gratis te gebruiken zijn.",
    },
    {
      href: "/hulpbronnen",
      label: "Bibliotheek",
      description: "Publiek-domein bijbels, commentaren en preken om online te lezen.",
    },
    {
      href: "/bijbelboeken",
      label: "De 66 bijbelboeken",
      description: "Achtergrond en hoofdlijn per bijbelboek.",
    },
  ],
};
