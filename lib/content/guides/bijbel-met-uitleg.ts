import type { Guide } from "./types";

/**
 * /bijbelstudie/bijbel-met-uitleg - target: "bijbel met uitleg online (lezen)",
 * "bijbelverklaring online", "bijbel met commentaar".
 *
 * Every claim about what the site offers is checked against the code:
 * translations in hooks/useBibleData.ts, the free/Pro line in lib/proContent.ts
 * and lib/pricing.ts (PRO_FEATURES), commentary sources in
 * lib/mobileAttribution.ts, the reader tabs in
 * components/study/StudyMaterialsSection.tsx and the grondtekst fields in
 * components/study/OriginalText.tsx. Change those and this copy has to follow.
 *
 * Scripture is quoted from the Statenvertaling only (public domain), sparingly
 * and with a reference. Every other passage is named by reference.
 */
export const GUIDE_EXPLAINED: Guide = {
  slug: "bijbel-met-uitleg",
  path: "/bijbelstudie/bijbel-met-uitleg",
  metadataKey: "guideExplained",
  h1: "Bijbel met uitleg online lezen: commentaar, context en grondtekst",
  intro:
    "Welke soorten uitleg er bij de Bijbel bestaan, waar elk goed voor is, hoe je een bijbelverklaring gebruikt zonder dat die je eigen lezen vervangt - en wat je hier gratis en met Pro kunt lezen.",
  datePublished: "2026-09-23",
  dateModified: "2026-09-23",
  readingMinutes: 9,
  sections: [
    {
      id: "wat-is-een-bijbel-met-uitleg",
      heading: "Wat is een bijbel met uitleg?",
      body: [
        "Een bijbel met uitleg is de bijbeltekst met iets ernaast dat helpt hem te begrijpen. Op papier zijn dat twee soorten boeken: de studiebijbel, met korte aantekeningen onder aan de bladzijde, en de bijbelverklaring of het commentaar, een apart boek dat de tekst hoofdstuk voor hoofdstuk en vaak vers voor vers bespreekt.",
        "Online vallen die twee samen. De tekst staat in het ene paneel, de uitleg bij hetzelfde hoofdstuk in het andere, en je hoeft niet meer tussen twee boeken te bladeren om te weten wat een uitlegger over vers 20 zegt. Dat is waarom mensen zoeken naar een bijbel met uitleg online: niet om iets anders te lezen dan de Bijbel, maar om bij het lezen niet vast te lopen.",
        "Eén onderscheid is de moeite waard om vast te houden. Een vertaling probeert weer te geven wat er staat; uitleg vertelt wat iemand denkt dat het betekent. Ook een vertaler maakt keuzes, maar een commentaar is van een andere orde: het is het werk van iemand die de tekst lang bestudeerd heeft, met zijn kennis, zijn tijd en zijn overtuiging. Dat maakt uitleg niet minder waardevol. Het maakt haar wel iets om bewust te gebruiken.",
      ],
    },
    {
      id: "soorten-uitleg",
      heading: "Vijf soorten uitleg, en waar elk goed voor is",
      body: [
        "Wie 'een bijbel met uitleg' zegt, kan vijf verschillende dingen bedoelen. Ze beantwoorden elk een ander soort vraag, en wie weet welke hij nodig heeft, zoekt korter.",
      ],
      list: [
        {
          title: "Studiebijbel-aantekeningen",
          text: "Korte noten bij een vers: wat een begrip betekent, hoeveel een talent was, waar een plaats lag, welke andere tekst hier wordt aangehaald. Ideaal om een drempel weg te nemen zonder je leesritme te breken. De beperking is de ruimte: in twee regels kun je geen uitleggingen tegen elkaar afwegen, dus meestal krijg je er één.",
        },
        {
          title: "Vers-voor-vers commentaren",
          text: "Een doorlopende bespreking van een heel bijbelboek. Hier vind je wat een studiebijbel moet overslaan: waarom een zin zo is opgebouwd, hoe het gedeelte door de eeuwen heen gelezen is, en wat het betekent voor wie het nu leest. Het beste gereedschap voor een gedeelte waar je echt in wilt graven.",
        },
        {
          title: "Inleidingen per bijbelboek",
          text: "Wie schreef het boek, wanneer, aan wie en waarom, en hoe is het opgebouwd? De meest onderschatte vorm van uitleg. Veel misverstanden bij het bijbellezen ontstaan niet door een moeilijk vers, maar doordat de lezer niet weet waar in het boek hij zich bevindt.",
        },
        {
          title: "Verwijzingen naar andere bijbelplaatsen",
          text: "De oudste vorm van uitleg: Schrift met Schrift vergelijken. Een verwijzing laat zien waar hetzelfde woord, hetzelfde beeld of dezelfde belofte elders voorkomt. Vaak legt de Bijbel een moeilijke plaats zelf uit, als je weet waar je moet kijken.",
        },
        {
          title: "De grondtekst",
          text: "Het Hebreeuwse of Griekse woord onder de Nederlandse vertaling, met een nummer waarmee je hetzelfde woord door de hele Bijbel kunt volgen. Je hoeft de taal niet te kennen om te zien dat twee verschillende Nederlandse woorden hetzelfde origineel vertalen, of juist andersom.",
        },
      ],
    },
    {
      id: "soorten-commentaren",
      heading: "Niet elk commentaar doet hetzelfde",
      body: [
        "Binnen de commentaren is er nog een onderscheid dat bepaalt of een commentaar je helpt of frustreert. Grofweg zijn er stichtelijke commentaren, die de tekst uitleggen met het oog op geloof en leven, en exegetische commentaren, die vooral vragen wat er staat en waarom: grammatica, achtergrond, samenhang.",
        "Matthew Henry is het bekendste voorbeeld van de eerste soort: warm, verhalend en steeds gericht op toepassing. Karl August Dachsel hoort meer bij de tweede, met veel aandacht voor de grondtekst. Johannes Calvijn combineert beide: nauwkeurig bij de tekst, en toch steeds met de lezer voor ogen. KingComments van Ger de Koning is hedendaags en in gewone taal geschreven, en volgt de tekst vers voor vers.",
        "Houd bij elk commentaar twee dingen in gedachten. Een commentaar is van zijn tijd: wie in de zeventiende of negentiende eeuw schreef, kende de archeologische vondsten van later niet. En elke uitlegger staat in een traditie. Dat is geen bezwaar, zolang je weet welke. De vier commentaren op deze site komen uit verschillende protestantse tradities, maar lezen de Bijbel alle vier als Gods Woord.",
      ],
      callout:
        "Lees bij een gedeelte dat ertoe doet twee commentaren van verschillende soort. Waar ze het eens zijn, sta je op vaste grond. Waar ze verschillen, zit meestal de vraag die je studie verder brengt.",
    },
    {
      id: "eerst-zelf-lezen",
      heading: "Lezen met uitleg zonder je eigen lezen over te slaan",
      body: [
        "Het grootste risico van een bijbel met uitleg is niet dat de uitleg fout is, maar dat je haar te vroeg leest. Wie eerst het commentaar opent, leest de tekst daarna door de bril van de uitlegger en ziet alleen nog wat die al zag. Je eigen vragen komen dan nooit boven.",
        "De Bereërs in Handelingen 17 worden geprezen omdat ze het onderwijs van Paulus niet zomaar overnamen, maar 'dagelijks de Schriften' onderzochten, 'of deze dingen alzo waren' (Handelingen 17:11, Statenvertaling). Met die houding lees je elke uitleg, ook een goede. Deze zes stappen helpen daarbij.",
      ],
      steps: [
        {
          title: "Lees het gedeelte twee keer zonder uitleg",
          text: "Eén keer voor de loop van het geheel, één keer langzaam. Noteer wat je opvalt, ook als je niet weet waarom.",
        },
        {
          title: "Schrijf je vragen op",
          text: "Welk woord is vreemd, welke overgang onlogisch, wat begrijp je niet? Drie vragen is genoeg. Dit is de stap die het verschil maakt: straks lees je het commentaar met een doel.",
        },
        {
          title: "Lees de inleiding van het boek",
          text: "Eén keer per bijbelboek, niet bij elk hoofdstuk. Wie weet aan wie Paulus schrijft en waarom, heeft de helft van de uitleg al.",
        },
        {
          title: "Open één commentaar, gericht",
          text: "Zoek het antwoord op je vragen. Lees de rest ook, maar houd je vragen ernaast: wat beantwoordt het commentaar, en wat slaat het over?",
        },
        {
          title: "Controleer de uitleg aan de tekst",
          text: "Vraag bij elke bewering: waar staat dat? Een uitleg die je in het gedeelte zelf niet terugvindt, is een mening en geen uitleg.",
        },
        {
          title: "Schrijf één zin op",
          text: "Wat zie je nu dat je eerst niet zag? Dat is wat de uitleg je heeft opgeleverd, en wat je volgende week nog weet.",
        },
      ],
      callout:
        "Vuistregel: eerst de tekst, dan je vragen, als laatste de uitleg. Wie die volgorde omdraait, leert wat de uitlegger denkt, niet wat er staat.",
    },
    {
      id: "voorbeeld-johannes-1",
      heading: "Voorbeeld: Johannes 1:1 in vijf lagen",
      body: [
        "Hoe de soorten uitleg elkaar aanvullen, zie je het best aan één vers. De Statenvertaling geeft Johannes 1:1 zo weer: 'In den beginne was het Woord, en het Woord was bij God, en het Woord was God.'",
      ],
      list: [
        {
          title: "Zelf lezen",
          text: "'Het Woord' komt drie keer terug, en de zin loopt op als een trap: het Woord was er, het was bij God, het was God. Je vraag: waarom noemt Johannes Jezus 'het Woord', en waarom begint hij niet bij de geboorte, zoals Mattheüs en Lukas?",
        },
        {
          title: "Verwijzingen",
          text: "De eerste woorden zijn die van Genesis 1:1: Johannes begint zijn evangelie waar de Bijbel begint. In Genesis 1 schept God door te spreken, wat Psalm 33:6 samenvat: 'Door het woord des HEEREN zijn de hemelen gemaakt' (Statenvertaling).",
        },
        {
          title: "Grondtekst",
          text: "'Woord' is het Griekse logos: het gewone woord voor een gesproken of geschreven woord, maar ook voor rede en verstand. Een Joodse lezer dacht erbij aan Gods scheppende spreken, een Griekse lezer aan de orde achter de wereld. Johannes kiest een woord dat beiden iets zei.",
        },
        {
          title: "Inleiding op het boek",
          text: "Johannes zegt aan het eind zelf waarom hij schreef: opdat de lezer gelooft dat Jezus de Christus is, de Zoon van God, en door te geloven leven heeft (Johannes 20:31). Vers 1 is de eerste stap daarvan: voordat het verhaal begint, zegt Johannes wie Jezus is.",
        },
        {
          title: "Commentaar",
          text: "Een commentaar brengt deze draden samen en wijst op wat je zelf niet snel ziet: het vers onderscheidt het Woord van God ('bij God') en zegt tegelijk dat het Woord God is. Daarin heeft de kerk van het begin af de Godheid van Christus beleden, die in vers 14 'vlees geworden' is.",
        },
      ],
      callout:
        "Geen van deze vijf lagen geeft op zichzelf het hele beeld. Samen, en in deze volgorde, wel.",
    },
    {
      id: "uitleg-op-bijbelstudie",
      heading: "Bijbel met uitleg op BijbelStudie: wat er is",
      body: [
        "Op BijbelStudie staan tekst en uitleg naast elkaar: het hoofdstuk aan de ene kant, aan de andere een paneel met commentaar, verwijzingen, grondtekst, algemene informatie over het boek, je eigen notities en een AI-assistent. Op een telefoon wissel je tussen de twee. Hieronder precies wat daarvan gratis is en wat bij Pro hoort.",
      ],
      list: [
        {
          title: "Gratis: de vertalingen",
          text: "De Statenvertaling, de NBG-vertaling 1951, De Heilige Schrift 1917 en de Canisiusbijbel 1939, plus Engelse vertalingen waaronder de King James Version. De NBG-vertaling 1951 wordt gebruikt onder licentie van het Nederlands-Vlaams Bijbelgenootschap.",
        },
        {
          title: "Gratis: het KingComments-commentaar",
          text: "Het hedendaagse vers-voor-vers commentaar van Ger de Koning op de hele Bijbel, volledig en zonder abonnement te lezen bij elk hoofdstuk.",
        },
        {
          title: "Gratis: verwijzingen en achtergrond",
          text: "Verwijzingen naar verwante bijbelplaatsen, algemene informatie over het bijbelboek en, waar beschikbaar, afbeeldingen van de plaatsen die in het hoofdstuk voorkomen.",
        },
        {
          title: "Gratis: een inleiding bij elk bijbelboek",
          text: "Voor alle 66 boeken een pagina met schrijver, ontstaanstijd, thema, hoofdlijn, kernverzen en studievragen. Daarvoor heb je geen account nodig.",
        },
        {
          title: "Pro: Matthew Henry, Calvijn en Dachsel",
          text: "De drie klassieke commentaren, in Nederlandse vertaling. Zonder abonnement lees je per hoofdstuk het begin van hun uitleg. Calvijn schreef niet over elk bijbelboek, dus zijn commentaar is er niet bij elk hoofdstuk.",
        },
        {
          title: "Pro: de volledige grondtekst",
          text: "Het Hebreeuws of Grieks bij elk vers, met transliteratie, een korte betekenis en het Strong-nummer. Zonder abonnement zie je het eerste vers van elk hoofdstuk.",
        },
        {
          title: "AI-assistent: 5 vragen per dag gratis, 200 met Pro",
          text: "Handig voor 'wat betekent dit woord' of 'waar komt dit nog meer voor'. Behandel het antwoord als dat van een belezen gesprekspartner en toets het aan de tekst.",
        },
      ],
      callout:
        "Wat er niet is: de aantekeningen van moderne studiebijbels. Die vallen onder auteursrecht. De uitleg hier komt uit de vier commentaren, de verwijzingen en de inleidingen per bijbelboek.",
    },
  ],
  faqs: [
    {
      q: "Waar kan ik de Bijbel met uitleg online lezen?",
      a: "Op BijbelStudie staan de bijbeltekst en de uitleg naast elkaar. Het KingComments-commentaar van Ger de Koning is bij elk hoofdstuk gratis en volledig te lezen; de commentaren van Matthew Henry, Calvijn en Dachsel horen bij Pro. Daarnaast heeft elk van de 66 bijbelboeken een eigen inleiding met hoofdlijn en studievragen, zonder account te lezen.",
    },
    {
      q: "Wat is het verschil tussen een studiebijbel en een bijbelverklaring?",
      a: "Een studiebijbel is een bijbel met korte aantekeningen bij de tekst: begrippen, plaatsen, maten en verwijzingen. Een bijbelverklaring of commentaar bespreekt een bijbelboek doorlopend, vaak vers voor vers, met ruimte voor achtergrond, afweging en toepassing. De eerste helpt je doorlezen, de tweede helpt je stilstaan.",
    },
    {
      q: "Welke bijbelverklaring past bij iemand die net begint?",
      a: "Een commentaar dat de tekst in gewone taal volgt en de toepassing niet overslaat. KingComments en Matthew Henry zijn allebei goed te lezen zonder theologische voorkennis. Een exegetisch commentaar zoals dat van Dachsel komt beter tot zijn recht als je al vragen hebt over de opbouw of de grondtekst. Lees vóór het commentaar de inleiding van het bijbelboek.",
    },
    {
      q: "Kun je uitleg bij de Bijbel zomaar vertrouwen?",
      a: "Uitleg is mensenwerk; de tekst zelf is waar het om gaat. Een goed commentaar is een betrouwbare gids, maar geen eindpunt. Controleer elke uitleg aan de tekst, lees bij belangrijke gedeelten twee commentaren van verschillende soort, en wees extra kritisch op een uitleg die je in het gedeelte zelf niet terugvindt.",
    },
  ],
  related: [
    {
      href: "/bijbelboeken",
      label: "De 66 bijbelboeken",
      description: "Een inleiding per boek: schrijver, tijd, hoofdlijn en studievragen.",
    },
    {
      href: "/bijbelboeken/johannes",
      label: "Het evangelie naar Johannes",
      description: "Hoofdlijn, kernverzen en studievragen bij het voorbeeld uit deze gids.",
    },
    {
      href: "/bijbelboeken/romeinen",
      label: "De brief aan de Romeinen",
      description: "Een dicht betoog waar een inleiding en een commentaar veel verschil maken.",
    },
    {
      href: "/bijbelstudie/vragen-en-antwoorden",
      label: "Bijbelstudie met vragen en antwoorden",
      description: "Welke vragen je stelt voordat je een commentaar opent, uitgewerkt op drie teksten.",
    },
    {
      href: "/bijbelstudie/methoden",
      label: "Bijbelstudie methoden",
      description: "Zes methoden uitgewerkt, elk met een concreet voorbeeld.",
    },
    {
      href: "/studies",
      label: "Begeleide studies",
      description: "Lessen waarin tekst, context en uitleg al voor je klaarstaan.",
    },
    {
      href: "/abonnement",
      label: "Wat zit er in Pro?",
      description: "Welke commentaren en onderdelen bij het abonnement horen, en wat het kost.",
    },
  ],
};
