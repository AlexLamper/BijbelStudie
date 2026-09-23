import type { Guide } from "./types";

/**
 * /bijbelstudie/vragen-en-antwoorden - target: "bijbelstudie met vragen en
 * antwoorden", "bijbelstudie vragen", "vragen bij bijbelstudie".
 *
 * The worked examples carry the page: questions with real answers, on three
 * passages people actually search for. The section on the guided studies is
 * checked against lib/studyFlow.ts (the six steps), components/study/flow/
 * StepQuiz.tsx (multiple choice, explanation after grading, answering required
 * but not answering correctly), lib/data/study-lessons/types.ts (the
 * Toepassing step and its practices) and lib/studyCompletion.ts (the answer
 * becomes a note).
 *
 * Scripture is quoted from the Statenvertaling only (public domain), sparingly
 * and with a reference. Every other passage is named by reference.
 */
export const GUIDE_QUESTIONS: Guide = {
  slug: "vragen-en-antwoorden",
  path: "/bijbelstudie/vragen-en-antwoorden",
  metadataKey: "guideQuestions",
  h1: "Bijbelstudie met vragen en antwoorden: drie teksten uitgewerkt",
  intro:
    "Welke vragen je stelt bij een bijbelgedeelte, in welke volgorde, en hoe een goed antwoord eruitziet - uitgewerkt op Psalm 23, Lukas 15 en Johannes 3, voor wie alleen studeert of een groep leidt.",
  datePublished: "2026-09-23",
  dateModified: "2026-09-23",
  readingMinutes: 10,
  sections: [
    {
      id: "waarom-vragen",
      heading: "Waarom vragen de kern van bijbelstudie zijn",
      body: [
        "Het verschil tussen een hoofdstuk lezen en een hoofdstuk bestuderen zit vooral in de vragen. Wie zonder vraag leest, leest over de tekst heen en onthoudt wat hij al wist. Wie met een vraag leest, moet terug naar de tekst om het antwoord te vinden, en ziet daarbij wat hij eerder miste.",
        "Jezus onderwees zelf zo. Een wetgeleerde vroeg wat hij moest doen om het eeuwige leven te beërven, en kreeg twee vragen terug: 'Wat is in de wet geschreven? Hoe leest gij?' (Lukas 10:26, Statenvertaling). De eerste vraag stuurt naar de tekst, de tweede naar de lezer.",
        "Een studievraag heeft een antwoord dat je in de tekst kunt aanwijzen: niet 'wat vind je hiervan?', maar 'waar gaat David over van Hij naar Gij?'. Om die te beantwoorden moet je kijken.",
      ],
    },
    {
      id: "drie-soorten-vragen",
      heading: "Drie soorten vragen: waarnemen, uitleggen, toepassen",
      body: [
        "Vrijwel elke methode voor bijbelstudie gebruikt deze drie soorten vragen, in deze volgorde. Wie bij de toepassing begint, vindt in de tekst precies wat hij er zelf in legde.",
      ],
      list: [
        {
          title: "Waarnemingsvragen: wat staat er?",
          text: "Wie spreekt, tegen wie, waar en wanneer? Welke woorden komen terug, wat wordt tegenover elkaar gezet, waar verandert de toon? Het antwoord staat letterlijk in de tekst. De meeste mensen slaan deze fase over, terwijl de beste ontdekkingen hier vandaan komen.",
        },
        {
          title: "Uitlegvragen: wat betekent het?",
          text: "Waarom staat dit hier? Wat betekende het voor wie het als eerste hoorde? Hoe hangt het samen met de context en met andere bijbelplaatsen? Hiervoor heb je vaak hulp nodig: een inleiding op het boek, een verwijzing, soms een commentaar.",
        },
        {
          title: "Toepassingsvragen: wat doe ik ermee?",
          text: "Wat leer ik hier over God? Wat vraagt dit van mij, deze week? Een goede toepassingsvraag volgt uit de uitleg en is zo concreet dat je over een week kunt nagaan of er iets mee gebeurd is.",
        },
      ],
      callout:
        "Een goede vraag is open, gaat over één ding tegelijk en is te beantwoorden met de tekst open. Vermijd vragen die met ja of nee af te doen zijn, en vragen waarop maar één antwoord 'mag'.",
    },
    {
      id: "psalm-23",
      heading: "Uitgewerkt: Psalm 23",
      body: [
        "Psalm 23 is zo bekend dat je de berijming meehoort voordat je een woord gezien hebt. Juist daarom is hij goed om mee te oefenen. Hij opent met 'De HEERE is mijn Herder, mij zal niets ontbreken' (Psalm 23:1, Statenvertaling). Lees hem helemaal en neem dan deze vragen, elk met een voorbeeldantwoord.",
      ],
      list: [
        {
          title: "Waarnemen: waar verandert de manier waarop David over God spreekt?",
          text: "In de verzen 1 tot 3 spreekt David óver God: 'Hij doet mij nederliggen … Hij verkwikt mijn ziel'. In vers 4, midden in het dal der schaduw des doods, spreekt hij Hem aan: 'want Gij zijt met mij'. Op het donkerste punt wordt de psalm een gebed.",
        },
        {
          title: "Uitleggen: krijgt wie God volgt alles wat hij wil?",
          text: "Nee. Het Hebreeuwse werkwoord voor 'ontbreken' staat ook in Deuteronomium 2:7, waar Mozes terugkijkt op veertig jaar woestijn: het volk heeft niets ontbroken. Makkelijk waren die jaren niet, maar God was erbij en gaf wat nodig was. Vers 3 wijst dezelfde kant op: de Herder leidt 'om Zijns Naams wil', niet naar de wensen van het schaap.",
        },
        {
          title: "Uitleggen: wat betekent het dat juist een koning dit zegt?",
          text: "David was herder voordat hij koning werd (1 Samuël 16:11), en koningen heetten in het oude Oosten de herders van hun volk. Als deze koning zegt 'de HEERE is mijn Herder', noemt hij zichzelf een schaap. In Johannes 10:11 neemt Jezus die naam op: Hij is de goede Herder, die zijn leven geeft voor de schapen - iets wat Psalm 23 nog niet zegt.",
        },
        {
          title: "Toepassen: waar is voor jou op dit moment het dal?",
          text: "De psalm belooft niet dat er geen dal komt, wel dat de Herder erin meegaat. Een goed antwoord noemt dus iets concreets - een ziekte, een zorg, een beslissing - en zegt wat het betekent dat God daar 'met mij' is. 'Het komt wel goed' mist waar de psalm om draait: niet de afloop, maar Wie erbij is.",
        },
      ],
    },
    {
      id: "lukas-15",
      heading: "Uitgewerkt: Lukas 15",
      body: [
        "Lukas 15 bevat drie gelijkenissen: het verloren schaap, de verloren penning en de verloren zoon. De aanleiding staat in vers 2, waar Farizeeën en schriftgeleerden mopperen: 'Deze ontvangt de zondaars, en eet met hen' (Lukas 15:2, Statenvertaling).",
      ],
      list: [
        {
          title: "Waarnemen: tegen wie vertelt Jezus deze gelijkenissen, en wat komt steeds terug?",
          text: "Tegen de mopperaars uit vers 2: 'Hij sprak tot hen' (vers 3). Alle drie volgen dezelfde lijn: iets raakt kwijt, wordt gevonden, en er volgt blijdschap die gedeeld moet worden. Let op de getallen: één van de honderd, één van de tien, één van de twee. Het verlies wordt steeds groter.",
        },
        {
          title: "Waarnemen: wat zegt de jongste zoon wel en niet tegen zijn vader?",
          text: "Hij bedenkt een toespraak die eindigt met 'maak mij als een van uw huurlingen' (vers 19). Thuis komt hij niet verder dan '… en ben niet meer waardig uw zoon genaamd te worden' (vers 21). Dan laat de vader het beste kleed, een ring en schoenen brengen. De zoon wordt als zoon ontvangen voordat hij kan vragen knecht te mogen worden.",
        },
        {
          title: "Uitleggen: waarom horen we niet of de oudste zoon naar binnen gaat?",
          text: "Omdat hij de mopperaars uit vers 2 vertegenwoordigt: altijd bij de vader gebleven, en toch buiten het feest, boos over de ontvangst van een zondaar. De vader gaat ook naar hém naar buiten (vers 28). Het open einde is een uitnodiging aan Jezus' toehoorders. Lukas 19:10 vat samen waarom: 'de Zoon des mensen is gekomen, om te zoeken en zalig te maken, dat verloren was'.",
        },
        {
          title: "Toepassen: lijk jij meer op de jongste of op de oudste zoon?",
          text: "Wie al jaren naar de kerk gaat, herkent zich bij eerlijk lezen vaak eerder in de oudste: trouw, en een beetje verontwaardigd als God royaal is voor iemand die het niet verdiend lijkt te hebben. Een goed antwoord noemt concreet waar je dat bij jezelf ziet, en leest dan opnieuw wat de vader in vers 31 tegen die zoon zegt.",
        },
      ],
    },
    {
      id: "johannes-3",
      heading: "Uitgewerkt: Johannes 3:1-21",
      body: [
        "In het gesprek met Nicodemus staat het bekendste vers van de Bijbel: 'Want alzo lief heeft God de wereld gehad, dat Hij Zijn eniggeboren Zoon gegeven heeft, opdat een iegelijk die in Hem gelooft, niet verderve, maar het eeuwige leven hebbe' (Johannes 3:16, Statenvertaling). Omdat dat vers zo vaak los geciteerd wordt, loont het om het terug te zetten in het gesprek.",
      ],
      list: [
        {
          title: "Waarnemen: wie is Nicodemus, en wanneer komt hij?",
          text: "Een Farizeeër, 'een overste der Joden' (vers 1), door Jezus 'een leraar van Israël' genoemd (vers 10). Hij komt 's nachts. Later neemt hij het voorzichtig voor Jezus op (7:50-51) en helpt hij bij Jezus' begrafenis (19:39). Wie in het donker kwam, staat aan het eind openlijk bij het graf.",
        },
        {
          title: "Waarnemen: welk misverstand ontstaat er?",
          text: "Jezus zegt dat niemand het Koninkrijk Gods kan zien 'tenzij dat iemand wederom geboren worde' (vers 3); Nicodemus denkt aan een tweede natuurlijke geboorte. Het Griekse anōthen betekent zowel 'opnieuw' als 'van boven', en Johannes gebruikt het in 3:31 en 19:11 in die tweede betekenis. Jezus bedoelt een geboorte die van God uitgaat.",
        },
        {
          title: "Uitleggen: waarom noemt Jezus de koperen slang (vers 14)?",
          text: "In Numeri 21 bleef leven wie gebeten was en opkeek naar de koperen slang op de paal. Zo moet de Zoon des mensen 'verhoogd' worden - volgens Johannes 12:32-33 aan het kruis. De vergelijking zit in het opzien: redding komt niet door iets te doen, maar door te zien op wat God gaf. Vers 16 zegt daarna hetzelfde zonder beeld.",
        },
        {
          title: "Toepassen: wat verandert er als vers 16 een antwoord aan Nicodemus is?",
          text: "Het is gezegd tegen een vrome, geleerde man die dacht er al bij te horen. Het antwoord is niet 'doe meer je best', maar: het leven is een geschenk van Gods liefde, ontvangen door te geloven. Een eerlijke toepassing vraagt waar je zelf op vertrouwt: op wat je doet en weet, of op wat God gegeven heeft.",
        },
      ],
    },
    {
      id: "alleen-of-in-een-groep",
      heading: "Vragen gebruiken, alleen of in een groep",
      body: [
        "Wie alleen studeert: schrijf je antwoorden op. Een antwoord dat je alleen denkt, voelt af terwijl het nog vaag is; op papier merk je waar het hapert. Beantwoord de waarnemingsvragen voordat je een commentaar opent, en zoek bij uitlegvragen pas hulp na een eigen poging. Vijf tot acht vragen per gedeelte is genoeg.",
        "In een groep zijn de vragen er niet om te controleren wie het antwoord weet, maar om iedereen de tekst in te krijgen. Een avond van een uur tot anderhalf uur kan zo lopen.",
      ],
      steps: [
        {
          title: "Lees het gedeelte hardop",
          text: "Door één persoon of per alinea door een ander. Iedereen heeft de tekst open.",
        },
        {
          title: "Begin met een vraag die iedereen kan beantwoorden",
          text: "Een waarnemingsvraag, zoals: wat komt in alle drie de gelijkenissen terug? Zo praat ook de stilste deelnemer in de eerste tien minuten mee.",
        },
        {
          title: "Laat stilte vallen",
          text: "Tien seconden wachten na een vraag voelt lang, maar dan wordt er nagedacht.",
        },
        {
          title: "Vraag steeds: waar staat dat?",
          text: "Als gewoonte, niet als correctie. Het houdt het gesprek bij de tekst en voorkomt dat de stelligste deelnemer de uitleg bepaalt.",
        },
        {
          title: "Bewaar een kwart van de tijd voor de toepassing",
          text: "Houd het concreet: wat doe je deze week anders? Sluit af met gebed over wat het gedeelte liet zien.",
        },
      ],
      callout:
        "Wie de groep leidt, hoeft niet alle antwoorden te weten. Wel moet hij de vragen voorbereid hebben en durven zeggen: dat weet ik niet, laten we het uitzoeken.",
    },
    {
      id: "vragen-in-de-studies",
      heading: "Zo werken de vragen in de begeleide studies",
      body: [
        "Op BijbelStudie doorloopt elke les van een begeleide studie zes stappen: Inleiding, Bijbelse context, Lezen, Verdieping, Toetsing en Toepassing. De vragen staan in de volgorde die hierboven werd aangeraden: eerst of je het gedeelte begrepen hebt, daarna wat je ermee doet.",
      ],
      list: [
        {
          title: "Een focusvraag bij elke les",
          text: "Die geeft richting aan het lezen. In de studie over Abraham luidt hij bij Genesis 22: waarom vroeg God dit, en hoe wijst het vooruit naar Jezus?",
        },
        {
          title: "Toetsing: een korte quiz",
          text: "Meerkeuzevragen over het gedeelte, met na je antwoord het juiste antwoord en een korte uitleg. Antwoorden is nodig om de les af te ronden, alles goed hebben niet. Nog niet bij elk gedeelte zijn quizvragen beschikbaar.",
        },
        {
          title: "Toepassing: een persoonlijke vraag",
          text: "Met een paar concrete dingen om die week te doen. Wat je opschrijft, wordt na de les bewaard als notitie.",
        },
        {
          title: "Studievragen bij elk bijbelboek",
          text: "Op de pagina van elk van de 66 bijbelboeken, naast de hoofdlijn en de kernverzen.",
        },
      ],
      callout:
        "Psalm 23 komt terug in de studie over David. Voor een groep zijn de Bergrede (zes lessen) en de Psalmen (vijf lessen) goede eerste studies: elke les behandelt één afgerond gedeelte.",
    },
  ],
  faqs: [
    {
      q: "Wat zijn goede vragen voor een bijbelstudie?",
      a: "Vragen die je met de tekst open kunt beantwoorden en die over één ding tegelijk gaan. Begin met waarnemen (wie, wat, waar, wat komt terug), ga dan naar uitleggen (waarom staat dit hier, wat betekende het toen) en eindig met een of twee concrete toepassingsvragen.",
    },
    {
      q: "Hoeveel vragen gebruik je bij één bijbelgedeelte?",
      a: "Vijf tot acht: ongeveer de helft waarnemingsvragen, een paar uitlegvragen en een of twee toepassingsvragen. In een groep liever minder vragen en meer tijd per vraag.",
    },
    {
      q: "Waar vind ik bijbelstudievragen met antwoorden?",
      a: "Deze gids werkt vragen en antwoorden uit bij Psalm 23, Lukas 15 en Johannes 3. Op de pagina's van de 66 bijbelboeken staan studievragen per boek, en de begeleide studies hebben per les een focusvraag, een quiz met uitleg en een toepassingsvraag.",
    },
    {
      q: "Heeft elke bijbelstudievraag één goed antwoord?",
      a: "Waarnemingsvragen wel: het antwoord staat in de tekst. Bij uitlegvragen verschillen uitleggers soms; zeg dat dan eerlijk en weeg de argumenten. Toepassingsvragen hebben per persoon een ander antwoord, maar een goede toepassing volgt uit wat de tekst zegt, niet uit wat je er graag in leest.",
    },
  ],
  related: [
    {
      href: "/studies",
      label: "Begeleide studies",
      description: "Studies met per les een focusvraag, een quiz en een toepassingsvraag.",
    },
    {
      href: "/studies/david",
      label: "David - naar Gods hart",
      description: "Zeven lessen over het leven van David, met Psalm 23.",
    },
    {
      href: "/studies/abraham",
      label: "Het geloof van Abraham",
      description: "Acht lessen, van de roeping uit Ur tot de berg Moria.",
    },
    {
      href: "/studies/bergrede",
      label: "De Bergrede",
      description: "Mattheüs 5 tot 7 in zes lessen.",
    },
    {
      href: "/studies/psalmen",
      label: "Psalmen - bidden met woorden van God",
      description: "Vijf psalmen, van klaagzang tot lofzang.",
    },
    {
      href: "/bijbelstudie/methoden",
      label: "Bijbelstudie methoden",
      description: "Zes methoden uitgewerkt, elk met een concreet voorbeeld.",
    },
    {
      href: "/bijbelstudie/bijbel-met-uitleg",
      label: "Bijbel met uitleg online",
      description: "Hoe je een commentaar gebruikt bij de uitlegvragen.",
    },
  ],
};
