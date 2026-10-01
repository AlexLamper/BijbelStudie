import type { LessonContent } from './types';

/**
 * "De opstanding van Jezus" - 3 lessen. Johannes 20 en Handelingen 2.
 *
 * Reference implementation for authored lesson content: every optional field is
 * filled in here so the shape is visible at a glance. Other studies may fill in
 * as much or as little as they like; lib/studyFlow.ts falls back for the rest.
 */
export const opstandingLessons: Record<number, LessonContent> = {
  1: {
    intro: {
      headline: 'Het graf is open, en niemand begrijpt het',
      body: [
        'Johannes vertelt de opstanding niet als een triomftocht. Hij begint in het donker, met een vrouw die huilt en een steen die weg is. De eerste reactie op het lege graf is geen geloof, maar verwarring.',
        'Dat is opmerkelijk. Wie een verhaal wil verzinnen dat overtuigt, kiest geen vrouwen als eerste getuigen - hun getuigenis telde in die tijd nauwelijks mee voor de rechtbank. Juist die keuze maakt het verslag geloofwaardiger, niet minder.',
      ],
      watchFor: [
        'Hoe vaak het woord "zien" terugkomt, en wat er telkens precies gezien wordt',
        'Het verschil tussen wat Petrus doet en wat "de andere discipel" doet',
        'Waarom Maria zich omdraait - twee keer',
      ],
    },
    word: {
      readingCue: 'Lees de tekst aandachtig en neem de tijd. Let op wat de getuigen zien, en hoe zij daarop reageren.',
    },
    depth: {
      body: [
        'De doeken die blijven liggen zijn geen detail. Een geroofd lichaam neem je mee inclusief de doeken; je wikkelt het niet eerst uit. De zweetdoek die apart opgerold ligt, wijst op orde, niet op haast.',
      ],
      terms: [
        { term: 'de eerste dag der week', meaning: 'De zondag. Voor Joodse lezers begon de week met deze dag - een nieuw begin, niet het einde van een oude week.' },
        { term: 'Rabbouni', meaning: 'Aramees voor "mijn Meester". Een intiemere, persoonlijkere aanspreekvorm dan het gewone "rabbi".' },
      ],
    },
    reflection: {
      question: 'Waar merk jij dat Jezus jou kent?',
      practices: [
        'Schrijf op waaraan jij Jezus herkent als je Hem niet ziet: welke woorden, welke momenten.',
        'Lees dit gedeelte deze week nog een keer hardop, en let alleen op wat er gezien wordt.',
        'Vertel iemand waarom de eerste getuigen vrouwen waren, en wat dat over het verslag zegt.',
      ],
      memoryVerse: 'Johannes 20:16',
      prompts: [
        'Wat valt je op in dit verhaal?',
        'Waaraan herkent Maria Jezus?',
        'Wat wil jij deze week met dit verhaal doen?',
      ],
      placeholder: 'Schrijf op wat je opviel...',
      noteTags: ['opstanding', 'Johannes 20'],
    },
  },

  2: {
    intro: {
      headline: 'Twijfel krijgt een naam',
      body: [
        'Thomas wordt vaak neergezet als de ongelovige. Maar hij vraagt alleen om precies datgene wat de andere discipelen al gekregen hadden: Jezus zien, met de wonden erbij. Zijn eis is niet groter dan hun ervaring.',
        'En het antwoord dat hij krijgt is geen verwijt maar een uitnodiging. Jezus komt terug, speciaal voor hem, en biedt hem letterlijk aan wat hij vroeg.',
      ],
      watchFor: [
        'Dat Jezus twee keer hetzelfde zegt: "Vrede zij ulieden"',
        'Wat Jezus doet met de wonden - Hij verbergt ze niet',
        'De belijdenis van Thomas, en hoe ver die gaat',
      ],
    },
    word: {
      readingCue: 'Let op het verschil tussen wat Thomas eist en wat hij uiteindelijk zegt.',
    },
    depth: {
      body: [
        'De belijdenis "Mijn Heere en mijn God" is de sterkste die in het Johannes-evangelie voorkomt. Johannes opent zijn boek met "het Woord was God" en sluit de kring hier: een discipel zegt het nu hardop, tegen Jezus zelf.',
      ],
      terms: [
        { term: 'Didymus', meaning: 'Grieks voor "tweeling", de bijnaam van Thomas.' },
      ],
    },
    reflection: {
      question: 'Wat maakt het voor jou moeilijk om te geloven zonder te zien?',
      practices: [
        'Schrijf de vraag op die jij aan Jezus zou stellen als je Hem een keer mocht zien.',
        'Zoek deze week iemand op die twijfelt, en luister zonder het meteen op te lossen.',
        'Lees vers 29 elke dag een keer, en vraag je af wat zalig daar betekent.',
      ],
      memoryVerse: 'Johannes 20:29',
      prompts: [
        'Waar lijk jij op Thomas?',
        'Wat zegt Thomas als hij Jezus ziet?',
        'Wat helpt jou om te blijven geloven?',
      ],
      noteTags: ['opstanding', 'twijfel', 'Johannes 20'],
    },
  },

  3: {
    intro: {
      headline: 'Van leeg graf naar publieke boodschap',
      body: [
        'Zeven weken na Pasen staat Petrus - dezelfde die Jezus verloochende - in Jeruzalem te preken, op steenworp afstand van het graf. Hij bouwt zijn betoog niet op zijn eigen ervaring, maar op de Schrift.',
        'Wat in Johannes 20 nog verwarring was, is hier een argument geworden dat je kunt navertellen. Dat is de brug tussen persoonlijk geloof en de gemeente.',
      ],
      watchFor: [
        'Hoe vaak Petrus het Oude Testament aanhaalt',
        'Dat hij David noemt als iemand die gestorven en begraven is',
        'Waar de preek naartoe werkt',
      ],
    },
    word: {
      readingCue: 'Volg de redenering. Petrus bouwt stap voor stap iets op.',
    },
    depth: {
      body: [
        'Petrus citeert Psalm 16. Zijn argument is eenvoudig: David schreef dat God zijn ziel niet in het dodenrijk zou laten - maar Davids graf was in Jeruzalem nog aan te wijzen. De psalm moest dus over iemand anders gaan.',
      ],
      terms: [
        { term: 'het dodenrijk', meaning: 'In de Statenvertaling "de hel"; hier het Griekse Hades, het verblijf van de doden - niet de plaats van straf.' },
      ],
      showMedia: true,
    },
    reflection: {
      question: 'Wat betekent het voor jou dat Jezus echt is opgestaan?',
      practices: [
        'Leg de opstanding deze week in drie zinnen uit aan iemand, met de Schrift erbij, zoals Petrus doet.',
        'Lees Psalm 16 helemaal en onderstreep wat Petrus eruit citeert.',
        'Schrijf op welk deel van zijn betoog jou het meest overtuigt, en waarom juist dat.',
      ],
      memoryVerse: 'Handelingen 2:32',
      prompts: [
        'Welke woorden van David haalt Petrus aan?',
        'Hoe zou jij in je eigen woorden vertellen dat Jezus leeft?',
      ],
      noteTags: ['opstanding', 'Handelingen 2', 'Pinksteren'],
    },
  },
};
