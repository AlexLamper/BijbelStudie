import type { Guide } from "./types";

/** /bijbelstudie/beginnen - target: "bijbelstudie voor beginners", "hoe begin ik met bijbelstudie". */
export const GUIDE_START: Guide = {
  slug: "beginnen",
  path: "/bijbelstudie/beginnen",
  metadataKey: "guideStart",
  h1: "Bijbelstudie voor beginners: zo begin je",
  intro:
    "Nooit eerder de Bijbel bestudeerd? Dit is het plan: wat je nodig hebt, waar je begint, hoeveel tijd het kost, en een schema van dertig dagen dat van je eerste hoofdstuk een gewoonte maakt.",
  datePublished: "2026-08-21",
  dateModified: "2026-08-21",
  readingMinutes: 10,
  sections: [
    {
      id: "wat-heb-je-nodig",
      heading: "Wat je nodig hebt (en wat niet)",
      body: [
        "Er is een hardnekkig idee dat je voor bijbelstudie eerst iets moet weten. Dat klopt niet. Je hebt drie dingen nodig, en die heb je waarschijnlijk al.",
        "Wat je níet nodig hebt: een theologische opleiding, kennis van Hebreeuws of Grieks, een dure studiebijbel, of het gevoel dat je er klaar voor bent. Dat laatste komt pas ná een paar weken, niet ervoor.",
      ],
      list: [
        {
          title: "Een vertaling die je begrijpt",
          text: "Een vertaling waarvan je de zinnen kunt volgen. Als de Statenvertaling je afremt, begin dan met een vlottere vertaling en leg de Statenvertaling er later naast.",
        },
        {
          title: "Iets om in te schrijven",
          text: "Een schrift of een notitie-app. Wat je niet opschrijft, ben je binnen twee weken kwijt.",
        },
        {
          title: "Twintig minuten, drie keer per week",
          text: "Niet één uur op zondag. Regelmaat verslaat lengte, elke keer weer.",
        },
      ],
    },
    {
      id: "waar-beginnen",
      heading: "Waar begin je in de Bijbel?",
      body: [
        "Niet op bladzijde één. Wie bij Genesis 1 begint en doorleest, loopt vast in Leviticus - dat is geen falen maar een voorspelbaar gevolg van de indeling. De Bijbel is een bibliotheek, geen roman, en je mag zelf kiezen waar je binnenkomt.",
        "Voor een eerste kennismaking is er een korte lijst met boeken die snel lezen en meteen iets opleveren.",
      ],
      list: [
        {
          title: "Markus",
          text: "Het kortste evangelie, zestien hoofdstukken, hoog tempo. Je hebt in twee weken een compleet beeld van wie Jezus is.",
        },
        {
          title: "Genesis 1-12",
          text: "De fundamenten waar de rest van de Bijbel op terugvalt: schepping, zondeval, zondvloed, en de roeping van Abraham.",
        },
        {
          title: "Ruth of Jona",
          text: "Vier hoofdstukken elk. Kort genoeg om in één zitting te lezen, rijk genoeg om er weken over te doen.",
        },
        {
          title: "Filippenzen",
          text: "Vier hoofdstukken, warm van toon, en een goede eerste kennismaking met een brief van Paulus.",
        },
        {
          title: "Psalmen 1, 23, 51 en 139",
          text: "Vier psalmen die elk een andere toon aanslaan: onderwijs, vertrouwen, schuld en verwondering.",
        },
      ],
      callout:
        "Bewaar Openbaring, Leviticus, Ezechiël en Daniël voor later. Niet omdat ze minder waard zijn, maar omdat ze veel achtergrond veronderstellen.",
    },
    {
      id: "eerste-sessie",
      heading: "Je allereerste studiesessie, stap voor stap",
      body: [
        "Neem Markus 1. Zet een timer op dertig minuten. Zo ziet die dertig minuten eruit.",
      ],
      steps: [
        {
          title: "Bid kort (1 minuut)",
          text: "Niet uitgebreid. Vraag eenvoudig om aandacht en om bereidheid je te laten corrigeren.",
        },
        {
          title: "Lees het hoofdstuk (5 minuten)",
          text: "In één keer door, zonder pen. Alleen om te horen wat er staat.",
        },
        {
          title: "Lees opnieuw en noteer (10 minuten)",
          text: "Nu met pen. Schrijf op: wie komen erin voor, waar speelt het, wat wordt herhaald, welke woorden begrijp je niet.",
        },
        {
          title: "Stel drie vragen (5 minuten)",
          text: "Vragen bij wat je noteerde. Ook - en juist - vragen waarop je het antwoord niet weet.",
        },
        {
          title: "Zoek één antwoord op (5 minuten)",
          text: "Kies de vraag die het meest kriebelt. Vergelijk een tweede vertaling of lees een commentaar bij dat vers.",
        },
        {
          title: "Schrijf twee zinnen (4 minuten)",
          text: "Eén zin: waar gaat dit hoofdstuk over? Eén zin: wat neem ik hiervan mee deze week?",
        },
      ],
    },
    {
      id: "dertig-dagen",
      heading: "Een schema van dertig dagen",
      body: [
        "Onderstaand schema brengt je in een maand van nul naar een lopende gewoonte. Het is bewust rustig opgebouwd: eerst korte stukken, later langere, en pas in week vier een eigen keuze.",
        "Sla je een dag over, ga dan gewoon verder waar je gebleven was. Opnieuw beginnen is de snelste manier om te stoppen.",
      ],
      steps: [
        {
          title: "Week 1 - Markus 1 t/m 7",
          text: "Eén hoofdstuk per dag, met de zes stappen hierboven. Doel: de gewoonte, niet de diepgang.",
        },
        {
          title: "Week 2 - Markus 8 t/m 14",
          text: "Zelfde ritme. Let vanaf hoofdstuk 8 op de drie keer dat Jezus zijn lijden aankondigt en hoe de discipelen reageren.",
        },
        {
          title: "Week 3 - Markus 15-16 en Psalm 1, 23, 51, 139, 139 herhaald",
          text: "Rond het evangelie af en wissel van genre. Poëzie leest anders dan verhaal; merk op wat dat met je manier van lezen doet.",
        },
        {
          title: "Week 4 - Filippenzen, één hoofdstuk per twee dagen",
          text: "Nu langzamer. Een brief vraagt om verzenanalyse: trek de zinnen uit elkaar en let op de verbindingswoorden.",
        },
        {
          title: "Dag 29 - Lees je notities terug",
          text: "Alles van de afgelopen vier weken. Dit is het moment waarop het rendement van opschrijven zichtbaar wordt.",
        },
        {
          title: "Dag 30 - Kies zelf",
          text: "Welk boek wil je hierna? Kies op grond van een vraag die de afgelopen maand is opgekomen.",
        },
      ],
    },
    {
      id: "volhouden",
      heading: "Hoe je het volhoudt",
      body: [
        "De meeste mensen stoppen niet omdat bijbelstudie tegenvalt, maar omdat het ritme wegvalt. Een paar dingen die aantoonbaar helpen.",
      ],
      list: [
        {
          title: "Koppel het aan iets bestaands",
          text: "Direct na de koffie, direct voor het slapen. Een gewoonte die aan een bestaande gewoonte hangt, overleeft veel langer dan een gewoonte die op wilskracht drijft.",
        },
        {
          title: "Kies liever kort en vaak",
          text: "Twintig minuten drie keer per week levert meer op dan een uur dat je één keer volhoudt.",
        },
        {
          title: "Houd je voortgang zichtbaar",
          text: "Een streepje per dag, een streak in een app - het maakt niet uit wat, als je maar ziet dat er een reeks staat.",
        },
        {
          title: "Vertel iemand wat je las",
          text: "Eén keer per week hardop uitleggen wat je gevonden hebt. Dat is de snelste manier om te merken of je het begrepen hebt.",
        },
        {
          title: "Accepteer saaie dagen",
          text: "Niet elke sessie levert iets op. Dat is normaal en geen reden om te stoppen; het gemiddelde telt.",
        },
      ],
    },
    {
      id: "veelgemaakte-fouten",
      heading: "Fouten die bijna elke beginner maakt",
      body: [
        "Ze zijn allemaal te vermijden zodra je ze kent.",
      ],
      list: [
        {
          title: "Te veel tegelijk willen",
          text: "Drie hoofdstukken per dag houd je twee weken vol. Eén hoofdstuk houd je een jaar vol.",
        },
        {
          title: "Bij Genesis beginnen en doorlezen",
          text: "Je strandt in Leviticus. Kies een startpunt op grond van wat je wilt weten, niet op grond van de bladzijdenummering.",
        },
        {
          title: "Meteen willen toepassen",
          text: "Eerst begrijpen wat er staat. De toepassing die je vindt vóór je de tekst begrijpt, komt van jezelf.",
        },
        {
          title: "Niets opschrijven",
          text: "Zonder aantekeningen bouw je niets op en begin je elke keer opnieuw.",
        },
        {
          title: "Denken dat je het alleen moet doen",
          text: "Een commentaar raadplegen of iemand om uitleg vragen is geen zwaktebod maar normale studiepraktijk.",
        },
      ],
    },
  ],
  faqs: [
    {
      q: "Hoe begin ik met bijbelstudie als beginner?",
      a: "Begin met Markus 1, neem dertig minuten en werk in zes stappen: kort bidden, het hoofdstuk in één keer lezen, opnieuw lezen met pen en noteren wat opvalt, drie vragen stellen, één ervan opzoeken, en twee zinnen opschrijven over de kern en de toepassing. Herhaal dat drie keer per week.",
    },
    {
      q: "Welk bijbelboek lees je het beste als eerste?",
      a: "Markus, omdat het het kortste evangelie is en snel leest. Daarna Genesis 1-12 voor de fundamenten, of Filippenzen als eerste kennismaking met een brief. Begin niet bij Leviticus, Ezechiël of Openbaring.",
    },
    {
      q: "Hoeveel tijd moet ik uittrekken voor bijbelstudie?",
      a: "Twintig tot dertig minuten, drie keer per week, is voor een beginner een goed uitgangspunt. Regelmaat weegt zwaarder dan lengte: kort en vaak levert meer op dan een lange sessie die je na drie weken niet volhoudt.",
    },
    {
      q: "Wat doe ik als ik een gedeelte niet begrijp?",
      a: "Schrijf de vraag op en ga door - je hoeft niet alles vandaag te snappen. Vergelijk daarna een tweede vertaling, lees een bijbelcommentaar bij dat vers, of leg de vraag voor aan iemand die er meer van weet. Blijvende vragen zijn normaal en horen bij serieuze studie.",
    },
    {
      q: "Heb ik een studiebijbel nodig?",
      a: "Nee. Een gewone vertaling en een schrift zijn genoeg om te beginnen. Achtergrondinformatie en commentaren zijn tegenwoordig gratis online te raadplegen, dus een dure uitgave is geen voorwaarde.",
    },
  ],
  related: [
    {
      href: "/bijbelstudie",
      label: "Bijbelstudie: de complete gids",
      description: "De hoofdgids met alle methoden en hulpmiddelen.",
    },
    {
      href: "/bijbelstudie/methoden",
      label: "Bijbelstudie methoden",
      description: "Zes methoden, elk met een concreet voorbeeld.",
    },
    {
      href: "/bijbelstudie/gratis",
      label: "Gratis bijbelstudie",
      description: "Alles wat je gratis kunt gebruiken om te beginnen.",
    },
    {
      href: "/bijbelboeken/markus",
      label: "Het boek Markus",
      description: "Achtergrond en hoofdlijn van het boek waar je mee begint.",
    },
  ],
};
