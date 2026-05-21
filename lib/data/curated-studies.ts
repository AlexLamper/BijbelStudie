export type StudyType = 'Gedeelte' | 'Persoon' | 'Onderwerp' | 'Boek'

export interface Lesson {
  day: number
  title: string
  book: string
  chapter: number
  verseRange?: string
  focus: string
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
  image: string
  lessons: Lesson[]
}

export const BADGE_STYLES: Record<StudyType, { bg: string; color: string }> = {
  Gedeelte: { bg: 'rgba(13,148,136,0.10)',  color: '#0D9488' },
  Persoon:  { bg: 'rgba(124,58,237,0.10)', color: '#7C3AED' },
  Onderwerp:{ bg: 'rgba(234,88,12,0.10)',  color: '#EA580C' },
  Boek:     { bg: 'rgba(37,99,235,0.10)',  color: '#2563EB' },
}

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
    image: '/images/study-plans/img5.png',
    lessons: [
      { day: 1, title: 'Het lege graf', book: 'Johannes', chapter: 20, verseRange: '1–18', focus: 'Wie waren de eerste getuigen? Wat vonden zij in het graf?' },
      { day: 2, title: '"Mijn Heer en mijn God"', book: 'Johannes', chapter: 20, verseRange: '19–31', focus: 'Waarom twijfelde Thomas? Wat betekent zijn belijdenis voor jou?' },
      { day: 3, title: 'De betekenis voor de gemeente', book: 'Handelingen', chapter: 2, verseRange: '22–36', focus: 'Hoe verbindt Petrus de opstanding met de belofte aan David?' },
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
    image: '/images/study-plans/img1.png',
    lessons: [
      { day: 1, title: 'De roeping uit Ur', book: 'Genesis', chapter: 12, verseRange: '1–9', focus: 'Wat liet Abraham achter? Wat beloofde God hem?' },
      { day: 2, title: 'Het verbond in de nacht', book: 'Genesis', chapter: 15, verseRange: '1–21', focus: 'Hoe sloot God het verbond? Welke rol speelde Abraham?' },
      { day: 3, title: 'Een nieuw naam', book: 'Genesis', chapter: 17, verseRange: '1–22', focus: 'Waarom veranderde God Abrams naam? Wat betekent dit verbond?' },
      { day: 4, title: 'De belofte van een zoon', book: 'Genesis', chapter: 18, verseRange: '1–15', focus: 'Hoe reageerde Sara? Wat leert dit over Gods mogelijkheden?' },
      { day: 5, title: 'De geboorte van Izak', book: 'Genesis', chapter: 21, verseRange: '1–21', focus: 'Hoe vervulde God zijn belofte? Wat leer je over Gods trouw?' },
      { day: 6, title: 'De beproeving op Moria', book: 'Genesis', chapter: 22, verseRange: '1–19', focus: 'Waarom vroeg God dit? Hoe wijst dit vooruit naar Jezus?' },
      { day: 7, title: "Abrahams geloof in het NT", book: 'Hebreeën', chapter: 11, verseRange: '8–19', focus: 'Welke elementen van Abrahams geloof noemt de schrijver?' },
      { day: 8, title: 'Geloof en werken', book: 'Jakobus', chapter: 2, verseRange: '20–26', focus: 'Hoe werkt geloof door in daden? Is dit in tegenspraak met Paulus?' },
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
    image: '/images/study-plans/img7.png',
    lessons: [
      { day: 1, title: 'Geboorte en vlucht', book: 'Exodus', chapter: 2, verseRange: '1–25', focus: 'Hoe bewaarde God Mozes? Waarom vluchtte hij naar Midian?' },
      { day: 2, title: 'Het brandende braambos', book: 'Exodus', chapter: 3, verseRange: '1–22', focus: 'Welke naam openbaarde God? Wat was de roeping van Mozes?' },
      { day: 3, title: 'Door de Rode Zee', book: 'Exodus', chapter: 14, verseRange: '1–31', focus: 'Hoe reageerde het volk? Wat deed God voor zijn volk?' },
      { day: 4, title: 'Manna in de woestijn', book: 'Exodus', chapter: 16, verseRange: '1–35', focus: 'Wat klaagde het volk? Wat leert dit over Gods zorg?' },
      { day: 5, title: 'De Tien Geboden', book: 'Exodus', chapter: 20, verseRange: '1–17', focus: 'Hoe structureren de geboden ons leven? Wat staat centraal?' },
      { day: 6, title: 'De verspieders', book: 'Numeri', chapter: 13, verseRange: '25–33', focus: 'Welk verschil maakten Kaleb en Jozua? Wat was de gevolg van ongeloof?' },
      { day: 7, title: 'Water uit de rots', book: 'Numeri', chapter: 20, verseRange: '1–13', focus: 'Welke fout maakte Mozes? Wat was de consequentie?' },
      { day: 8, title: 'Het grote gebod', book: 'Deuteronomium', chapter: 6, verseRange: '1–25', focus: 'Wat is het eerste en grootste gebod? Hoe leef je het uit?' },
      { day: 9, title: 'Het sterven van Mozes', book: 'Deuteronomium', chapter: 34, verseRange: '1–12', focus: 'Waarom mocht Mozes het land niet in? Hoe wordt hij geëerd?' },
      { day: 10, title: "Mozes' geloof in het NT", book: 'Hebreeën', chapter: 11, verseRange: '23–29', focus: 'Welke keuzes roemt de schrijver? Wat leer je over afwijzen van zonde?' },
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
    image: '/images/study-plans/img3.png',
    lessons: [
      { day: 1, title: 'Petrus op het water', book: 'Mattheüs', chapter: 14, verseRange: '22–36', focus: 'Wanneer begon Petrus te zinken? Wat zegt dit over jouw geloof?' },
      { day: 2, title: 'Jezus stilt de storm', book: 'Markus', chapter: 4, verseRange: '35–41', focus: 'Hoe reageerden de discipelen? Wat voor macht heeft Jezus?' },
      { day: 3, title: 'God, onze toevlucht', book: 'Psalmen', chapter: 46, verseRange: '1–11', focus: 'Welke beelden gebruikt de psalmdichter voor Gods bescherming?' },
      { day: 4, title: 'Vrede in alle omstandigheden', book: 'Filippenzen', chapter: 4, verseRange: '4–13', focus: 'Hoe bereik je de vrede die alle verstand te boven gaat?' },
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
    image: '/images/study-plans/img10.png',
    lessons: [
      { day: 1, title: "Gods opdracht aan Noach", book: 'Genesis', chapter: 6, verseRange: '1–22', focus: 'Waarom vond God genade in Noach? Wat moest hij bouwen?' },
      { day: 2, title: 'De vloed komt', book: 'Genesis', chapter: 7, verseRange: '1–24', focus: 'Hoelang duurde de vloed? Wat bewaarde God in de ark?' },
      { day: 3, title: 'Terugkeer op het droge', book: 'Genesis', chapter: 8, verseRange: '1–22', focus: 'Hoe toonde Noach dankbaarheid? Wat beloofde God?' },
      { day: 4, title: 'Gods verbond met Noach', book: 'Genesis', chapter: 9, verseRange: '1–17', focus: 'Wat is het teken van dit verbond? Voor wie geldt het?' },
      { day: 5, title: 'Noach als voorbeeld', book: '1 Petrus', chapter: 3, verseRange: '18–22', focus: 'Hoe verbindt Petrus de ark met de doop? Wat is de diepere betekenis?' },
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
    image: '/images/study-plans/img6.png',
    lessons: [
      { day: 1, title: 'De triomfantelijke intocht', book: 'Mattheüs', chapter: 21, verseRange: '1–11', focus: 'Welke profetie werd vervuld? Wie riep "Hosanna"?' },
      { day: 2, title: 'De tempelreiniging', book: 'Mattheüs', chapter: 21, verseRange: '12–22', focus: 'Waarom dreef Jezus de kooplieden uit? Wat is het huis van God?' },
      { day: 3, title: 'Het Laatste Avondmaal', book: 'Mattheüs', chapter: 26, verseRange: '17–30', focus: 'Welke nieuwe betekenis gaf Jezus aan het brood en de beker?' },
      { day: 4, title: 'Getsémane en verraad', book: 'Mattheüs', chapter: 26, verseRange: '36–56', focus: 'Wat bad Jezus? Hoe reageerden de discipelen?' },
      { day: 5, title: 'De kruisiging', book: 'Mattheüs', chapter: 27, verseRange: '27–56', focus: 'Welke tekenen gebeurden bij de dood van Jezus? Wat betekenen ze?' },
      { day: 6, title: 'De opstanding en uitzending', book: 'Mattheüs', chapter: 28, verseRange: '1–20', focus: 'Wat is de grote opdracht? Aan wie wordt alle macht gegeven?' },
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
    image: '/images/study-plans/img2.png',
    lessons: [
      { day: 1, title: 'De zalving van David', book: '1 Samuël', chapter: 16, verseRange: '1–13', focus: 'Waarom koos God David? Wat ziet God wat mensen niet zien?' },
      { day: 2, title: 'David en Goliath', book: '1 Samuël', chapter: 17, verseRange: '32–58', focus: 'Welk vertrouwen had David? Hoe verschilt zijn redenering van Saul?' },
      { day: 3, title: 'De Heer is mijn Herder', book: 'Psalmen', chapter: 23, verseRange: '1–6', focus: 'Welke beelden gebruikt David? Hoe weerspiegelen ze zijn leven?' },
      { day: 4, title: 'Gods verbond met David', book: '2 Samuël', chapter: 7, verseRange: '1–17', focus: 'Wat beloofde God aan David? Hoe wijst dit op Jezus?' },
      { day: 5, title: 'Belijdenis na de zonde', book: 'Psalmen', chapter: 51, verseRange: '1–19', focus: 'Hoe belijdt David zijn zonde? Wat vraagt hij God?' },
      { day: 6, title: "Davids laatste woorden", book: '2 Samuël', chapter: 23, verseRange: '1–7', focus: 'Hoe beschrijft David zijn leven en zijn God?' },
      { day: 7, title: 'David en Jezus', book: 'Handelingen', chapter: 13, verseRange: '22–39', focus: 'Hoe verbindt Paulus David met de belofte van verlossing in Jezus?' },
    ],
  },
  {
    id: 'bergrede',
    type: 'Onderwerp',
    title: 'De Bergrede',
    description: 'Jezus legt in zes hoofdstukken uit hoe het koninkrijk van God eruitziet in het dagelijks leven.',
    durationLabel: '6 lessen',
    startBook: 'Mattheüs',
    startChapter: 5,
    startVersion: 'statenvertaling',
    image: '/images/study-plans/img4.png',
    lessons: [
      { day: 1, title: 'De Zaligsprekingen', book: 'Mattheüs', chapter: 5, verseRange: '1–12', focus: 'Wie zijn "zalig"? Hoe keert dit de wereld op zijn kop?' },
      { day: 2, title: 'Zout, licht en de wet', book: 'Mattheüs', chapter: 5, verseRange: '13–48', focus: 'Hoe vervult Jezus de wet? Wat betekent dit voor jouw leefstijl?' },
      { day: 3, title: 'Bidden, vasten en aalmoezen', book: 'Mattheüs', chapter: 6, verseRange: '1–18', focus: 'Voor wie doe je goede daden? Hoe bid je "in het verborgene"?' },
      { day: 4, title: 'Geen zorgen over morgen', book: 'Mattheüs', chapter: 6, verseRange: '19–34', focus: 'Wat is de "rijkdom" die Jezus aanbeveelt? Hoe zoek je eerst Gods koninkrijk?' },
      { day: 5, title: 'Niet oordelen - wel bidden', book: 'Mattheüs', chapter: 7, verseRange: '1–20', focus: 'Wanneer is oordelen verkeerd? Hoe onderscheid je echte van valse profeten?' },
      { day: 6, title: 'Op de rots gebouwd', book: 'Mattheüs', chapter: 7, verseRange: '21–29', focus: 'Wat is het verschil tussen zand en rots als fundament? Hoe bouw je op de rots?' },
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
    image: '/images/study-plans/img8.png',
    lessons: [
      { day: 1, title: 'De bekering op de weg naar Damascus', book: 'Handelingen', chapter: 9, verseRange: '1–22', focus: 'Wat overkwam Paulus? Hoe reageerde de gemeente op zijn bekering?' },
      { day: 2, title: 'Preek op de Areopagus', book: 'Handelingen', chapter: 17, verseRange: '16–34', focus: 'Hoe paste Paulus zijn boodschap aan op zijn Griekse publiek?' },
      { day: 3, title: 'Christus is mijn leven', book: 'Filippenzen', chapter: 1, verseRange: '1–30', focus: 'Hoe kon Paulus in gevangenschap zo vreugdevol schrijven?' },
      { day: 4, title: 'Alles schade geacht', book: 'Filippenzen', chapter: 3, verseRange: '1–21', focus: 'Wat gaf Paulus op voor Christus? Wat bedoelt hij met "winnen"?' },
      { day: 5, title: 'Meer dan overwinnaar', book: 'Romeinen', chapter: 8, verseRange: '28–39', focus: 'Wat kan ons scheiden van Gods liefde? Hoe geeft dit troost?' },
      { day: 6, title: "Paulus' afscheidswoorden", book: '2 Timotheüs', chapter: 4, verseRange: '1–22', focus: 'Hoe blikt Paulus terug op zijn leven? Welke aanmoediging geeft hij Timotheüs?' },
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
    image: '/images/study-plans/img9.png',
    lessons: [
      { day: 1, title: 'De weg van de rechtvaardige', book: 'Psalmen', chapter: 1, verseRange: '1–6', focus: 'Wat is het verschil tussen de weg van de rechtvaardige en de goddeloze?' },
      { day: 2, title: 'Mijn God, waarom?', book: 'Psalmen', chapter: 22, verseRange: '1–31', focus: 'Hoe begint de psalm? Hoe eindigt hij? Wat zegt dit over eerlijk bidden?' },
      { day: 3, title: 'Het Woord als lamp', book: 'Psalmen', chapter: 119, verseRange: '1–40', focus: 'Hoeveel woorden gebruikt de dichter voor Gods Woord? Waarom is elk anders?' },
      { day: 4, title: 'God kent mij volkomen', book: 'Psalmen', chapter: 139, verseRange: '1–24', focus: 'Wat weet God over jou? Hoe voel je je bij die gedachte - veilig of bang?' },
      { day: 5, title: 'Loof de Heer', book: 'Psalmen', chapter: 150, verseRange: '1–6', focus: 'Met welke instrumenten looft de dichter? Wie moet de Heer loven?' },
    ],
  },
]
