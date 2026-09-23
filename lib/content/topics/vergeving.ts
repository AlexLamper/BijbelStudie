import type { Topic } from "./types";

/** /bijbel-over/vergeving - "wat zegt de bijbel over vergeving", "vergeven in de bijbel". */
export const TOPIC_VERGEVING: Topic = {
  slug: "vergeving",
  subject: "vergeving",
  label: "Vergeving",
  group: "god-en-geloof",
  description:
    "Wat zegt de Bijbel over vergeving? Hoe God vergeeft, waarom je anderen vergeeft, en waarom vergeven niet hetzelfde is als vergeten of goedpraten.",
  summary: "Hoe God vergeeft, en wat vergeven wel en niet betekent tussen mensen.",
  answer:
    "Volgens de Bijbel is vergeving in de eerste plaats iets wat God doet: Hij neemt de schuld weg van wie die belijdt, op grond van wat Jezus aan het kruis deed. Wie zo vergeven is, wordt geroepen ook anderen te vergeven. Dat betekent niet dat onrecht er niet toe doet of dat je alles moet vergeten, maar dat je afziet van wraak en het oordeel aan God overlaat.",
  keywords: [
    "wat zegt de bijbel over vergeving",
    "vergeving in de bijbel",
    "bijbelteksten over vergeving",
    "vergeven bijbel",
    "zeventigmaal zevenmaal",
  ],
  datePublished: "2026-09-23",
  dateModified: "2026-09-23",
  sections: [
    {
      id: "god-vergeeft",
      heading: "God die vergeeft: het Oude Testament",
      body: [
        "Het Oude Testament gebruikt allerlei beelden voor vergeving: schuld wordt weggedragen, bedekt, uitgewist, achter Gods rug geworpen. Het Hebreeuwse werkwoord nasa betekent letterlijk 'optillen, wegdragen'. En de offerdienst laat zien dat vergeving iets kost: zonde wordt niet weggewuifd, maar verzoend (Leviticus 16).",
      ],
      passages: [
        {
          book: "psalmen",
          chapter: 32,
          verses: "1-5",
          text: "David beschrijft wat verzwegen schuld met hem deed: 'Toen ik zweeg, werden mijn beenderen verouderd' (vers 3). Pas toen hij zijn zonde beleed, kwam de bevrijding. Vergeving begint met eerlijk zijn tegenover God.",
        },
        {
          book: "psalmen",
          chapter: 103,
          verses: "10-12",
          quote: "Zo ver het oosten is van het westen, zo ver doet Hij onze overtredingen van ons.",
          text: "Oost en west raken elkaar nooit. De dichter bedoelt: wat God vergeven heeft, haalt Hij niet opnieuw tevoorschijn om het tegen je te gebruiken.",
        },
        {
          book: "psalmen",
          chapter: 130,
          verses: "3-4",
          quote: "Maar bij U is vergeving, opdat Gij gevreesd wordt.",
          text: "Vergeving maakt God niet kleiner of minder serieus, maar juist groter. Wie weet hoeveel hem vergeven is, krijgt ontzag voor God.",
        },
        {
          book: "genesis",
          chapter: 50,
          verses: "15-21",
          quote: "Gijlieden wel, gij hebt kwaad tegen mij gedacht; doch God heeft dat ten goede gedacht",
          text: "Jozef vergeeft de broers die hem als slaaf verkochten. Hij noemt het kwaad bij de naam, maar weigert zich in Gods plaats te stellen: 'ben ik in de plaats van God?' (vers 19). Dat is vergeving tussen mensen in een notendop: het onrecht erkennen en de wraak loslaten.",
        },
      ],
    },
    {
      id: "vergeving-door-jezus",
      heading: "Vergeving door Jezus: het Nieuwe Testament",
      body: [
        "In het Nieuwe Testament krijgt vergeving een gezicht. Jezus vergeeft zonden - iets wat volgens zijn tegenstanders alleen God kan (Markus 2:7) - en geeft zijn bloed 'tot vergeving der zonden' (Mattheüs 26:28). Het Griekse woord aphiēmi betekent 'loslaten' of 'kwijtschelden', zoals een schuld wordt kwijtgescholden.",
      ],
      passages: [
        {
          book: "lukas",
          chapter: 15,
          verses: "11-32",
          text: "De verloren zoon heeft een toespraak voorbereid, maar zijn vader rent hem tegemoet en laat hem niet uitpraten. Zo vergeeft God: ruimhartig, zonder proeftijd. Het slot, over de oudere broer, laat zien hoe moeilijk mensen dat kunnen vinden.",
        },
        {
          book: "mattheus",
          chapter: 18,
          verses: "21-35",
          quote: "Ik zeg u, niet tot zevenmaal, maar tot zeventigmaal zeven maal.",
          text: "Petrus vindt zeven keer al ruim. Jezus antwoordt met een gelijkenis over een dienaar die een onbetaalbare schuld kwijtgescholden krijgt en daarna een collega laat opsluiten om een kleine schuld. Wie weet hoeveel hem vergeven is, kan niet blijven turven.",
        },
        {
          book: "lukas",
          chapter: 23,
          verses: "34",
          quote: "Vader, vergeef het hun, want zij weten niet, wat zij doen.",
          text: "Aan het kruis bidt Jezus voor de mensen die Hem kruisigen, en Stefanus doet later hetzelfde (Handelingen 7:60). Vergeving begint hier als gebed, nog voordat de daders spijt hebben.",
        },
        {
          book: "1-johannes",
          chapter: 1,
          verses: "9",
          quote: "Indien wij onze zonden belijden, Hij is getrouw en rechtvaardig, dat Hij ons de zonden vergeve",
          text: "Johannes noemt God niet alleen 'getrouw' maar ook 'rechtvaardig' als Hij vergeeft. Dat kan omdat Jezus 'een verzoening voor onze zonden' is (1 Johannes 2:2). Vergeving is voor God geen oogluikend toestaan, maar een rechtvaardige daad.",
        },
      ],
    },
  ],
  misunderstandings: [
    {
      title: "Vergeven is vergeten",
      text: "Als God zegt dat Hij zonden 'niet meer gedenken' zal (Jeremia 31:34), betekent dat: Hij rekent ze niet meer toe. Voor mensen verdwijnt de herinnering meestal niet. Vergeven betekent dat je die herinnering niet meer als wapen gebruikt.",
    },
    {
      title: "Vergeven betekent dat het niet zo erg was",
      text: "Jozef en Jezus noemen het kwaad bij de naam. Vergeving erkent juist dat er iets ernstigs is gebeurd; anders zou er niets te vergeven zijn.",
    },
    {
      title: "Vergeven betekent dat alles weer wordt zoals het was",
      text: "Vergeving en verzoening zijn niet hetzelfde. Vergeven kan eenzijdig; verzoening vraagt dat de ander zijn schuld erkent. Vertrouwen herstellen kost tijd, en wie mishandeld is, hoeft niet terug naar een onveilige situatie. Ook aangifte doen staat niet tegenover vergeving: de overheid is volgens Romeinen 13:4 juist aangesteld om recht te doen.",
    },
  ],
  practiceHeading: "Hoe vergeef je iemand?",
  practice: [
    {
      title: "Begin bij Gods vergeving",
      text: "Lees Psalm 32 of 51 en breng je eigen schuld bij God. Wie zelf vergeving heeft ontvangen, krijgt ruimte om anderen te vergeven.",
    },
    {
      title: "Benoem wat er gebeurd is",
      text: "Schrijf eerlijk op wat de ander je heeft aangedaan en wat het je kost. Vergeving begint niet met bagatelliseren.",
    },
    {
      title: "Maak er een gebed van",
      text: "Zeg tegen God dat je de wraak aan Hem overlaat (Romeinen 12:19). Dat moet soms elke dag opnieuw; 'tot zeventigmaal zeven maal' laat ruimte voor een proces.",
    },
    {
      title: "Zet een stap als het veilig kan",
      text: "Zoek, waar dat verantwoord is, het gesprek. Soms is een brief of een tussenpersoon wijzer. Verzoening kun je niet afdwingen, alleen mogelijk maken.",
    },
  ],
  faqs: [
    {
      q: "Moet ik iemand vergeven die geen spijt heeft?",
      a: "Jezus bad voor zijn beulen toen die nog geen spijt hadden, en Romeinen 12 roept op de wraak aan God over te laten. In die zin kun je vergeven zonder dat de ander iets doet: je laat het recht op vergelding los. Volledige verzoening, waarin de relatie wordt hersteld, vraagt wel dat de ander zijn schuld erkent (Lukas 17:3-4).",
    },
    {
      q: "Vergeeft God elke zonde?",
      a: "Ja, voor wie zich tot Hem wendt: 'Al waren uw zonden als scharlaken, zij zullen wit worden als sneeuw' (Jesaja 1:18). Jezus spreekt in Mattheüs 12:31-32 over een lastering tegen de Heilige Geest die niet vergeven wordt; uitleggers verstaan dat meestal als het blijvend en bewust afwijzen van Gods werk. Wie bang is die zonde begaan te hebben, laat met die zorg juist zien dat hij God niet afwijst.",
    },
    {
      q: "Wat betekent 'vergeef ons onze schulden, gelijk ook wij vergeven onzen schuldenaren'?",
      a: "In het Onze Vader (Mattheüs 6:12) en direct daarna (6:14-15) verbindt Jezus Gods vergeving met onze vergeving aan anderen. Dat is geen ruil waarmee je vergeving verdient, maar een waarschuwing: wie vergeving ontvangt en een ander blijvend weigert te vergeven, heeft niet begrepen wat hem gegeven is.",
    },
    {
      q: "Hoe vaak moet je vergeven volgens de Bijbel?",
      a: "Jezus' antwoord aan Petrus, 'tot zeventigmaal zeven maal', betekent: zonder te tellen. Dat wil niet zeggen dat je schadelijk gedrag moet blijven toelaten, wel dat je bereid blijft het recht op wraak los te laten.",
    },
  ],
  relatedTopics: ["genade", "liefde", "vriendschap"],
  related: [
    {
      href: "/studies/david",
      label: "Studie: David - naar Gods hart",
      description: "Met Psalm 51, het gebed van David na zijn zonde met Bathseba.",
    },
    {
      href: "/bijbelboeken/filemon",
      label: "Filémon",
      description: "Een korte brief over vergeving en verzoening tussen een meester en een weggelopen slaaf.",
    },
    {
      href: "/bijbelboeken/genesis",
      label: "Genesis",
      description: "Met de geschiedenis van Jozef, die zijn broers vergeeft.",
    },
  ],
};
