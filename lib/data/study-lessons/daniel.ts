import type { LessonContent } from './types';

/**
 * Daniël, hoofdstuk voor hoofdstuk.
 *
 * Elke les koppelt zijn quiz EXPLICIET via `quizSlugs`. Dat is de enige
 * deterministische route: het alternatief laat de vragenkeuze afhangen van het
 * ontleden van vrije tekst in `bibleReference`, en dan levert één hoofdstuk met
 * een afwijkend geschreven verwijzing stil nul vragen op.
 *
 * De slugs komen letterlijk uit bijbelquiz: `daniel-bijbelquiz-deel-<hoofdstuk>`.
 */
function quizFor(chapter: number, questionCount = 8) {
  return { quizSlugs: [`daniel-bijbelquiz-deel-${chapter}`], questionCount };
}

export const danielLessons: Record<number, LessonContent> = {
  1: {
    intro: {
      headline: 'Weggevoerd, maar niet losgelaten',
      body: [
        'Jeruzalem is gevallen. De koning van Babel neemt het mooiste mee wat een land te bieden heeft: zijn jongeren. Daniël en zijn vrienden krijgen een nieuwe taal, een nieuwe naam en een nieuw menu.',
        'Alles aan hen wordt omgevormd tot Babylonisch. Bijna alles. Dit hoofdstuk gaat over de ene plek waar Daniël nee zegt, en waarom hij die grens juist daar trekt.',
      ],
      watchFor: [
        'Hoe vaak er staat dat God iets "gaf" of "overgaf"',
        'Het verschil tussen wat Daniël wel en niet accepteert',
        'De manier waarop Daniël zijn bezwaar brengt: nooit als opstand',
      ],
    },
    word: { readingCue: 'Let op wie in dit hoofdstuk werkelijk de beslissingen neemt.' },
    depth: {
      body: [
        'De namen zijn geen detail. Daniël ("God is mijn rechter") wordt Beltsazar, genoemd naar Bel. Hananja, Misaël en Azarja verliezen alle drie de naam van God in hun naam. Wie zo omgedoopt wordt, wordt geacht te vergeten waar hij vandaan komt.',
        'Toch weigert Daniël niet de naam, niet de taal en niet de opleiding - wel het voedsel. De grens ligt bij wat hem in de tempeldienst van Babel zou opnemen, niet bij alles wat vreemd is.',
      ],
      terms: [
        { term: 'Sinear', meaning: 'De oude naam voor Babylonië, dezelfde vlakte als in Genesis 11. Het boek begint bewust waar de torenbouw ophield.' },
        { term: 'Vorst der kamerlingen', meaning: 'De hoofdambtenaar van het hof, verantwoordelijk voor de opleiding van jonge edellieden.' },
      ],
    },
    reflection: {
      question: 'Waar ligt jouw grens als de omgeving je vormt?',
      prompts: [
        'Waarin past Daniël zich wel aan, en waarin niet?',
        'Wat maakt zijn verzoek respectvol in plaats van opstandig?',
        'Welke grens zou jij deze week bewust willen bewaken?',
      ],
    },
    quiz: quizFor(1),
  },

  2: {
    intro: {
      headline: 'Een droom die niemand mag horen',
      body: [
        'Nebukadnezar eist het onmogelijke: vertel mij mijn droom, en leg hem daarna uit. Wie faalt, sterft. De wijzen van Babel zeggen eerlijk dat geen mens dit kan.',
        'Precies daar begint dit hoofdstuk. Niet bij Daniëls kunde, maar bij een God die openbaart wat verborgen is.',
      ],
      watchFor: [
        'Wat Daniël doet vóór hij naar de koning gaat',
        'Het lied in de verzen 20-23: waarvoor dankt hij precies?',
        'Uit welk materiaal de steen is gehouwen',
      ],
    },
    word: { readingCue: 'Dit is een lang hoofdstuk. Lees het in één keer door - de spanning hoort erbij.' },
    depth: {
      body: [
        'Het beeld loopt van goud naar zilver, koper, ijzer en tenslotte ijzer met leem. Elk rijk is sterker en tegelijk minder samenhangend dan het vorige. Dat is de eerste boodschap: menselijke macht wordt niet beter, maar brozer.',
        'De steen wordt "zonder handen" afgehouwen. Het koninkrijk dat blijft, komt niet uit de geschiedenis voort - het breekt erin binnen.',
      ],
      terms: [
        { term: 'Verborgenheid', meaning: 'Aramees "raz": een geheim dat alleen bekend wordt als het geopenbaard wordt. Het sleutelwoord van dit hoofdstuk.' },
        { term: 'Chaldeeën', meaning: 'Hier niet een volk maar een beroepsgroep: de geleerde priesterklasse van Babel.' },
      ],
    },
    reflection: {
      question: 'Wat betekent het voor jou dat het laatste koninkrijk niet door mensenhanden komt?',
      prompts: [
        'Welke "rijken" in jouw leven lijken onwrikbaar?',
        'Waarvoor dankt Daniël God nog vóór hij naar de koning gaat?',
      ],
    },
    quiz: quizFor(2),
  },

  3: {
    intro: {
      headline: 'En zo niet',
      body: [
        'De koning heeft gehoord dat hij het gouden hoofd is. Hij bouwt een beeld dat helemaal van goud is - geen zilver, geen ijzer, geen einde. Dan moet iedereen buigen.',
        'Drie mannen blijven staan. Hun antwoord aan de koning is een van de kortste en sterkste geloofsbelijdenissen in de Bijbel.',
      ],
      watchFor: [
        'Hoe vaak de lijst met ambtenaren en instrumenten wordt herhaald - en waarom dat spot is',
        'De woorden "maar zo niet" in vers 18',
        'Wie er als vierde in de oven loopt',
      ],
    },
    word: { readingCue: 'Let op wat de drie zeggen vóór ze weten hoe het afloopt.' },
    depth: {
      body: [
        'De herhaling van de ambtenarenlijst en het orkest is geen slordigheid van de schrijver. Het is spot: de hele machine van Babel komt in beweging, en het lukt niet om drie mannen te laten buigen.',
        'Vers 17-18 is het scharnier. Ze geloven dat God kan redden. En ze zeggen erbij dat ze ook zonder redding niet zullen buigen. Geloof staat hier los van de uitkomst.',
      ],
      terms: [
        { term: 'Dura', meaning: 'De vlakte bij Babel waar het beeld stond; de exacte plek is niet met zekerheid teruggevonden.' },
        { term: 'Een zoon der goden', meaning: 'Wat Nebukadnezar zag in de oven. De tekst zegt niet meer dan hij zag - het boek laat de vraag bewust open.' },
      ],
    },
    reflection: {
      question: 'Kun jij "en zo niet" zeggen - geloven zonder garantie op de goede afloop?',
      prompts: [
        'Waar in jouw geloof hangt veel af van de uitkomst?',
        'Wat verandert er als je gehoorzaamheid niet afhankelijk maakt van redding?',
      ],
    },
    quiz: quizFor(3),
  },

  4: {
    intro: {
      headline: 'De koning schrijft zelf',
      body: [
        'Dit hoofdstuk is bijzonder: het is grotendeels geschreven in de ik-vorm, door Nebukadnezar. Een wereldheerser vertelt zelf hoe hij zijn verstand verloor.',
        'Er is een boom, er is een waarschuwing, en er is een jaar bedenktijd dat ongebruikt voorbijgaat.',
      ],
      watchFor: [
        'De zin die de koning uitspreekt op het dak, vlak voor het oordeel',
        'Wat Daniël hem aanraadt te doen',
        'Hoe het hoofdstuk begint én eindigt',
      ],
    },
    word: { readingCue: 'Lees dit hoofdstuk als het getuigenis dat het is: de koning aan het woord.' },
    depth: {
      body: [
        'De boom die tot aan de hemel reikt en heel de aarde voedt, is een bekend beeld voor een rijk. Dat de boom wordt omgehakt maar de wortelstomp blijft, is de genade in het oordeel: het is een correctie, geen vernietiging.',
        'Daniëls raad in vers 27 is opvallend praktisch: breek met je zonden door gerechtigheid, en met je ongerechtigheden door genade aan de ellendigen. Het oordeel was afwendbaar.',
      ],
      terms: [
        { term: 'Wachter, heilige', meaning: 'Een hemelse boodschapper. De term komt in het Oude Testament alleen in Daniël voor.' },
        { term: 'Zeven tijden', meaning: 'Meestal begrepen als zeven jaren; de tekst zelf preciseert het niet.' },
      ],
    },
    reflection: {
      question: 'Waar schrijf jij jezelf toe wat je hebt gekregen?',
      prompts: [
        'Lees vers 30 nog eens. Wat is precies het probleem in die zin?',
        'Hoe eindigt de koning zijn eigen verslag - en wat zegt dat?',
      ],
    },
    quiz: quizFor(4),
  },

  5: {
    intro: {
      headline: 'Gewogen en te licht bevonden',
      body: [
        'Jaren later, een andere koning, hetzelfde paleis. Belsazar geeft een feest en laat het vaatwerk uit de tempel van Jeruzalem halen om er wijn uit te drinken.',
        'Dan verschijnt er een hand. Alleen een hand.',
      ],
      watchFor: [
        'Wat de koningin-moeder zich nog herinnert van Daniël',
        'Waarom Daniël de geschenken van de koning weigert',
        'De laatste zin van het hoofdstuk',
      ],
    },
    word: { readingCue: 'Let op het verschil tussen deze koning en zijn voorganger uit hoofdstuk 4.' },
    depth: {
      body: [
        'Mene, mene, tekel, ufarsin zijn gewichtsaanduidingen: geteld, gewogen, verdeeld. Het zijn munten en maten - de taal van de handel wordt de taal van het oordeel.',
        'Daniël begint zijn uitleg met een geschiedenisles over Nebukadnezar. Belsazar wist het, zegt hij in vers 22, en heeft zijn hart toch niet vernederd. Dat is het verwijt: niet onwetendheid, maar het negeren van wat je weet.',
      ],
      terms: [
        { term: 'Peres / Ufarsin', meaning: 'Dezelfde stam: "verdeeld". Er klinkt een woordspel in mee met "Perzen".' },
        { term: 'De derde in het koninkrijk', meaning: 'Belsazar regeerde naast zijn vader Nabonidus; hij kon zelf hoogstens de tweede plaats vergeven.' },
      ],
    },
    reflection: {
      question: 'Wat weet jij, dat je nog niet doet?',
      prompts: [
        'Vers 22: "en gij, Belsazar, hebt uw hart niet vernederd, hoewel gij dit alles wist."',
        'Waarom weigert Daniël de beloning voordat hij uitlegt?',
      ],
    },
    quiz: quizFor(5),
  },

  6: {
    intro: {
      headline: 'Driemaal per dag, met open vensters',
      body: [
        'Daniël is inmiddels oud en dient onder zijn derde rijk. Zijn collega-ambtenaren zoeken een aanklacht en vinden er geen - behalve in "de wet van zijn God".',
        'Dat is het compliment dat in dit hoofdstuk verborgen zit: de enige manier om Daniël te pakken, was hem straffen voor zijn gebed.',
      ],
      watchFor: [
        'Hoe de wet precies wordt geformuleerd, en waarom hij onherroepelijk is',
        'Wat Daniël doet zodra hij van het besluit hoort',
        'De nacht die de koning doorbrengt',
      ],
    },
    word: { readingCue: 'Let op wat Daniël níet doet: hij verandert niets aan zijn gewoonte.' },
    depth: {
      body: [
        'Het gebed richting Jeruzalem, driemaal per dag, was al Daniëls gewoonte - de tekst zegt uitdrukkelijk "gelijk hij voorheen gedaan had". Er is geen demonstratie; er is alleen weigering om te veranderen.',
        'Hoofdstuk 3 en hoofdstuk 6 zijn elkaars spiegel: daar een oven, hier een kuil; daar drie jongeren, hier één oude man; beide keren een heidense koning die daarna de God van Israël erkent.',
      ],
      terms: [
        { term: 'Wet der Meden en Perzen', meaning: 'Een koninklijk besluit dat volgens Perzisch recht niet kon worden ingetrokken, ook niet door de koning zelf.' },
        { term: 'Darius de Meder', meaning: 'Buiten Daniël niet met zekerheid geïdentificeerd; er zijn meerdere voorstellen, geen ervan sluitend.' },
      ],
    },
    reflection: {
      question: 'Zou iemand jouw geloof herkennen aan je gewoonten?',
      prompts: [
        'Wat is in jouw week het equivalent van "driemaal per dag"?',
        'Waarom is een gewoonte sterker dan een besluit op het moment zelf?',
      ],
    },
    quiz: quizFor(6),
  },

  7: {
    intro: {
      headline: 'Vier dieren en een troon',
      body: [
        'Vanaf hier verandert het boek. Geen verhalen meer over Daniël, maar visioenen die Daniël zelf ziet - en die hem bang maken.',
        'Vier dieren komen uit de zee. Dan wordt er een troon geplaatst, en komt er iemand met de wolken.',
      ],
      watchFor: [
        'Waar de dieren vandaan komen, en waar de Zoon des mensen vandaan komt',
        'Wie het koninkrijk uiteindelijk ontvangt',
        'Daniëls eigen reactie in het laatste vers',
      ],
    },
    word: { readingCue: 'Dit visioen loopt parallel aan de droom van hoofdstuk 2 - maar nu van binnenuit gezien.' },
    depth: {
      body: [
        'Hoofdstuk 2 laat de wereldrijken zien als een indrukwekkend standbeeld: zo zien mensen macht. Hoofdstuk 7 laat dezelfde rijken zien als roofdieren uit een woelige zee: zo ziet God ze.',
        'De "Zoon des mensen" in vers 13 komt mét de wolken naar de Oude van dagen. Jezus gebruikt precies deze titel voor zichzelf, en citeert dit vers bij zijn verhoor - de hogepriester begrijpt onmiddellijk wat Hij daarmee zegt.',
      ],
      terms: [
        { term: 'Oude van dagen', meaning: 'Beeld van God als de eeuwige rechter; het witte kleed en haar staan voor zuiverheid en gezag.' },
        { term: 'Een tijd, tijden en een halve tijd', meaning: 'Een begrensde periode van verdrukking. De uitdrukking keert terug in hoofdstuk 12 en in Openbaring.' },
      ],
    },
    reflection: {
      question: 'Hoe verandert het jouw kijk op de macht van vandaag, als je haar als beest én als vergankelijk ziet?',
      prompts: [
        'Vergelijk het beeld uit hoofdstuk 2 met de dieren hier.',
        'Wat wordt er in vers 27 beloofd aan "het volk der heiligen"?',
      ],
    },
    quiz: quizFor(7),
  },

  8: {
    intro: {
      headline: 'De ram, de bok en de kleine hoorn',
      body: [
        'Dit visioen is scherper dan het vorige: de engel noemt de rijken bij naam. Medië en Perzië, en Griekenland.',
        'Daarna komt er een hoorn die zich verheft tegen de dienst in het heiligdom. Daniël wordt er ziek van.',
      ],
      watchFor: [
        'Welke twee rijken expliciet worden genoemd',
        'Wat er met het dagelijks offer gebeurt',
        'Hoe Daniël dit hoofdstuk afsluit',
      ],
    },
    word: { readingCue: 'Vanaf vers 15 legt Gabriël het visioen zelf uit - lees die uitleg naast het beeld.' },
    depth: {
      body: [
        'De grote hoorn van de bok die breekt en vervangen wordt door vier, wordt vrijwel unaniem gelezen als Alexander de Grote en de vier generaals die zijn rijk verdeelden.',
        'De "kleine hoorn" hier is niet dezelfde als in hoofdstuk 7: die kwam op uit het vierde rijk, deze uit het derde. Het boek laat twee gestalten zien die hetzelfde doen - zich verheffen tegen God en zijn heiligdom.',
      ],
      terms: [
        { term: 'Het gedurig offer', meaning: 'Het dagelijkse morgen- en avondoffer in de tempel; het wegnemen ervan betekent het stilleggen van de eredienst.' },
        { term: '2300 avonden en morgens', meaning: 'De tijd tot het heiligdom "gerechtvaardigd" wordt. Over de precieze telling bestaan verschillende uitleggingen.' },
      ],
    },
    reflection: {
      question: 'Wat doe je met een profetie die je niet volledig begrijpt?',
      prompts: [
        'Daniël begreep het niet en werd er ziek van (vers 27). Wat deed hij daarna?',
        'Wat is het verschil tussen niet begrijpen en niet vertrouwen?',
      ],
    },
    quiz: quizFor(8),
  },

  9: {
    intro: {
      headline: 'Hij las, en hij bad',
      body: [
        'Daniël leest Jeremia en telt: zeventig jaar. De ballingschap loopt af. Zijn reactie op die goede belofte is opmerkelijk - hij gaat niet achteroverleunen, hij gaat bidden.',
        'Het gebed dat volgt is een van de diepste schuldbelijdenissen in de Bijbel. En let op het woord dat er telkens staat: wij.',
      ],
      watchFor: [
        'Hoe vaak Daniël "wij" zegt, terwijl hij zelf trouw was',
        'Waarop hij zijn pleidooi grondt: niet op verdienste',
        'Wanneer Gabriël komt: tijdens het avondoffer',
      ],
    },
    word: { readingCue: 'Lees het gebed langzaam. Dit hoofdstuk is het hart van het boek.' },
    depth: {
      body: [
        'Daniël bidt niet "zij hebben gezondigd" maar "wij hebben gezondigd". Hij rekent zich bij het volk waarvan hij het onrecht niet deelde. Dat is voorbede: je gaat in de bres staan, niet ernaast.',
        'De zeventig weken in vers 24-27 zijn het meest besproken gedeelte van het hele boek. Wat de uitleggingen delen: er komt een Gezalfde, Hij wordt uitgeroeid, en dat is geen ongeluk maar het middel waardoor "de ongerechtigheid verzoend" wordt.',
      ],
      terms: [
        { term: 'Zeventig weken', meaning: 'Letterlijk "zeventig zevens". Over de rekenwijze lopen de uitleggingen uiteen; het doel in vers 24 is niet in geschil.' },
        { term: 'Om uwentwil', meaning: 'Daniëls enige grond voor zijn verzoek. Hij beroept zich op Gods naam, niet op de staat van dienst van zijn volk.' },
      ],
    },
    reflection: {
      question: 'Voor wie zou jij "wij" durven zeggen in je gebed?',
      prompts: [
        'Wat doet Daniël met een belofte die al vaststaat? En wat zegt dat over bidden?',
        'Waarop baseert hij zijn vraag om vergeving?',
      ],
    },
    quiz: quizFor(9),
  },

  10: {
    intro: {
      headline: 'Drie weken stilte',
      body: [
        'Daniël rouwt en vast drie weken lang. Er gebeurt niets. Dan verschijnt er iemand bij de rivier de Hiddekel, en die zegt iets verrassends: je gebed is vanaf de eerste dag gehoord.',
        'Dit hoofdstuk trekt heel even het gordijn opzij en laat zien wat er in die stilte gebeurde.',
      ],
      watchFor: [
        'Wanneer het gebed werd verhoord, en wanneer het antwoord aankwam',
        'Wat Daniël lichamelijk overkomt bij het zien van deze gestalte',
        'Hoe vaak hij wordt aangeraakt en versterkt',
      ],
    },
    word: { readingCue: 'Dit hoofdstuk is de inleiding op het lange visioen van hoofdstuk 11 en 12.' },
    depth: {
      body: [
        'De "vorst van het koninkrijk der Perzen" die eenentwintig dagen tegenstand biedt, laat zien dat er achter de politiek van volken een strijd wordt gevoerd die Daniël niet kon zien terwijl hij bad.',
        'Drie keer wordt Daniël aangeraakt: om overeind te komen, om te kunnen spreken, om kracht te krijgen. De boodschapper geeft hem eerst wat hij nodig heeft om de boodschap te dragen.',
      ],
      terms: [
        { term: 'Hiddekel', meaning: 'De Tigris, een van de rivieren uit Genesis 2.' },
        { term: 'Michaël', meaning: 'Genoemd als "een van de eerste vorsten" en in hoofdstuk 12 als de vorst die opkomt voor Daniëls volk.' },
      ],
    },
    reflection: {
      question: 'Wat doe je in de periode tussen bidden en antwoord krijgen?',
      prompts: [
        'Het antwoord was er vanaf dag één. Wat verandert dat aan hoe jij stilte uitlegt?',
        'Waarom moest Daniël eerst versterkt worden voor hij kon horen?',
      ],
    },
    quiz: quizFor(10),
  },

  11: {
    intro: {
      headline: 'Koningen die komen en gaan',
      body: [
        'Het langste en meest gedetailleerde profetische hoofdstuk van het boek. Koning na koning, veldtocht na veldtocht, huwelijk na verraad.',
        'Laat je niet ontmoedigen door de dichtheid. De boodschap zit niet in elk detail, maar in het feit dát het detail er is.',
      ],
      watchFor: [
        'Hoe vaak een koning "naar zijn wil" doet - en hoe kort dat duurt',
        'Wat er in vers 32 wordt gezegd over wie hun God kennen',
        'Waar de tekst overgaat van geschiedenis naar het einde',
      ],
    },
    word: { readingCue: 'Lees dit hoofdstuk in één ruk door; de herhaling is onderdeel van de boodschap.' },
    depth: {
      body: [
        'De koningen van het noorden en het zuiden zijn de Seleuciden en de Ptolemeeën, de opvolgersrijken van Alexander, met Israël klem ertussenin. De beschrijving is zo nauwkeurig dat critici in de oudheid al betoogden dat het achteraf geschreven moest zijn.',
        'Vers 32 is het vers om vast te houden: "het volk, dat zijn God kent, zal sterk zijn en daden doen." Midden in de opsomming van machten staat één zin over gewone gelovigen.',
      ],
      terms: [
        { term: 'Koning van het noorden / zuiden', meaning: 'De Seleucidische heersers vanuit Syrië en de Ptolemeïsche vanuit Egypte.' },
        { term: 'Het sierlijke land', meaning: 'Israël, dat geografisch precies tussen beide machtsblokken lag.' },
      ],
    },
    reflection: {
      question: 'Wat betekent "wie hun God kennen, zullen sterk zijn" in een tijd die je niet kunt sturen?',
      prompts: [
        'Wat valt je op aan hoe kort elke heerser in dit hoofdstuk aan de macht is?',
        'Waar zie jij vandaag iets van dat patroon terug?',
      ],
    },
    quiz: quizFor(11),
  },

  12: {
    intro: {
      headline: 'Zij die slapen zullen ontwaken',
      body: [
        'Het slot van het boek. Michaël staat op, er komt een benauwdheid zoals er nooit is geweest, en dan volgt het duidelijkste woord over de opstanding in het hele Oude Testament.',
        'Daniël vraagt wat het einde zal zijn. Het antwoord dat hij krijgt, is niet de uitleg die hij zoekt.',
      ],
      watchFor: [
        'Wat er gebeurt met wie "in het stof der aarde slapen"',
        'Wat Daniël moet doen met het boek',
        'De allerlaatste zin die tot hem persoonlijk wordt gesproken',
      ],
    },
    word: { readingCue: 'Lees vers 13 als het antwoord op alles wat Daniël in dit boek heeft meegemaakt.' },
    depth: {
      body: [
        'Vers 2 spreekt zonder omhaal over opstanding ten leven en ten oordeel. In het Oude Testament staat deze hoop zelden zo onbedekt; hier is het de conclusie van het hele boek.',
        'Daniël krijgt zijn uitleg niet. Hij krijgt in plaats daarvan een opdracht en een belofte: ga heen tot het einde, rust, en sta op in je erfdeel aan het einde der dagen. Het boek eindigt met een persoonlijke toezegging, niet met een schema.',
      ],
      terms: [
        { term: 'Verzegel het boek', meaning: 'Bewaren en bewaken tot de tijd van het einde - niet verbergen, maar veiligstellen.' },
        { term: 'Uw lot aan het einde der dagen', meaning: 'Letterlijk zijn erfdeel; dezelfde term die gebruikt wordt voor het grondbezit in het beloofde land.' },
      ],
    },
    reflection: {
      question: 'Wat neem je mee uit twaalf hoofdstukken Daniël?',
      prompts: [
        'Wat is er veranderd in hoe je naar macht en geschiedenis kijkt?',
        'Daniël krijgt geen volledig antwoord, wel een belofte. Is dat genoeg voor jou?',
        'Welke gewoonte uit dit boek wil je overnemen?',
      ],
      noteTags: ['daniel', 'studie'],
    },
    quiz: quizFor(12),
  },
};
