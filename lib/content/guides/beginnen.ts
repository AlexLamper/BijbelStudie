import type { Guide } from "./types";

/**
 * /bijbelstudie/beginnen - target: "bijbelstudie voor beginners", "hoe begin ik met bijbelstudie".
 *
 * Rewritten 2026-09-23 after Search Console reported it "Gecrawld - momenteel
 * niet geïndexeerd". Four of its six sections restated the hub (/bijbelstudie):
 * the same three things you need, the same six-step first session on Markus 1,
 * the same pitfalls and two of the same FAQs. Google had no reason to index a
 * second page answering the hub's questions.
 *
 * The page now owns what the hub does not do: the reading route. How the Bible
 * is put together, which book fits which question, and a day-by-day plan with a
 * question per day whose answer is in the chapter itself. The study method
 * stays on the hub and /bijbelstudie/methoden; this page links there instead
 * of repeating it. Keep it that way when editing either page.
 */
export const GUIDE_START: Guide = {
  slug: "beginnen",
  path: "/bijbelstudie/beginnen",
  metadataKey: "guideStart",
  h1: "Bijbelstudie voor beginners: zo begin je",
  intro:
    "Nooit eerder de Bijbel bestudeerd? Dit is een route, geen theorie: hoe de Bijbel in elkaar zit, welk boek bij jouw vraag past, en een plan van dertig dagen met voor elke dag een hoofdstuk en één vraag om mee te nemen.",
  datePublished: "2026-08-21",
  dateModified: "2026-09-23",
  readingMinutes: 18,
  sections: [
    {
      id: "zo-zit-de-bijbel-in-elkaar",
      heading: "Eerst: hoe de Bijbel in elkaar zit",
      body: [
        "De Bijbel is geen boek maar een bibliotheek: 66 boeken, geschreven over een periode van meer dan duizend jaar, in het Hebreeuws, het Aramees en het Grieks. Protestantse bijbels tellen 39 boeken in het Oude Testament en 27 in het Nieuwe; rooms-katholieke uitgaven hebben in het Oude Testament enkele boeken meer.",
        "Wie weet in welk deel van die bibliotheek hij staat, leest anders. Een wet lees je niet als een gedicht, en een brief niet als een verhaal. In een protestantse bijbel staan de boeken in deze zes afdelingen, in deze volgorde.",
        "Hoofdstukken en verzen stonden niet in de oorspronkelijke tekst. De hoofdstukindeling is in de dertiende eeuw aangebracht, de versnummering van het Nieuwe Testament in 1551. Een hoofdstukgrens valt daardoor soms midden in een gedachte: lees bij twijfel de laatste verzen van het vorige hoofdstuk mee.",
      ],
      list: [
        {
          title: "De wet: Genesis t/m Deuteronomium",
          text: "De vijf boeken van Mozes. Het begin van de wereld, de aartsvaders, de uittocht uit Egypte en de wetten voor Israël.",
        },
        {
          title: "De geschiedenis: Jozua t/m Esther",
          text: "Israël in het beloofde land: de richters, de koningen, de ballingschap in Babel en de terugkeer.",
        },
        {
          title: "Poëzie en wijsheid: Job t/m Hooglied",
          text: "Gebeden, liederen en levenswijsheid. Hier staan de Psalmen en de Spreuken.",
        },
        {
          title: "De profeten: Jesaja t/m Maleachi",
          text: "Boodschappen aan Israël en de volken, vaak in beeldende taal en in dichtvorm.",
        },
        {
          title: "Evangeliën en Handelingen: Mattheüs t/m Handelingen",
          text: "Het leven van Jezus, vier keer verteld vanuit een eigen invalshoek, en het ontstaan van de eerste gemeenten.",
        },
        {
          title: "Brieven en Openbaring: Romeinen t/m Openbaring",
          text: "Eenentwintig brieven aan gemeenten en personen, en tot slot het profetische boek Openbaring.",
        },
      ],
      callout:
        "Een verwijzing als Markus 4:35-41 betekent: het boek Markus, hoofdstuk 4, vers 35 tot en met 41. Zo zijn alle verwijzingen in deze gids geschreven.",
    },
    {
      id: "waar-beginnen",
      heading: "Waar begin je? Kies op grond van je vraag",
      body: [
        "Niet op bladzijde één. Wie bij Genesis begint en doorleest, komt na een paar weken in Leviticus terecht: offerwetten en reinheidsregels die veel achtergrond vragen. Daar haken de meeste beginners af, en dat zegt niets over hun doorzettingsvermogen.",
        "Kies daarom een ingang die past bij wat je wilt weten. Het dertigdagenplan verderop begint bij Markus, maar als een van de andere vragen meer bij je past, kun je ook daar beginnen.",
      ],
      list: [
        {
          title: "Wie is Jezus eigenlijk?",
          text: "Markus. Zestien hoofdstukken, kort en in hoog tempo verteld. Het is ook het boek waarmee het plan hieronder begint.",
        },
        {
          title: "Hoe begint het verhaal?",
          text: "Genesis 1 t/m 12: schepping, zondeval, de vloed, de toren van Babel en de roeping van Abraham. De rest van de Bijbel grijpt steeds op deze hoofdstukken terug.",
        },
        {
          title: "Ik zoek woorden voor gebed, twijfel of verdriet",
          text: "De Psalmen. Begin bij Psalm 23, 42 en 139, en lees er één per keer. Een psalm is een gedicht: langzaam lezen, liefst hardop.",
        },
        {
          title: "Hoe geloof je in het gewone leven?",
          text: "Jakobus, vijf korte hoofdstukken, of Spreuken: 31 hoofdstukken, één voor elke dag van de maand.",
        },
        {
          title: "Hoe is de kerk begonnen?",
          text: "Handelingen, het vervolg op het evangelie van Lucas. Achtentwintig hoofdstukken over de eerste gemeenten en de reizen van Paulus.",
        },
        {
          title: "Ik heb maar weinig tijd",
          text: "Ruth of Jona, elk vier hoofdstukken. In één avond uit, en toch genoeg om weken over na te denken.",
        },
      ],
      callout:
        "Bewaar Leviticus, Ezechiël, Daniël en Openbaring voor later. Ze zijn niet minder waard, maar ze leunen zwaar op de rest van de Bijbel. Na een paar maanden lezen ze heel anders.",
    },
    {
      id: "een-dag",
      heading: "Zo ziet een dag eruit: een kwartier",
      body: [
        "Het plan hieronder vraagt geen uur per dag. Eén hoofdstuk, één vraag, twee zinnen. Wie wil, begint met een kort gebed om aandacht; verder heb je alleen een bijbel en een schrift nodig.",
        "Dit is bewust lichter dan een volledige studie. De eerste maand gaat het om de gewoonte en om leren waarnemen wat er staat. Een hoofdstuk echt uitdiepen, met vergelijken en commentaren, komt daarna: daarvoor staat in de complete gids over bijbelstudie een uitgebreider stappenplan.",
      ],
      steps: [
        {
          title: "Lees het hoofdstuk één keer door (5 minuten)",
          text: "Zonder te stoppen, zoals je een verhaal leest. Wat je niet begrijpt, sla je voorlopig over.",
        },
        {
          title: "Beantwoord de vraag van de dag (5 minuten)",
          text: "Blader terug in het hoofdstuk. De vragen zijn zo gekozen dat het antwoord in de tekst zelf staat, niet in een commentaar.",
        },
        {
          title: "Schrijf twee zinnen op (5 minuten)",
          text: "Eén zin: wat gebeurt er, of wat wordt er gezegd? Eén zin: welke vraag blijft er over? Die open vragen zijn over een maand je beste studiemateriaal.",
        },
      ],
    },
    {
      id: "dertig-dagen",
      heading: "Het plan: dertig dagen, dag voor dag",
      body: [
        "Vier weken met elk een vaste inhaaldag. Je leest eerst het evangelie van Markus, wisselt in week drie naar de Psalmen en eindigt met de brief aan de Filippenzen: verhaal, poëzie en brief, de drie soorten tekst die je in de rest van de Bijbel het vaakst tegenkomt.",
        "Mis je een dag, ga dan verder waar je was en gebruik de inhaaldag. Opnieuw beginnen bij dag 1 is de snelste manier om te stoppen.",
      ],
      steps: [
        {
          title: "Dag 1 - Markus 1",
          text: "Wat zegt het eerste vers over Jezus, en wat laat de rest van het hoofdstuk van hem zien?",
        },
        {
          title: "Dag 2 - Markus 2",
          text: "Waar nemen mensen in dit hoofdstuk aanstoot aan, en hoe antwoordt Jezus telkens?",
        },
        {
          title: "Dag 3 - Markus 3",
          text: "Wie horen er bij Jezus, en wie niet? Let op wat zijn familie doet in vers 21 en in vers 31-35.",
        },
        {
          title: "Dag 4 - Markus 4",
          text: "Welke vraag stellen de discipelen aan het slot (vers 41), en waarom zijn ze nog steeds bang als de storm al voorbij is?",
        },
        {
          title: "Dag 5 - Markus 5",
          text: "Drie mensen in nood. Wat hebben ze gemeen, en waarom wordt het verhaal van Jaïrus halverwege onderbroken?",
        },
        {
          title: "Dag 6 - Markus 6",
          text: "Het verhaal over de dood van Johannes de Doper staat tussen het uitzenden en het terugkomen van de twaalf discipelen. Waarom zou Markus het daar plaatsen?",
        },
        {
          title: "Dag 7 - Inhaaldag",
          text: "Haal een gemiste dag in, of lees je aantekeningen van deze week terug. Welke vraag kwam vaker dan één keer op?",
        },
        {
          title: "Dag 8 - Markus 7",
          text: "Wat maakt een mens volgens Jezus onrein, en wat juist niet (vers 14-23)?",
        },
        {
          title: "Dag 9 - Markus 8",
          text: "Petrus zegt wie Jezus is (vers 29). Waarom gaat het direct daarna mis tussen hen (vers 31-33)?",
        },
        {
          title: "Dag 10 - Markus 9",
          text: "Jezus spreekt opnieuw over zijn lijden (vers 31). Waar hebben de discipelen het onderweg over (vers 33-34)?",
        },
        {
          title: "Dag 11 - Markus 10",
          text: "Zet het verzoek van Jakobus en Johannes (vers 35-37) naast wat Jezus in vers 45 over zichzelf zegt.",
        },
        {
          title: "Dag 12 - Markus 11",
          text: "Het verhaal van de vijgenboom is in tweeën geknipt, met de tempel ertussen. Wat zegt het ene over het andere?",
        },
        {
          title: "Dag 13 - Markus 12",
          text: "Welke vragen krijgt Jezus in dit hoofdstuk, van wie, en met welke bedoeling?",
        },
        {
          title: "Dag 14 - Inhaaldag",
          text: "Haal een gemiste dag in, of zoek de drie keer op dat Jezus zijn lijden aankondigt: Markus 8:31, 9:31 en 10:33-34. Wat doen de discipelen telkens direct daarna?",
        },
        {
          title: "Dag 15 - Markus 13",
          text: "Het moeilijkste hoofdstuk van Markus. Schrijf op wat je niet begrijpt, en let op welke oproep aan het slot steeds terugkomt.",
        },
        {
          title: "Dag 16 - Markus 14",
          text: "Zet de belofte van Petrus (vers 29-31) naast wat hij aan het eind van het hoofdstuk doet (vers 66-72).",
        },
        {
          title: "Dag 17 - Markus 15",
          text: "Wie zegt in dit hoofdstuk wie Jezus is? Lees vers 39 en blader dan terug naar het eerste vers van Markus.",
        },
        {
          title: "Dag 18 - Markus 16",
          text: "Hoe reageren de vrouwen op wat ze bij het graf horen (vers 8)? Sommige uitgaven vermelden bij vers 9-20 dat de oudste handschriften bij vers 8 eindigen.",
        },
        {
          title: "Dag 19 - Psalm 1",
          text: "Welke twee wegen beschrijft deze psalm, en met welke beelden?",
        },
        {
          title: "Dag 20 - Psalm 23",
          text: "Halverwege verandert het beeld: van herder naar gastheer. Bij welk vers gebeurt dat?",
        },
        {
          title: "Dag 21 - Inhaaldag",
          text: "Haal een gemiste dag in, of kijk terug: poëzie leest anders dan een verhaal. Wat deed je bij de psalmen anders dan bij Markus?",
        },
        {
          title: "Dag 22 - Psalm 51",
          text: "Lees eerst het opschrift boven de psalm en daarna 2 Samuël 12:1-13. Wat vraagt David in deze psalm allemaal van God?",
        },
        {
          title: "Dag 23 - Psalm 139",
          text: "Waar gaat de verwondering van de dichter aan het slot over in een gebed (vers 23-24)?",
        },
        {
          title: "Dag 24 - Filippenzen 1",
          text: "Paulus zit gevangen (vers 13). Waarover is hij toch blij?",
        },
        {
          title: "Dag 25 - Filippenzen 2",
          text: "Welke voorbeelden houdt Paulus zijn lezers voor? Let naast Christus (vers 5-11) ook op Timotheüs en Epafroditus.",
        },
        {
          title: "Dag 26 - Filippenzen 3",
          text: "Wat stond bij Paulus vroeger aan de winstkant (vers 4-6), en waarom schrijft hij het nu af als verlies (vers 7-8)?",
        },
        {
          title: "Dag 27 - Filippenzen 4",
          text: "Paulus zegt dat hij geleerd heeft tevreden te zijn (vers 11-13). Waar heeft hij dat geleerd?",
        },
        {
          title: "Dag 28 - Inhaaldag",
          text: "De laatste inhaaldag. Maak af wat nog openstaat, zodat je de laatste twee dagen met een volledig schrift begint.",
        },
        {
          title: "Dag 29 - Lees je aantekeningen terug",
          text: "Alles van de afgelopen vier weken. Zet een streep onder de drie vragen die nog openstaan.",
        },
        {
          title: "Dag 30 - Kies je volgende boek",
          text: "Kies op grond van een van die drie vragen. Na Markus ligt Handelingen voor de hand, of een ingang uit het rijtje hierboven.",
        },
      ],
    },
    {
      id: "eerste-vragen",
      heading: "Vragen die je de eerste weken tegenkomt",
      body: [
        "Bij het lezen van Markus en de Psalmen lopen bijna alle beginners tegen dezelfde vragen aan. Hier zijn korte antwoorden, zodat ze je niet een hele avond ophouden.",
      ],
      list: [
        {
          title: "Waarom staat HEERE soms in hoofdletters?",
          text: "Zo geven de Statenvertaling (HEERE) en de NBG-vertaling 1951 (HERE) de Hebreeuwse eigennaam van God weer, die in het Oude Testament duizenden keren voorkomt. Staat er 'Heere' of 'Here' in gewone letters, dan gaat het meestal om een ander Hebreeuws woord, dat 'heer' betekent.",
        },
        {
          title: "Wie zijn de Farizeeën en de schriftgeleerden?",
          text: "Farizeeën waren een beweging van vrome Joden die de wet tot in detail wilden naleven; schriftgeleerden waren kenners en uitleggers van die wet. In Markus zijn ze vaak de tegenspelers van Jezus, maar niet allemaal: in Markus 12:28-34 zegt Jezus tegen een schriftgeleerde dat hij niet ver van het koninkrijk van God is.",
        },
        {
          title: "Waarom zegt Jezus zo vaak dat mensen niets mogen vertellen?",
          text: "Het valt in Markus direct op, bijvoorbeeld in 1:44 en 8:30. Uitleggers spreken van het 'messiasgeheim'. Een veelgenoemde verklaring is dat Jezus niet bekend wil worden als wonderdoener of politieke bevrijder voordat duidelijk is wat voor Messias hij is. Houd het vast als vraag: vanaf hoofdstuk 8 wordt het helderder.",
        },
        {
          title: "Wat betekent 'de Zoon des mensen'?",
          text: "Zo noemt Jezus zichzelf het vaakst. De uitdrukking gaat terug op Daniël 7:13-14, waar iemand 'als eens mensen Zoon' (Statenvertaling) met de wolken des hemels komt en van God heerschappij ontvangt. Tegelijk klinkt er gewoon 'mens' in door. In Markus 8:31 en 10:45 zie je beide kanten.",
        },
        {
          title: "Waarom kloppen de versnummers van de Psalmen niet met een Engelse bijbel?",
          text: "In Nederlandse vertalingen als de Statenvertaling telt het opschrift boven een psalm mee als vers, soms als twee. Engelse vertalingen beginnen te tellen bij de eerste regel van het lied, waardoor de nummers een of twee verzen verschillen. Zoek je een psalmvers op, gebruik dan de nummering van je eigen vertaling.",
        },
        {
          title: "Wat doe ik met een tekst die me schokt of die ik niet kan geloven?",
          text: "Schrijf hem op en lees door. Veel beginners lopen vast op een hard verhaal of een scherpe uitspraak. Dat is geen reden om te stoppen, maar een goede vraag voor later: voor een commentaar, een bijbelkring of iemand die er al langer mee bezig is.",
        },
      ],
    },
    {
      id: "valkuilen-eerste-maand",
      heading: "Valkuilen in de eerste maand",
      body: [
        "De fouten die beginners maken, zitten zelden in de uitleg. Ze zitten in de aanpak: te veel, te snel, te duur. Zes die je kunt vermijden zodra je ze kent.",
      ],
      list: [
        {
          title: "Beginnen met een jaarplan",
          text: "Een schema om de Bijbel in een jaar uit te lezen vraagt drie tot vier hoofdstukken per dag en brengt je rond februari bij Leviticus. Voor een eerste maand is één hoofdstuk per dag genoeg.",
        },
        {
          title: "Opnieuw beginnen na een gemiste dag",
          text: "Wie na een gemiste week weer bij dag 1 begint, leest Markus 1 vijf keer en Markus 16 nooit. Ga verder waar je was.",
        },
        {
          title: "Elk onbekend woord meteen opzoeken",
          text: "Dan kom je nooit aan het eind van een hoofdstuk. Zet een streep onder het woord en zoek er na afloop hooguit één op.",
        },
        {
          title: "Alleen de bekende verzen lezen",
          text: "Losse bekende teksten geven houvast, maar geen overzicht. Een heel boek achter elkaar laat zien waar die verzen thuishoren en wat eromheen staat.",
        },
        {
          title: "Eerst alles willen aanschaffen",
          text: "Een studiebijbel, drie commentaren en een nieuwe app, nog voor je een hoofdstuk hebt gelezen. Begin met een bijbel en een schrift, en zoek pas een hulpmiddel als je een vraag hebt die erom vraagt.",
        },
        {
          title: "Je meten aan anderen",
          text: "In een kring of een kerk lijkt het alsof iedereen alles al weet. Ook zij zijn ooit bij het eerste hoofdstuk begonnen, en de meesten hebben vragen die ze niet hardop stellen.",
        },
      ],
    },
    {
      id: "na-dertig-dagen",
      heading: "Na de dertig dagen",
      body: [
        "Na een maand heb je een gewoonte, een schrift vol vragen en een eerste indruk van drie soorten bijbeltekst. De volgende stap is kiezen wat je verder wilt: doorlezen, of dieper gaan.",
      ],
      list: [
        {
          title: "Doorlezen",
          text: "Handelingen sluit aan op de evangeliën en vertelt hoe het verderging. Of lees Lucas, een uitgebreider evangelie, nu je Markus nog vers in je hoofd hebt: je ziet meteen wat Lucas toevoegt.",
        },
        {
          title: "Een methode kiezen",
          text: "Wil je één gedeelte grondig bestuderen, kies dan een methode die bij je vraag past: inductief, thematisch, biografisch of een woordstudie. De pagina over bijbelstudie methoden werkt ze elk uit met een voorbeeld.",
        },
        {
          title: "Een begeleide studie volgen",
          text: "Op BijbelStudie kun je elk hoofdstuk bestuderen in zes stappen: inleiding, bijbelse context, lezen, verdieping, toetsing en toepassing. Dat is gratis, en je voortgang wordt bijgehouden.",
        },
      ],
    },
  ],
  faqs: [
    {
      q: "Welk bijbelboek lees ik als beginner het eerst?",
      a: "Markus: zestien korte hoofdstukken, van de doop van Jezus tot zijn opstanding, in ruim twee weken uit. Zoek je iets anders, kies dan op grond van je vraag: Genesis 1 t/m 12 voor het begin van het verhaal, de Psalmen voor gebed en twijfel, Jakobus voor het dagelijks leven, of Ruth en Jona als je weinig tijd hebt.",
    },
    {
      q: "Hoeveel tijd kost het dertigdagenplan per dag?",
      a: "Ongeveer een kwartier: één hoofdstuk lezen, de vraag van de dag beantwoorden en twee zinnen opschrijven. Elke zevende dag is een inhaaldag, dus een drukke dag hoeft het plan niet te breken.",
    },
    {
      q: "Wat doe ik als ik een dag van het plan mis?",
      a: "Ga verder waar je gebleven was en gebruik de inhaaldag aan het eind van de week. Begin niet opnieuw bij dag 1: wie steeds opnieuw begint, komt nooit verder dan het eerste hoofdstuk.",
    },
    {
      q: "Welke vertaling gebruik ik voor dit plan?",
      a: "Elke vertaling werkt; de verwijzingen volgen de nummering van de Statenvertaling en de NBG-vertaling 1951. Vind je de Statenvertaling lastig om te volgen, lees dan de NBG-vertaling 1951 en leg de Statenvertaling er af en toe naast. Waar ze verschillen, zit vaak een goede vraag.",
    },
    {
      q: "Kan ik het plan samen met iemand doen?",
      a: "Ja, en het helpt om vol te houden. Lees op dezelfde dag hetzelfde hoofdstuk en stuur elkaar je twee zinnen. Eén keer per week samen de open vragen bespreken is genoeg.",
    },
  ],
  related: [
    {
      href: "/bijbelstudie",
      label: "Bijbelstudie: de complete gids",
      description: "Wat bijbelstudie is, en een stappenplan om één hoofdstuk echt uit te diepen.",
    },
    {
      href: "/bijbelstudie/methoden",
      label: "Bijbelstudie methoden",
      description: "Zes methoden voor na de eerste maand, elk met een voorbeeld.",
    },
    {
      href: "/bijbelboeken/markus",
      label: "Het boek Markus",
      description: "Achtergrond en hoofdlijn van het boek waarmee het plan begint.",
    },
    {
      href: "/bijbelboeken/psalmen",
      label: "Het boek Psalmen",
      description: "Achtergrond bij de psalmen uit week drie en vier.",
    },
    {
      href: "/bijbelboeken/filippenzen",
      label: "De brief aan de Filippenzen",
      description: "Achtergrond bij de brief waarmee het plan eindigt.",
    },
    {
      href: "/studies",
      label: "Begeleide studies",
      description: "Elk hoofdstuk stap voor stap bestuderen, gratis.",
    },
  ],
};
