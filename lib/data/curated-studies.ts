import { studyPhotoFor } from '../studyPhotos'

export type StudyType = 'Gedeelte' | 'Persoon' | 'Onderwerp' | 'Boek'

/** Which commentary the "type uitleg" setting resolves to. */
export type StudyDepth = 'kort' | 'diep'

/** Cadence the enrollment schedules reminders on. */
export type StudyRhythm =
  | 'dagelijks'
  | 'drie-per-week'
  | 'wekelijks'
  /** Specific weekdays, listed in StudyEnrollment.reminderDays. */
  | 'eigen'
  /** No rhythm and no reminders. */
  | 'vrij'

export interface Lesson {
  day: number
  title: string
  book: string
  chapter: number
  verseRange?: string
  /**
   * The lesson's open question.
   *
   * LEGACY and PERMANENT. `/api/v1/studies` returns `curatedStudies` verbatim
   * and the shipped Flutter binary renders this field, so it can never be
   * renamed or removed - only added to. The study flow uses it as the fallback
   * reflection question when no authored one exists.
   */
  focus: string
  /** Shown as "±12 min" on the detail page. Defaults to 12. */
  estimatedMinutes?: number
}

export interface CuratedStudy {
  id: string
  type: StudyType
  title: string
  description: string
  durationLabel: string
  startBook: string
  startChapter: number
  startVersion: string
  /**
   * Card banner: the study's cover photo from `lib/studyPhotos.ts`
   * (`/images/study-photos/u-<id>.webp`), or '' when it has none.
   *
   * LEGACY and PERMANENT field: `/api/v1/studies` returns it absolutised to
   * the shipped Flutter binary, which renders rasters via `Image.network` and
   * paints its own banner when the value is empty or the request fails.
   */
  image: string
  lessons: Lesson[]

  // --- Study detail / onboarding page. Optional in the type, but every
  // authored study carries `about` and `outcomes`: they are most of the text a
  // search engine sees on /studies/[id]. Generated book studies
  // (lib/bookStudies.ts) go without - their pages are noindex.
  /** "Waar gaat deze studie over?" - one paragraph per entry. */
  about?: string[]
  /** "Wat ga je leren?" - 3 to 5 bullets. */
  outcomes?: string[]
  /** Preselected on the onboarding form; the user can still change it. */
  suggestedRhythm?: StudyRhythm
  suggestedDepth?: StudyDepth
}

/** A study's cover photo path, or '' so the client paints its own banner. */
const photo = (id: string): string => studyPhotoFor(id)?.src ?? ''

export const curatedStudies: CuratedStudy[] = [
  {
    id: 'opstanding',
    type: 'Gedeelte',
    title: 'De opstanding van Jezus',
    description: 'Hoe het lege graf de wereld voor altijd veranderde - van wanhoop naar hoop.',
    durationLabel: '3 lessen',
    startBook: 'Johannes',
    startChapter: 20,
    startVersion: 'statenvertaling',
    image: photo('opstanding'),
    about: [
      'Op de eerste dag van de week gaat Maria Magdalena in het donker naar het graf, en vindt het leeg. Johannes vertelt wat er daarna gebeurt zonder iets glad te strijken: verwarring, tranen, een deur die op slot zit en een discipel die weigert te geloven wat hij niet zelf heeft gezien.',
      'Deze studie volgt drie momenten: de ochtend bij het graf, de avonden waarop Jezus midden tussen zijn discipelen staat, en de preek van Petrus op de Pinksterdag, waarin de opstanding het fundament wordt van wat de gemeente gelooft. Zo zie je hoe een gebeurtenis in een hof bij Jeruzalem het hart van het christelijk geloof werd.',
    ],
    outcomes: [
      'Je kent de verslagen van het lege graf en de verschijningen in Johannes 20',
      'Je begrijpt waarom de belijdenis van Thomas, "Mijn Heere en mijn God!", een hoogtepunt van het evangelie is',
      'Je ziet hoe Petrus de opstanding verbindt met Psalm 16 en de belofte aan David',
      'Je kunt uitleggen wat de opstanding betekent voor twijfel, hoop en getuigenis',
    ],
    lessons: [
      { day: 1, title: 'Het lege graf', book: 'Johannes', chapter: 20, verseRange: '1–18', focus: 'Wat vonden de vrouwen toen ze bij het graf kwamen?' },
      { day: 2, title: '"Mijn Heer en mijn God"', book: 'Johannes', chapter: 20, verseRange: '19–31', focus: 'Waar herken jij jezelf in Thomas?' },
      { day: 3, title: 'De betekenis voor de gemeente', book: 'Handelingen', chapter: 2, verseRange: '22–36', focus: 'Welke woorden van David gebruikt Petrus in zijn toespraak?' },
    ],
  },
  {
    id: 'abraham',
    type: 'Persoon',
    title: 'Het geloof van Abraham',
    description: 'Van Ur naar het beloofde land - vertrouwen op Gods woord midden in het onmogelijke.',
    durationLabel: '8 lessen',
    startBook: 'Genesis',
    startChapter: 12,
    startVersion: 'statenvertaling',
    image: photo('abraham'),
    about: [
      'God roept Abram weg uit zijn land en zijn familie, naar een land dat Hij hem zal wijzen. Abram gaat, zonder te weten waarheen. Wat volgt is een leven van wachten op een belofte die met elk jaar onmogelijker lijkt: een zoon, een volk, een land - voor een man zonder kinderen en een vrouw die de leeftijd daarvoor voorbij is.',
      'Je volgt Abraham door Genesis 12 tot 22: het verbond in de nacht, de nieuwe naam, het bezoek bij Mamre, de geboorte van Izak en de zwaarste beproeving, op de berg Moria. Daarna lees je hoe Hebreeën en Jakobus op zijn geloof terugkijken, en hoe geloof en daden bij hem samengaan.',
    ],
    outcomes: [
      'Je kent de belangrijkste momenten uit het leven van Abraham, van zijn roeping tot Moria',
      'Je begrijpt wat een verbond is en hoe God het met Abraham sloot',
      'Je ziet hoe het offer van Izak vooruitwijst naar Christus',
      'Je kunt uitleggen hoe Hebreeën 11 en Jakobus 2 het geloof van Abraham beschrijven',
    ],
    lessons: [
      { day: 1, title: 'De roeping uit Ur', book: 'Genesis', chapter: 12, verseRange: '1–9', focus: 'Wat moest Abram achterlaten toen God hem riep?' },
      { day: 2, title: 'Het verbond in de nacht', book: 'Genesis', chapter: 15, verseRange: '1–21', focus: 'Wat belooft God aan Abram in dit hoofdstuk?' },
      { day: 3, title: 'Een nieuw naam', book: 'Genesis', chapter: 17, verseRange: '1–22', focus: 'Welke nieuwe naam geeft God aan Abram?' },
      { day: 4, title: 'De belofte van een zoon', book: 'Genesis', chapter: 18, verseRange: '1–15', focus: 'Hoe reageert Sara als ze hoort dat ze een zoon krijgt?' },
      { day: 5, title: 'De geboorte van Izak', book: 'Genesis', chapter: 21, verseRange: '1–21', focus: 'Wanneer heb jij gemerkt dat God doet wat Hij belooft?' },
      { day: 6, title: 'De beproeving op Moria', book: 'Genesis', chapter: 22, verseRange: '1–19', focus: 'Wat doet Abraham als God hem iets heel moeilijks vraagt?' },
      { day: 7, title: "Abrahams geloof in het NT", book: 'Hebreeën', chapter: 11, verseRange: '8–19', focus: 'Wat deed Abraham volgens dit gedeelte omdat hij God geloofde?' },
      { day: 8, title: 'Geloof en werken', book: 'Jakobus', chapter: 2, verseRange: '20–26', focus: 'Waar is in jouw leven te zien dat je gelooft?' },
    ],
  },
  {
    id: 'mozes',
    type: 'Persoon',
    title: 'Het leven van Mozes',
    description: 'Van slavernij naar bevrijding - Gods plan door een gebroken maar gehoorzaam mens.',
    durationLabel: '10 lessen',
    startBook: 'Exodus',
    startChapter: 2,
    startVersion: 'statenvertaling',
    image: photo('mozes'),
    about: [
      'Mozes begint zijn leven in een kistje van biezen op de Nijl en eindigt het op de berg Nebo, met uitzicht op een land dat hij niet binnen zal gaan. Daartussen ligt een leven vol tegenstellingen: een prins van Egypte die moet vluchten, een herder die God ontmoet in een brandend braambos, een leider die een morrend volk veertig jaar door de woestijn leidt.',
      'In tien lessen volg je hem van zijn geboorte tot zijn sterven: de doortocht door de Rode Zee, het manna, de Tien Geboden, de verspieders, het water uit de rots en het grote gebod uit Deuteronomium 6. De laatste les laat zien hoe Hebreeën 11 op zijn keuzes terugkijkt.',
    ],
    outcomes: [
      'Je kent de hoofdlijn van het leven van Mozes, van Egypte tot de berg Nebo',
      'Je begrijpt wat de naam die God in Exodus 3 openbaart over Hem zegt',
      'Je ziet hoe de Tien Geboden en het grote gebod met elkaar samenhangen',
      'Je kunt uitleggen waarom Mozes het beloofde land niet in mocht',
    ],
    lessons: [
      { day: 1, title: 'Geboorte en vlucht', book: 'Exodus', chapter: 2, verseRange: '1–25', focus: 'Hoe wordt de baby Mozes gered?' },
      { day: 2, title: 'Het brandende braambos', book: 'Exodus', chapter: 3, verseRange: '1–22', focus: 'Welke naam geeft God van zichzelf aan Mozes?' },
      { day: 3, title: 'Door de Rode Zee', book: 'Exodus', chapter: 14, verseRange: '1–31', focus: 'Wat doet God voor zijn volk bij de Rode Zee?' },
      { day: 4, title: 'Manna in de woestijn', book: 'Exodus', chapter: 16, verseRange: '1–35', focus: 'Hoe zorgt God voor zijn volk in de woestijn?' },
      { day: 5, title: 'De Tien Geboden', book: 'Exodus', chapter: 20, verseRange: '1–17', focus: 'Welk gebod vind jij het moeilijkst om te houden?' },
      { day: 6, title: 'De verspieders', book: 'Numeri', chapter: 13, verseRange: '25–33', focus: 'Wat zien Kaleb en Jozua anders dan de andere verspieders?' },
      { day: 7, title: 'Water uit de rots', book: 'Numeri', chapter: 20, verseRange: '1–13', focus: 'Wat doet Mozes anders dan God hem gezegd had?' },
      { day: 8, title: 'Het grote gebod', book: 'Deuteronomium', chapter: 6, verseRange: '1–25', focus: 'Wat betekent het voor jou om God lief te hebben met je hele hart?' },
      { day: 9, title: 'Het sterven van Mozes', book: 'Deuteronomium', chapter: 34, verseRange: '1–12', focus: 'Wat laat God aan Mozes zien voordat hij sterft?' },
      { day: 10, title: "Mozes' geloof in het NT", book: 'Hebreeën', chapter: 11, verseRange: '23–29', focus: 'Welke keuze van Mozes vind jij het moedigst?' },
    ],
  },
  {
    id: 'geloof-in-storm',
    type: 'Gedeelte',
    title: 'Geloof in de storm',
    description: 'Petrus op het water: wat leert dit over vertrouwen op Jezus wanneer alles wankelt?',
    durationLabel: '4 lessen',
    startBook: 'Mattheüs',
    startChapter: 14,
    startVersion: 'statenvertaling',
    image: photo('geloof-in-storm'),
    about: [
      'Midden in de nacht, met de wind tegen, ziet Petrus Jezus over het water naar de boot komen. Hij stapt uit, loopt een paar passen - en begint te zinken zodra hij de wind ziet in plaats van Jezus. Het is een van de eerlijkste verhalen over geloof in de Bijbel: moedig en wankel tegelijk.',
      'Deze studie legt dat verhaal naast drie andere gedeelten: de storm die Jezus met één woord stilt, Psalm 46 over God als toevlucht wanneer de aarde beeft, en de brief waarin Paulus vanuit gevangenschap schrijft over de vrede die alle verstand te boven gaat. Vier lessen over vertrouwen wanneer alles om je heen wankelt.',
    ],
    outcomes: [
      'Je kent de verhalen van Petrus op het water en de gestilde storm',
      'Je begrijpt wat deze verhalen laten zien over wie Jezus is',
      'Je leert Psalm 46 lezen als een gebed voor onzekere tijden',
      'Je kunt wat Paulus in Filippenzen 4 schrijft toepassen op je eigen zorgen',
    ],
    lessons: [
      { day: 1, title: 'Petrus op het water', book: 'Mattheüs', chapter: 14, verseRange: '22–36', focus: 'Wanneer begint Petrus te zinken?' },
      { day: 2, title: 'Jezus stilt de storm', book: 'Markus', chapter: 4, verseRange: '35–41', focus: 'Welke storm in jouw leven zou jij aan Jezus willen geven?' },
      { day: 3, title: 'God, onze toevlucht', book: 'Psalmen', chapter: 46, verseRange: '1–11', focus: 'Welk beeld voor God in deze psalm spreekt jou het meest aan?' },
      { day: 4, title: 'Vrede in alle omstandigheden', book: 'Filippenzen', chapter: 4, verseRange: '4–13', focus: 'Welke zorg wil jij vandaag aan God vertellen?' },
    ],
  },
  {
    id: 'noach',
    type: 'Persoon',
    title: 'Noach - geloof en gehoorzaamheid',
    description: 'Een man die God geloofde en gehoorzaamde toen niemand anders dat deed.',
    durationLabel: '5 lessen',
    startBook: 'Genesis',
    startChapter: 6,
    startVersion: 'statenvertaling',
    image: photo('noach'),
    about: [
      'De aarde is vol geweld, schrijft Genesis, en het berouwt God dat Hij de mens gemaakt heeft. Maar Noach vindt genade in zijn ogen. Hij krijgt een opdracht die voor iedereen om hem heen onbegrijpelijk moet zijn geweest: bouw een ark, voor een vloed die nog niemand heeft gezien.',
      'Je leest Genesis 6 tot 9 in vier lessen: de opdracht, de vloed, de terugkeer op het droge en het verbond met de regenboog als teken. De vijfde les volgt Petrus, die de ark verbindt met de doop en met de redding door Christus.',
    ],
    outcomes: [
      'Je kent het verhaal van Noach en de vloed uit Genesis 6 tot 9',
      'Je begrijpt wat genade betekent in een verhaal over oordeel',
      'Je weet wat het verbond met Noach inhoudt en waarom de regenboog het teken is',
      'Je kunt uitleggen hoe Petrus de ark verbindt met de doop',
    ],
    lessons: [
      { day: 1, title: "Gods opdracht aan Noach", book: 'Genesis', chapter: 6, verseRange: '1–22', focus: 'Wat moest Noach van God bouwen?' },
      { day: 2, title: 'De vloed komt', book: 'Genesis', chapter: 7, verseRange: '1–24', focus: 'Wie gingen er met Noach mee de ark in?' },
      { day: 3, title: 'Terugkeer op het droge', book: 'Genesis', chapter: 8, verseRange: '1–22', focus: 'Wat doet Noach als hij uit de ark komt?' },
      { day: 4, title: 'Gods verbond met Noach', book: 'Genesis', chapter: 9, verseRange: '1–17', focus: 'Wat is het teken van de belofte die God aan Noach doet?' },
      { day: 5, title: 'Noach als voorbeeld', book: '1 Petrus', chapter: 3, verseRange: '18–22', focus: 'Waar zie jij in je eigen leven dat God redt?' },
    ],
  },
  {
    id: 'intocht',
    type: 'Gedeelte',
    title: 'De laatste week van Jezus',
    description: 'Van triomfantelijke intocht in Jeruzalem tot de opstanding - de week die alles veranderde.',
    durationLabel: '6 lessen',
    startBook: 'Mattheüs',
    startChapter: 21,
    startVersion: 'statenvertaling',
    image: photo('intocht'),
    about: [
      'Op zondag roept een menigte "Hosanna" als Jezus op een ezel Jeruzalem binnenrijdt. Vijf dagen later eist een menigte zijn kruisiging. Mattheüs vertelt die week uitvoeriger dan elk ander deel van het leven van Jezus: bijna een derde van zijn evangelie gaat over deze paar dagen.',
      'In zes lessen loop je die week door: de intocht, de tempelreiniging, het laatste avondmaal, de nacht in Getsémane, de kruisiging en de morgen van de opstanding, die eindigt met de opdracht om alle volken tot discipelen te maken.',
    ],
    outcomes: [
      'Je kent de gebeurtenissen van de laatste week van Jezus in de volgorde van Mattheüs',
      'Je ziet welke profetieën in deze week in vervulling gaan',
      'Je begrijpt wat Jezus bij het avondmaal zei over het brood en de beker',
      'Je kunt uitleggen wat de grote opdracht aan het einde van Mattheüs vraagt',
    ],
    lessons: [
      { day: 1, title: 'De triomfantelijke intocht', book: 'Mattheüs', chapter: 21, verseRange: '1–11', focus: 'Wat roepen de mensen als Jezus Jeruzalem binnenkomt?' },
      { day: 2, title: 'De tempelreiniging', book: 'Mattheüs', chapter: 21, verseRange: '12–22', focus: 'Waarom wordt Jezus boos in de tempel?' },
      { day: 3, title: 'Het Laatste Avondmaal', book: 'Mattheüs', chapter: 26, verseRange: '17–30', focus: 'Wat zegt Jezus over het brood en de beker?' },
      { day: 4, title: 'Getsémane en verraad', book: 'Mattheüs', chapter: 26, verseRange: '36–56', focus: 'Wat bidt Jezus vlak voordat Hij gevangen wordt genomen?' },
      { day: 5, title: 'De kruisiging', book: 'Mattheüs', chapter: 27, verseRange: '27–56', focus: 'Wat gebeurt er op het moment dat Jezus sterft?' },
      { day: 6, title: 'De opstanding en uitzending', book: 'Mattheüs', chapter: 28, verseRange: '1–20', focus: 'Welke opdracht geeft Jezus aan zijn leerlingen?' },
    ],
  },
  {
    id: 'david',
    type: 'Persoon',
    title: 'David - naar Gods hart',
    description: 'Van herder tot koning - een man die diep viel, maar altijd terugkeerde naar God.',
    durationLabel: '7 lessen',
    startBook: '1 Samuël',
    startChapter: 16,
    startVersion: 'statenvertaling',
    image: photo('david'),
    about: [
      'Samuël komt naar Bethlehem om een nieuwe koning te zalven en kijkt naar de oudste en sterkste zoon van Isaï. Maar God ziet het hart aan, en de keus valt op de jongste, die bij de schapen is. Zo begint het leven van David: herder, dichter, strijder, koning - en een man die diep viel.',
      'Je leest zijn verhaal en zijn psalmen door elkaar: de zalving, Goliath, Psalm 23, Gods belofte van een blijvend koningshuis, de schuldbelijdenis van Psalm 51 en zijn laatste woorden. De laatste les volgt Paulus, die in Antiochië laat zien hoe de belofte aan David in Jezus wordt vervuld.',
    ],
    outcomes: [
      'Je kent de belangrijkste momenten uit het leven van David',
      'Je begrijpt de belofte uit 2 Samuël 7 en waarom die naar Jezus wijst',
      'Je leert van Psalm 51 hoe je eerlijk schuld belijdt',
      'Je kunt uitleggen waarom David een man naar Gods hart wordt genoemd',
    ],
    lessons: [
      { day: 1, title: 'De zalving van David', book: '1 Samuël', chapter: 16, verseRange: '1–13', focus: 'Waar kijkt God naar als Hij iemand kiest?' },
      { day: 2, title: 'David en Goliath', book: '1 Samuël', chapter: 17, verseRange: '32–58', focus: 'Waarom durft David tegen Goliath te vechten?' },
      { day: 3, title: 'De Heer is mijn Herder', book: 'Psalmen', chapter: 23, verseRange: '1–6', focus: 'Welk vers uit deze psalm wil jij deze week onthouden?' },
      { day: 4, title: 'Gods verbond met David', book: '2 Samuël', chapter: 7, verseRange: '1–17', focus: 'Wat belooft God aan David?' },
      { day: 5, title: 'Belijdenis na de zonde', book: 'Psalmen', chapter: 51, verseRange: '1–19', focus: 'Wat vraagt David aan God in deze psalm?' },
      { day: 6, title: "Davids laatste woorden", book: '2 Samuël', chapter: 23, verseRange: '1–7', focus: 'Hoe spreekt David aan het eind van zijn leven over God?' },
      { day: 7, title: 'David en Jezus', book: 'Handelingen', chapter: 13, verseRange: '22–39', focus: 'Wie is volgens Paulus de beloofde nakomeling van David?' },
    ],
  },
  {
    id: 'bergrede',
    type: 'Onderwerp',
    title: 'De Bergrede',
    description: 'Jezus legt in drie hoofdstukken uit hoe het koninkrijk van God eruitziet in het dagelijks leven.',
    durationLabel: '6 lessen',
    startBook: 'Mattheüs',
    startChapter: 5,
    startVersion: 'statenvertaling',
    image: photo('bergrede'),
    about: [
      'Jezus gaat de berg op, zet zich neer en begint zijn discipelen te onderwijzen. Wat volgt, in Mattheüs 5 tot 7, is zijn bekendste toespraak: de zaligsprekingen, zout en licht, het Onze Vader, de vogels in de lucht en het huis op de rots.',
      'In zes lessen lees je de Bergrede helemaal: wie Jezus zalig noemt, hoe Hij de wet vervult, bidden en vasten in het verborgene, zorgen om morgen, oordelen over anderen en het verschil tussen bouwen op zand en op rots. Het is geen lijst regels om af te vinken, maar een beschrijving van hoe leven in Gods koninkrijk eruitziet.',
    ],
    outcomes: [
      "Je kent de opbouw en de hoofdthema's van Mattheüs 5 tot 7",
      'Je begrijpt wat Jezus bedoelt als Hij zegt dat Hij de wet komt vervullen',
      'Je leert het Onze Vader lezen als voorbeeld voor je eigen gebed',
      'Je kunt toepassen wat Jezus zegt over zorgen, oordelen en het fundament van je leven',
    ],
    lessons: [
      { day: 1, title: 'De Zaligsprekingen', book: 'Mattheüs', chapter: 5, verseRange: '1–12', focus: 'Welke zaligspreking raakt jou het meest?' },
      { day: 2, title: 'Zout, licht en de wet', book: 'Mattheüs', chapter: 5, verseRange: '13–48', focus: 'Hoe kun jij deze week zout en licht zijn?' },
      { day: 3, title: 'Bidden, vasten en aalmoezen', book: 'Mattheüs', chapter: 6, verseRange: '1–18', focus: 'Wat zegt Jezus in dit gedeelte over bidden?' },
      { day: 4, title: 'Geen zorgen over morgen', book: 'Mattheüs', chapter: 6, verseRange: '19–34', focus: 'Waar maak jij je nu de meeste zorgen over?' },
      { day: 5, title: 'Niet oordelen - wel bidden', book: 'Mattheüs', chapter: 7, verseRange: '1–20', focus: 'Wat zegt Jezus over de splinter en de balk?' },
      { day: 6, title: 'Op de rots gebouwd', book: 'Mattheüs', chapter: 7, verseRange: '21–29', focus: 'Wat doet de wijze man anders dan de dwaze man?' },
    ],
  },
  {
    id: 'paulus',
    type: 'Persoon',
    title: 'Paulus - apostel van de volken',
    description: 'Van fanatiek vervolger tot onvermoeibaar apostel - hoe Gods genade een leven totaal kan keren.',
    durationLabel: '6 lessen',
    startBook: 'Handelingen',
    startChapter: 9,
    startVersion: 'statenvertaling',
    image: photo('paulus'),
    about: [
      'Saulus van Tarsus reist naar Damascus met brieven om volgelingen van Jezus gevangen te nemen. Onderweg omschijnt hem een licht uit de hemel en hoort hij een stem: "Saul, Saul! wat vervolgt gij Mij?" De vervolger wordt de apostel die het evangelie tot ver buiten Israël brengt.',
      'Je volgt hem in zes lessen: zijn bekering, zijn toespraak op de Areopagus in Athene, twee hoofdstukken uit de brief die hij vanuit gevangenschap aan de Filippenzen schreef, het slot van Romeinen 8 en zijn laatste brief aan Timotheüs, geschreven met het einde in zicht.',
    ],
    outcomes: [
      'Je kent het verhaal van de bekering van Paulus',
      'Je ziet hoe Paulus het evangelie uitlegde aan Grieken die de Schrift niet kenden',
      'Je begrijpt hoe Paulus in gevangenschap over blijdschap kon schrijven',
      'Je kunt uitleggen wat Romeinen 8 zegt over de liefde van God waarvan niets ons kan scheiden',
    ],
    lessons: [
      { day: 1, title: 'De bekering op de weg naar Damascus', book: 'Handelingen', chapter: 9, verseRange: '1–22', focus: 'Wat gebeurt er met Paulus op weg naar Damascus?' },
      { day: 2, title: 'Preek op de Areopagus', book: 'Handelingen', chapter: 17, verseRange: '16–34', focus: 'Over welk altaar begint Paulus te praten in Athene?' },
      { day: 3, title: 'Christus is mijn leven', book: 'Filippenzen', chapter: 1, verseRange: '1–30', focus: 'Waarom is Paulus blij, ook al zit hij gevangen?' },
      { day: 4, title: 'Alles schade geacht', book: 'Filippenzen', chapter: 3, verseRange: '1–21', focus: 'Wat is voor Paulus belangrijker dan alles wat hij had?' },
      { day: 5, title: 'Meer dan overwinnaar', book: 'Romeinen', chapter: 8, verseRange: '28–39', focus: 'Wat kan ons volgens Paulus niet scheiden van de liefde van God?' },
      { day: 6, title: "Paulus' afscheidswoorden", book: '2 Timotheüs', chapter: 4, verseRange: '1–22', focus: 'Wat zegt Paulus over zijn eigen leven als hij terugkijkt?' },
    ],
  },
  {
    id: 'psalmen',
    type: 'Onderwerp',
    title: 'Psalmen - bidden met woorden van God',
    description: 'Vijf psalmen die je meenemen van klaagzang tot lofzang - het volledige gebedsboek van de Bijbel.',
    durationLabel: '5 lessen',
    startBook: 'Psalmen',
    startChapter: 1,
    startVersion: 'statenvertaling',
    image: photo('psalmen'),
    about: [
      'De Psalmen zijn honderdvijftig gebeden en liederen, geschreven door David en anderen over een periode van eeuwen. Ze danken en klagen, juichen en vragen waarom, en laten zien dat je met alles bij God terecht kunt - ook met je twijfel en je verdriet.',
      'Deze studie leest vijf psalmen die samen het hele boek laten zien: Psalm 1 als poort, Psalm 22 als klaagzang die eindigt in lof, Psalm 119 over Gods Woord, Psalm 139 over een God die je volkomen kent, en Psalm 150 als slotakkoord. Jezus bad aan het kruis met de woorden van Psalm 22.',
    ],
    outcomes: [
      'Je herkent verschillende soorten psalmen, van klaagzang tot lofzang',
      'Je begrijpt waarom Psalm 22 terugkomt in het lijden van Jezus',
      'Je leert de Psalmen gebruiken als woorden voor je eigen gebed',
      'Je ziet hoe het boek Psalmen begint en eindigt',
    ],
    lessons: [
      { day: 1, title: 'De weg van de rechtvaardige', book: 'Psalmen', chapter: 1, verseRange: '1–6', focus: 'Waarmee vergelijkt de dichter iemand die graag in Gods woord leest?' },
      { day: 2, title: 'Mijn God, waarom?', book: 'Psalmen', chapter: 22, verseRange: '1–31', focus: 'Wat verandert er tussen het begin en het eind van deze psalm?' },
      { day: 3, title: 'Het Woord als lamp', book: 'Psalmen', chapter: 119, verseRange: '1–40', focus: 'Welk vers over Gods woord spreekt jou het meest aan?' },
      { day: 4, title: 'God kent mij volkomen', book: 'Psalmen', chapter: 139, verseRange: '1–24', focus: 'Hoe voel jij je bij de gedachte dat God alles van je weet?' },
      { day: 5, title: 'Loof de Heer', book: 'Psalmen', chapter: 150, verseRange: '1–6', focus: 'Waarvoor wil jij God vandaag loven?' },
    ],
  },
  {
    id: 'daniel',
    type: 'Boek',
    title: 'Daniël - het hele boek',
    description: 'Twaalf hoofdstukken, twaalf lessen: trouw blijven in ballingschap en zicht krijgen op wat komt.',
    durationLabel: '12 lessen',
    startBook: 'Daniël',
    startChapter: 1,
    startVersion: 'statenvertaling',
    image: photo('daniel'),
    suggestedRhythm: 'drie-per-week',
    suggestedDepth: 'diep',
    about: [
      'Daniël wordt als jongen weggevoerd naar Babel, de wereldstad van zijn tijd. Daar moet hij leven aan het hof van de koning die zijn eigen land verwoestte - en juist daar blijkt hoe ver trouw aan God reikt.',
      'De eerste zes hoofdstukken vertellen wat er gebeurde: een dieet, een droom, een beeld, een oven, een schrift aan de wand, een leeuwenkuil. De laatste zes hoofdstukken laten zien wat Daniël zag: visioenen over koninkrijken die komen en gaan, en over een koninkrijk dat blijft.',
      'Je leest het boek hoofdstuk voor hoofdstuk, in volgorde. Elke les sluit af met de vragen uit de Daniël-quiz over precies dat hoofdstuk.',
    ],
    outcomes: [
      'Je kent de verhaallijn van Daniël van ballingschap tot eindtijdvisioen',
      'Je begrijpt waarom de eerste helft vertelt en de tweede helft laat zien',
      'Je herkent de vier koninkrijken en wat het boek erover zegt',
      'Je weet hoe Daniël bad, vastte en beleed - en waarom dat het hart van het boek is',
      'Je kunt de beelden uit Daniël verbinden met het Nieuwe Testament',
    ],
    lessons: [
      { day: 1,  title: 'Aan het hof van Babel',        book: 'Daniël', chapter: 1,  verseRange: '1-21', focus: 'Wat weigert Daniël te eten aan het hof van de koning?', estimatedMinutes: 14 },
      { day: 2,  title: 'De droom van het beeld',        book: 'Daniël', chapter: 2,  verseRange: '1-49', focus: 'Wat gebeurt er met het beeld in de droom van de koning?', estimatedMinutes: 18 },
      { day: 3,  title: 'De vurige oven',                book: 'Daniël', chapter: 3,  verseRange: '1-30', focus: 'Wat zeggen de drie vrienden tegen de koning voordat ze de oven in gaan?', estimatedMinutes: 15 },
      { day: 4,  title: 'De vernedering van Nebukadnezar', book: 'Daniël', chapter: 4, verseRange: '1-37', focus: 'Wat moest koning Nebukadnezar leren?', estimatedMinutes: 15 },
      { day: 5,  title: 'Het schrift aan de wand',       book: 'Daniël', chapter: 5,  verseRange: '1-31', focus: 'Welke woorden verschijnen er op de muur?', estimatedMinutes: 14 },
      { day: 6,  title: 'In de leeuwenkuil',             book: 'Daniël', chapter: 6,  verseRange: '1-28', focus: 'Wat doet Daniël als het bidden verboden wordt?', estimatedMinutes: 14 },
      { day: 7,  title: 'De vier dieren',                book: 'Daniël', chapter: 7,  verseRange: '1-28', focus: 'Wie krijgt in dit visioen een koninkrijk dat altijd blijft?', estimatedMinutes: 18 },
      { day: 8,  title: 'De ram en de bok',              book: 'Daniël', chapter: 8,  verseRange: '1-27', focus: 'Welke dieren ziet Daniël in dit visioen?', estimatedMinutes: 16 },
      { day: 9,  title: 'Het gebed van Daniël',          book: 'Daniël', chapter: 9,  verseRange: '1-27', focus: 'Waarom zegt Daniël steeds "wij" als hij bidt?', estimatedMinutes: 18 },
      { day: 10, title: 'De man aan de rivier',          book: 'Daniël', chapter: 10, verseRange: '1-21', focus: 'Waarom kwam het antwoord op Daniëls gebed pas na drie weken?', estimatedMinutes: 14 },
      { day: 11, title: 'Koningen van noord en zuid',    book: 'Daniël', chapter: 11, verseRange: '1-45', focus: 'Wat zegt vers 32 over mensen die God kennen?', estimatedMinutes: 20 },
      { day: 12, title: 'Het einde en de opstanding',    book: 'Daniël', chapter: 12, verseRange: '1-13', focus: 'Wat wordt er beloofd aan wie ontwaken?', estimatedMinutes: 14 },
    ],
  },
]
