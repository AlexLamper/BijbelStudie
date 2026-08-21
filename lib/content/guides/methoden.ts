import type { Guide } from "./types";

/** /bijbelstudie/methoden - target: "bijbelstudie methoden", "bijbelstudie methode". */
export const GUIDE_METHODS: Guide = {
  slug: "methoden",
  path: "/bijbelstudie/methoden",
  metadataKey: "guideMethods",
  h1: "Bijbelstudie methoden: 6 beproefde manieren",
  intro:
    "Zes manieren om een bijbelgedeelte te bestuderen, elk uitgewerkt met wanneer je hem gebruikt, hoe je hem uitvoert en een concreet voorbeeld om vandaag mee te beginnen.",
  datePublished: "2026-08-21",
  dateModified: "2026-08-21",
  readingMinutes: 14,
  sections: [
    {
      id: "welke-methode",
      heading: "Welke methode past bij jouw vraag?",
      body: [
        "Een methode is geen ritueel maar gereedschap. Je kiest hem op grond van de vraag die je hebt, net zoals je geen schroevendraaier pakt voor een spijker. Onderstaande zes dekken samen vrijwel alles wat je bij bijbelstudie tegenkomt.",
        "In de praktijk combineren de meeste mensen er twee: een boekstudie als vaste ruggengraat, en daarnaast een woord- of thematische studie zodra ergens een vraag opduikt.",
      ],
      list: [
        { title: "Ik snap dit gedeelte niet", text: "Inductieve studie of verzenanalyse." },
        { title: "Wat zegt de Bijbel over X?", text: "Thematische studie." },
        { title: "Wie was deze persoon eigenlijk?", text: "Biografische studie." },
        { title: "Waar gaat dit boek als geheel over?", text: "Boekstudie." },
        { title: "Wat betekent dit woord precies?", text: "Woordstudie." },
      ],
    },
    {
      id: "inductief",
      heading: "1. Inductieve bijbelstudie",
      body: [
        "De inductieve methode is de bekendste en de veiligste. Zij dwingt je de drie stappen in volgorde te doen: waarnemen, uitleggen, toepassen. Het idee is dat je conclusies uit de tekst haalt (inductief) in plaats van er conclusies in te leggen (deductief).",
        "Waarnemen is de fase waar de meeste mensen te snel doorheen gaan. Je noteert wat er letterlijk staat: wie, wat, waar, wanneer, herhalingen, tegenstellingen, oorzaak-gevolgwoorden zoals 'daarom' en 'want', en alles wat je opvalt zonder dat je weet waarom. Pas als je niets nieuws meer ziet, ga je uitleggen.",
        "Uitleggen betekent: wat betekende dit voor wie het als eerste hoorde? Daar komen context, achtergrond en commentaren bij kijken. Toepassen komt echt als laatste, en volgt uit de uitleg in plaats van eromheen.",
      ],
      steps: [
        { title: "Lees drie keer", text: "Eerst voor de loop, dan met pen, dan hardop. Hardop lezen laat je dingen horen die je op papier overslaat." },
        { title: "Markeer systematisch", text: "Gebruik vaste tekens: herhaalde woorden omcirkelen, tegenstellingen onderstrepen, tijdsaanduidingen in de kantlijn." },
        { title: "Schrijf vijf vragen op", text: "Bij voorkeur vragen die je nog niet kunt beantwoorden." },
        { title: "Zoek de context op", text: "Wat gaat eraan vooraf, wat volgt, en waar staat dit gedeelte in het boek als geheel?" },
        { title: "Formuleer de kern", text: "Eén zin. Als het er twee worden, ben je er nog niet." },
        { title: "Eén toepassing", text: "Concreet genoeg dat je over een week kunt nagaan of het gebeurd is." },
      ],
      callout:
        "Voorbeeld om mee te oefenen: Filippenzen 2:1-11. Let bij het waarnemen op elk woord dat een gevolg aangeeft, en op de beweging omlaag en weer omhoog in de hymne.",
    },
    {
      id: "verzenanalyse",
      heading: "2. Verzenanalyse",
      body: [
        "Verzenanalyse gaat één laag dieper dan de inductieve methode: je neemt één vers of een korte perikoop en pluist die woord voor woord uit. De methode werkt uitstekend bij dichte teksten - de brieven van Paulus, de proloog van Johannes, de zaligsprekingen - waar in één zin drie gedachten opgestapeld liggen.",
        "De kern is het uit elkaar trekken van de zin. Wat is de hoofdzin? Welke bijzinnen hangen eraan, en wat doen ze: reden, doel, gevolg, voorwaarde, tijd? Wie de grammaticale structuur van Romeinen 8:1 uittekent, ziet meteen waar het gewicht ligt.",
      ],
      steps: [
        { title: "Schrijf het vers over", text: "Met de hand. Dat dwingt tot langzaam lezen en je merkt woorden op die je bij het lezen oversloeg." },
        { title: "Splits in zinsdelen", text: "Zet elke bijzin op een eigen regel, ingesprongen onder de hoofdzin waar hij bij hoort." },
        { title: "Benoem de verbindingswoorden", text: "'Want', 'opdat', 'zodat', 'hoewel', 'omdat' - elk daarvan stuurt de betekenis van wat volgt." },
        { title: "Definieer de sleutelwoorden", text: "Wat betekent dit woord hier, gezien hoe dezelfde schrijver het elders gebruikt?" },
        { title: "Parafraseer", text: "Schrijf het vers in je eigen woorden, langer dan het origineel. Waar je vastloopt, heb je iets nog niet begrepen." },
      ],
      callout:
        "Voorbeeld: Efeziërs 2:8-10. Trek de drie 'niet uit'-bepalingen uit elkaar en let op waar vers 10 het betoog een andere kant op stuurt dan je verwacht.",
    },
    {
      id: "thematisch",
      heading: "3. Thematische bijbelstudie",
      body: [
        "Bij een thematische studie volg je één onderwerp door de Schrift: gebed, vergeving, recht, geld, lijden, gastvrijheid. Het is de snelste manier om een breed beeld te krijgen, en de methode met het grootste risico. Wie zoekt vindt namelijk altijd, en het is verleidelijk de teksten over te slaan die niet in het beeld passen.",
        "De beveiliging is eenvoudig: verzamel eerst álle relevante plaatsen voordat je conclusies trekt, en noteer expliciet de teksten die je theorie tegenspreken. Die zijn het interessantst.",
        "Let ook op ontwikkeling. Een thema kan in het Oude Testament anders liggen dan in het Nieuwe. Dat is meestal geen tegenspraak maar een lijn die ergens naartoe loopt.",
      ],
      steps: [
        { title: "Bakenaf het thema af", text: "'Gebed' is te groot. 'Wat leert het Nieuwe Testament over volhardend gebed' is werkbaar." },
        { title: "Verzamel de teksten", text: "Zoek op meerdere woorden, niet alleen op het meest voor de hand liggende. Bij gebed ook: roepen, smeken, aanroepen, bidden." },
        { title: "Groepeer", text: "Zet de vindplaatsen bij elkaar die hetzelfde zeggen, en zet de uitzonderingen apart." },
        { title: "Lees elk in zijn context", text: "Niet één vers op zichzelf, maar de alinea eromheen. Hier sneuvelt de helft van de vermeende bewijsteksten." },
        { title: "Schrijf de conclusie én de spanning op", text: "Wat is duidelijk, en wat blijft staan als vraag?" },
      ],
      callout:
        "Voorbeeld: het thema 'vreemdeling' vanaf Leviticus 19:34 via Ruth en Jona naar Efeziërs 2. Let op wat elke stap toevoegt.",
    },
    {
      id: "biografisch",
      heading: "4. Biografische bijbelstudie",
      body: [
        "Bij een biografische studie volg je één persoon: Abraham, Jozef, Ruth, David, Petrus, Paulus. Het is de meest toegankelijke methode, omdat verhalen makkelijker vast te houden zijn dan betogen, en er zit vanzelf een tijdlijn in.",
        "Het risico is moralisme: het verhaal reduceren tot 'wees zoals Daniël' of 'wees niet zoals Saul'. De meeste bijbelse figuren zijn daar te ingewikkeld voor. David is tegelijk de man naar Gods hart en de man die Uria liet vermoorden, en het verhaal presenteert die twee niet als losse hoofdstukken.",
        "Een sterkere vraag dan 'wat kan ik van hem leren' is: wat doet God in dit leven, en waar loopt het spaak? Dan blijft de persoon een mens en wordt het verhaal niet plat.",
      ],
      steps: [
        { title: "Verzamel alle vindplaatsen", text: "Ook de terugverwijzingen elders - Hebreeën 11 en de brieven zeggen vaak iets extra's." },
        { title: "Zet een tijdlijn uit", text: "Gebeurtenissen op volgorde, met leeftijd en plaats waar bekend." },
        { title: "Let op keerpunten", text: "Waar verandert de richting van dit leven, en wat gaat daaraan vooraf?" },
        { title: "Noteer relaties", text: "Wie beïnvloedt deze persoon, en wie wordt door hem beïnvloed?" },
        { title: "Vraag wat God doet", text: "Niet alleen wat de persoon doet. Vaak is dat de eigenlijke verhaallijn." },
      ],
      callout:
        "Voorbeeld: Petrus, van Lukas 5 via Mattheüs 16 en de verloochening naar Johannes 21 en Handelingen 10. Vijf momenten, één lijn.",
    },
    {
      id: "boekstudie",
      heading: "5. Boekstudie",
      body: [
        "Een boekstudie is de meest complete methode en kost het meeste tijd. Je neemt één bijbelboek en werkt het van begin tot eind door, met aandacht voor structuur, doel en de plaats van elk gedeelte in het geheel.",
        "Begin altijd met het boek in één keer doorlezen, hoe lang het ook is. Zonder dat overzicht weet je bij hoofdstuk 4 niet waar je bent. Bij korte boeken - Filippenzen, Ruth, Jona, Maleachi - is dat zo gebeurd; bij Jesaja moet je er een middag voor uittrekken.",
        "Zoek daarna de structuur. Waar zitten de scharnieren? Vrijwel elk bijbelboek heeft er één of twee, en wie ze vindt, begrijpt de opzet. Markus draait om hoofdstuk 8; Efeziërs om 4:1; Romeinen om de overgang bij hoofdstuk 12.",
      ],
      steps: [
        { title: "Lees het boek in één keer", text: "In één zitting, zonder aantekeningen. Alleen voor het geheel." },
        { title: "Zoek achtergrond", text: "Wie schrijft, aan wie, waarom, en wat is de situatie? Dat staat vaak in het boek zelf." },
        { title: "Maak een eigen indeling", text: "Verdeel het boek in blokken en geef elk blok een titel in je eigen woorden." },
        { title: "Werk blok voor blok", text: "Nu pas de details, met de hele structuur in je hoofd." },
        { title: "Formuleer het doel", text: "In één zin: waarom is dit boek geschreven?" },
      ],
      callout:
        "Voorbeeld om klein te beginnen: Filippenzen. Vier hoofdstukken, één zitting, en een duidelijk doel dat je zelf kunt vinden.",
    },
    {
      id: "woordstudie",
      heading: "6. Woordstudie",
      body: [
        "Bij een woordstudie volg je één Hebreeuws of Grieks woord door de Schrift. Het levert vaak het meeste inzicht per bestede minuut, omdat je meteen ziet dat één Nederlands woord soms twee verschillende originelen vertaalt - en omgekeerd.",
        "Je hoeft de talen niet te kennen. Een interlineaire weergave die de grondtekst uitlijnt met de vertaling is genoeg om te zien welk woord waar staat. Vanaf daar zoek je waar hetzelfde woord nog meer voorkomt.",
        "De klassieke fout is de betekenis van een woord afleiden uit zijn oorsprong of uit zijn samenstellende delen. Woorden betekenen wat ze in gebruik betekenen, niet wat hun etymologie suggereert. De tweede fout is alle betekenissen van een woord in één vindplaats proppen; ook in het Grieks betekent een woord op één plaats maar één ding.",
      ],
      steps: [
        { title: "Kies één woord in één vers", text: "Bij voorkeur een woord dat de zin draagt, niet een lidwoord of voorzetsel." },
        { title: "Zoek het originele woord op", text: "Via een interlineaire weergave of grondtekstfunctie bij het vers." },
        { title: "Verzamel de vindplaatsen", text: "Eerst binnen hetzelfde bijbelboek, dan bij dezelfde schrijver, dan breder." },
        { title: "Groepeer op gebruik", text: "Welke betekenissen zie je? Zet de vindplaatsen per betekenis bij elkaar." },
        { title: "Kies de betekenis die in jouw vers past", text: "Op grond van de context ter plaatse, niet op grond van de mooiste betekenis." },
      ],
      callout:
        "Voorbeeld: het Griekse woord achter 'liefde' in Johannes 21:15-17. Twee verschillende woorden in één gesprek - en de discussie of dat betekenis draagt is zelf een leerzame studie.",
    },
    {
      id: "combineren",
      heading: "Methoden combineren",
      body: [
        "In de praktijk gebruikt vrijwel iedereen meer dan één methode, en dat is precies de bedoeling. Een werkbare combinatie voor een jaar bijbelstudie ziet er ongeveer zo uit: een boekstudie als vaste basis, een verzenanalyse zodra je op een dicht gedeelte stuit, een woordstudie als een term je niet loslaat, en één keer per kwartaal een thematische studie over iets waar je in je eigen leven mee zit.",
        "Wat je ook kiest, houd één ding vast: schrijf op wat je vindt. Bijbelstudie zonder aantekeningen is bijbellezen dat zichzelf overschat.",
      ],
    },
  ],
  faqs: [
    {
      q: "Wat is de inductieve bijbelstudiemethode?",
      a: "De inductieve methode werkt in drie vaste stappen: waarnemen (wat staat er letterlijk?), uitleggen (wat betekende het voor de eerste lezers?) en toepassen (wat betekent het nu?). De volgorde is essentieel - wie bij de toepassing begint, leest zijn eigen situatie in de tekst.",
    },
    {
      q: "Welke bijbelstudiemethode is het beste voor beginners?",
      a: "De inductieve methode op een kort, verhalend gedeelte. Markus is een goed startpunt: kort, snel en concreet. Biografische studie werkt ook goed, omdat een verhaal makkelijker vast te houden is dan een betoog.",
    },
    {
      q: "Kan ik een woordstudie doen zonder Grieks of Hebreeuws te kennen?",
      a: "Ja. Een interlineaire weergave lijnt de grondtekst uit met de Nederlandse vertaling, zodat je ziet welk oorspronkelijk woord waar staat. Vandaaruit zoek je op waar hetzelfde woord elders voorkomt. Kennis van de taal maakt het rijker, maar is geen voorwaarde.",
    },
    {
      q: "Hoe voorkom ik dat ik mijn eigen mening in de tekst lees?",
      a: "Doe de waarnemingsfase volledig af voordat je gaat uitleggen, noteer bij een thematische studie expliciet de teksten die je conclusie tegenspreken, en raadpleeg minstens één commentaar of iemand anders. Wie nooit tegenspraak organiseert, vindt altijd wat hij al dacht.",
    },
  ],
  related: [
    {
      href: "/bijbelstudie",
      label: "Bijbelstudie: de complete gids",
      description: "Terug naar de hoofdgids over bijbelstudie.",
    },
    {
      href: "/bijbelstudie/beginnen",
      label: "Bijbelstudie voor beginners",
      description: "Een stappenplan van dertig dagen.",
    },
    {
      href: "/bijbelboeken",
      label: "De 66 bijbelboeken",
      description: "Kies een boek voor je eerste boekstudie.",
    },
    {
      href: "/studies",
      label: "Begeleide studies",
      description: "Tien studies waarin deze methoden al zijn uitgewerkt.",
    },
  ],
};
