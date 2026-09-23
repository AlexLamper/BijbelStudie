import type { Topic } from "./types";

/** /bijbel-over/zorgen - "wat zegt de bijbel over zorgen", "wees niet bezorgd bijbel", "piekeren". */
export const TOPIC_ZORGEN: Topic = {
  slug: "zorgen",
  subject: "zorgen",
  label: "Zorgen",
  group: "moeilijke-tijden",
  description:
    "Wat zegt de Bijbel over zorgen en piekeren? Wat Jezus zegt over de dag van morgen, waarom je je zorgen op God mag werpen en waarom plannen wel mag.",
  summary: "Wat Jezus zegt over morgen, en waarom je je zorgen op God mag werpen.",
  answer:
    "De Bijbel neemt zorgen serieus, maar nodigt uit ze bij God neer te leggen: 'Werpt al uw bekommernis op Hem, want Hij zorgt voor u' (1 Petrus 5:7). Jezus zegt dat piekeren over morgen je leven niet verlengt en dat je Vader weet wat je nodig hebt. Dat is geen oproep tot onverschilligheid, maar tot vertrouwen: doen wat vandaag van je gevraagd wordt en de rest aan God overlaten.",
  keywords: [
    "wat zegt de bijbel over zorgen",
    "wees niet bezorgd bijbel",
    "piekeren bijbel",
    "bijbelteksten over zorgen",
    "mattheus 6 34",
  ],
  datePublished: "2026-09-23",
  dateModified: "2026-09-23",
  sections: [
    {
      id: "zorgen-oude-testament",
      heading: "Zorgen in het Oude Testament",
      body: [
        "Het Oude Testament kent zorgen van allerlei soort: om brood, om kinderen, om vijanden, om de toekomst. De les die steeds terugkomt, is dat God dag voor dag voorziet - niet altijd in een voorraad, wel in wat nodig is.",
      ],
      passages: [
        {
          book: "exodus",
          chapter: 16,
          verses: "13-21",
          text: "In de woestijn geeft God elke ochtend manna, genoeg voor één dag. Wie meer bewaarde dan nodig, zag het de volgende ochtend bedorven (vers 20). Israël moest leren dat Gods zorg niet in de voorraadkast zit, maar in Hem. Jezus sluit daarbij aan met 'geef ons heden ons dagelijks brood'.",
        },
        {
          book: "psalmen",
          chapter: 55,
          verses: "23",
          quote: "Werp uw zorg op den HEERE, en Hij zal u onderhouden",
          text: "David schrijft dit terwijl hij verraden is door een vertrouwde vriend (vers 13-15). Het is geen goedkope raad van iemand zonder zorgen, maar een keuze midden in de pijn. (In Engelse vertalingen is dit vers 22.)",
        },
        {
          book: "psalmen",
          chapter: 127,
          verses: "1-2",
          quote: "Zo de HEERE het huis niet bouwt, tevergeefs arbeiden deszelfs bouwlieden daaraan",
          text: "Hard werken is niet verkeerd, maar vroeg opstaan en laat opblijven uit zorg noemt vers 2 'tevergeefs': God geeft het Zijn beminden 'als in den slaap'.",
        },
        {
          book: "spreuken",
          chapter: 12,
          verses: "25",
          quote: "Bekommernis in het hart des mensen buigt het neder; maar een goed woord verblijdt het.",
          text: "Een nuchtere observatie: zorgen drukken je neer, een goed woord van een ander kan je optillen. Ook daarom is het goed je zorgen met iemand te delen.",
        },
      ],
    },
    {
      id: "jezus-over-zorgen",
      heading: "Jezus en de apostelen over zorgen",
      body: [
        "Jezus spreekt in de Bergrede uitgebreid over zorgen (Mattheüs 6:25-34). Het Griekse werkwoord dat Hij gebruikt, komt ook terug bij Marta, die zich 'bekommert en ontrust' over vele dingen. Het beschrijft een geest die alle kanten op wordt getrokken.",
      ],
      passages: [
        {
          book: "mattheus",
          chapter: 6,
          verses: "25-34",
          quote: "Zijt dan niet bezorgd tegen den morgen; want de morgen zal voor het zijne zorgen; elke dag heeft genoeg aan zijn zelfs kwaad.",
          text: "Jezus wijst op de vogels en de lelies: God zorgt voor hen, en jij bent meer waard. Zijn argument is niet 'het valt wel mee', maar 'je hebt een Vader'. De kern staat in vers 33: zoek eerst Gods koninkrijk, en 'al deze dingen zullen u toegeworpen worden'.",
        },
        {
          book: "lukas",
          chapter: 10,
          verses: "38-42",
          quote: "Martha, Martha, gij bekommert en ontrust u over vele dingen; Maar een ding is nodig",
          text: "Marta doet iets goeds - gastvrij zijn - maar raakt erdoor opgejaagd en boos op haar zus. Jezus berispt haar niet om haar dienen, maar om haar onrust. Maria, die aan zijn voeten luistert, heeft 'het goede deel' gekozen.",
        },
        {
          book: "filippenzen",
          chapter: 4,
          verses: "6-7",
          quote: "Weest in geen ding bezorgd; maar laat uw begeerten in alles, door bidden en smeken, met dankzegging bekend worden bij God.",
          text: "Paulus zit gevangen en weet niet of hij het overleeft. Toch zet hij zorgen om in gebed, en voegt hij er dankzegging aan toe. De belofte is niet dat de situatie meteen verandert, maar dat 'de vrede Gods' je hart bewaart.",
        },
        {
          book: "1-petrus",
          chapter: 5,
          verses: "6-7",
          quote: "Werpt al uw bekommernis op Hem, want Hij zorgt voor u.",
          text: "Werpen is een actief woord: je doet iets met je zorg. Petrus verbindt het met nederigheid (vers 6): erkennen dat je niet alles zelf hoeft te dragen.",
        },
      ],
    },
  ],
  misunderstandings: [
    {
      title: "Je mag je nergens zorgen over maken",
      text: "Paulus schrijft dat hem dagelijks 'de zorg van al de gemeenten' overvalt (2 Corinthiërs 11:28), en hij prijst Timotheüs omdat die oprecht voor anderen zorgt (Filippenzen 2:20). Zorg dragen voor mensen is goed. Jezus waarschuwt voor het verlammende piekeren waarin God buiten beeld raakt.",
    },
    {
      title: "Niet bezorgd zijn betekent niet plannen",
      text: "Jozef legde in Egypte voorraden aan voor zeven magere jaren (Genesis 41), en Spreuken prijst de mier die in de zomer haar voedsel verzamelt (Spreuken 6:6-8). Plannen is verstandig; wat Jezus afwijst, is leven alsof alles van jouw planning afhangt.",
    },
    {
      title: "Wie nog zorgen heeft, vertrouwt God niet genoeg",
      text: "Zorgen komen vanzelf; vertrouwen is wat je ermee doet. De oproep om je zorgen op God te 'werpen' veronderstelt dat je ze hebt. Het is een oefening die je elke dag opnieuw doet.",
    },
  ],
  practiceHeading: "Hoe laat je zorgen los?",
  practice: [
    {
      title: "Schrijf je zorgen op",
      text: "Maak twee kolommen: wat je vandaag kunt doen, en wat buiten je macht ligt. Doe het eerste, en maak van het tweede een gebed.",
    },
    {
      title: "Bid met dankzegging",
      text: "Volg Filippenzen 4:6 letterlijk: noem bij elke zorg ook iets waarvoor je God dankt. Dat verandert niet de situatie, wel je blik erop.",
    },
    {
      title: "Leef per dag",
      text: "'Elke dag heeft genoeg aan zijn zelfs kwaad.' Vraag niet hoe je het volgend jaar redt, maar wat vandaag van je gevraagd wordt.",
    },
    {
      title: "Deel je zorg",
      text: "Spreuken 12:25 zegt dat een goed woord je opbeurt. Vertel iemand wat je dwarszit, en laat je helpen.",
    },
  ],
  careNote:
    "Houden zorgen je 's nachts wakker of beheersen ze je dagen? Praat erover met je huisarts. Bij geldzorgen kun je gratis hulp krijgen via je gemeente, en veel kerken hebben een diaconie die meedenkt.",
  faqs: [
    {
      q: "Wat zegt Jezus over zorgen?",
      a: "In Mattheüs 6:25-34 zegt Jezus dat je je niet bezorgd hoeft te maken over eten, drinken en kleding, omdat je hemelse Vader weet wat je nodig hebt. Hij wijst op de vogels en de lelies en zegt: zoek eerst Gods koninkrijk. Zijn slotwoord: 'Elke dag heeft genoeg aan zijn zelfs kwaad.'",
    },
    {
      q: "Is je zorgen maken een zonde?",
      a: "De Bijbel noemt zorgen niet zonder meer zonde, maar wel iets om los te laten. Jezus' woorden zijn een uitnodiging, geen verwijt: je Vader zorgt voor je. Het wordt een probleem als zorg de plaats van God inneemt en je leven gaat beheersen.",
    },
    {
      q: "Welke bijbeltekst helpt tegen piekeren?",
      a: "Mattheüs 6:34, Filippenzen 4:6-7, 1 Petrus 5:7 en Psalm 55:23 worden het meest gelezen. Ook Psalm 94:19 is sterk: 'Als mijn gedachten binnen in mij vermenigvuldigd werden, hebben Uw vertroostingen mijn ziel verkwikt.'",
    },
  ],
  relatedTopics: ["angst", "gebed", "vrede"],
  related: [
    {
      href: "/studies/bergrede",
      label: "Studie: De Bergrede",
      description: "Met een les over Mattheüs 6: 'Geen zorgen over morgen'.",
    },
    {
      href: "/studies/geloof-in-storm",
      label: "Studie: Geloof in de storm",
      description: "Met Filippenzen 4 over de vrede die alle verstand te boven gaat.",
    },
    {
      href: "/bijbelboeken/filippenzen",
      label: "Filippenzen",
      description: "Paulus' brief uit gevangenschap over blijdschap en vrede.",
    },
  ],
};
