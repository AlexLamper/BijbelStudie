/**
 * A study's cover photograph.
 *
 * Every study in the catalogue - the 66 book studies and the authored person,
 * passage and theme studies - has one real landscape or still-life photograph
 * chosen for its subject, and no two studies share one. They sit on top of the
 * drawn horizon from `lib/studyArt.ts`, which stays underneath as the
 * placeholder while the photo loads and as the fallback when a study has no
 * entry here (a new study) or the file fails.
 *
 * Licence: every photo is from Unsplash under the Unsplash License (free for
 * commercial use, no attribution required - credited here anyway). Unsplash+ /
 * `premium_photo` results are a different, restricted licence and must never
 * be added. None of these repeat a Dagtekst photo (`lib/dailyVerseStore.ts`).
 *
 * Files are local, like the Dagtekst library, so a page makes no third-party
 * request and Vercel does no image optimisation:
 *   `/images/study-photos/u-<id>.webp`     800 px wide, q70 (banners)
 *   `/images/study-photos/u-<id>-sm.webp`  240 x 240 crop, q70 (list thumbnails)
 * To add one: take `urls.raw` from `https://unsplash.com/napi/photos/<id>`
 * (plain curl, check `premium` and `plus` are false) and download it with
 * `?w=800&q=70&fm=webp&fit=max` and `?w=240&h=240&q=70&fm=webp&fit=crop&crop=entropy`.
 * `tests/studyPhotos.test.ts` keeps every entry backed by both files.
 */

/** Study id -> Unsplash photo id. Comment: what it shows - photographer. */
export const STUDY_PHOTOS: Readonly<Record<string, string>> = {
  // sunlight breaking through clouds over the sea - Timo Volz
  'boek-genesis': 'K2jUGU6ttO0',
  // lone acacia tree at sunrise, Serabit el-Khadim, Sinai - Youhana Nassif
  'boek-exodus': 'pIL6duZR3yM',
  // single candle flame against black - David Tomaseti
  'boek-leviticus': 'AaZlf5FgUws',
  // sandstone outcrop in Wadi Rum desert under a wide sky - Anton Lecock
  'boek-numeri': '-EJEaytR9fw',
  // looking down a long mountain valley from a height - Jimmy Liu
  'boek-deuteronomium': 'QakqNbgJqwI',
  // Jordan Valley seen from the hills - Thomas Vogel
  'boek-jozua': 'HmNWXPzRx1M',
  // bare golden hills under a dark sky - Stephen Pedersen
  'boek-richteren': '3amCorLRlPk',
  // ripe wheat field under summer clouds - Nick Fewings
  'boek-ruth': 'aEJP6b-VMxY',
  // oil lantern burning on a dark wooden table - Bernard Tuck
  'boek-1-samuel': 'dkrvlD1UC2s',
  // stone archway and steps in the Jewish Quarter, Jerusalem - Viktor SOLOMONIK
  'boek-2-samuel': 'hvMsIEo3CW0',
  // looking up into a tall conifer forest - Suzi Kim
  'boek-1-koningen': '87IVr1pjoPM',
  // ancient stone ruins in a desert plain - Annie Spratt
  'boek-2-koningen': 'P2Jr9B3J_MQ',
  // Hebrew text on weathered parchment - Tanner Mardis
  'boek-1-kronieken': 'xUXGHzhIbN4',
  // menorah resting on an old Hebrew scroll - Diana Polekhina
  'boek-2-kronieken': '7a79GN3AZMM',
  // old stacked stone wall with moss - biemme zeta
  'boek-ezra': 'JGp4wwYqM78',
  // ancient crenellated city walls - Efe Kekikciler
  'boek-nehemia': 'se80dJ1xN6A',
  // Persepolis gateways and reliefs - Reza Modiri
  'boek-esther': 'L45JVcMegCg',
  // arid plain under a gathering storm (Karoo) - Eric Robinson
  'boek-job': 'I0X7BkEkCWk',
  // layered mountain ridges in morning mist - Fabrizio Conti
  'boek-psalmen': '9CfajiGQL0o',
  // open handwritten book in soft light - Kiwihug
  'boek-spreuken': '5bzMOpMTDRM',
  // autumn forest with low sunbeams - Johannes Plenio
  'boek-prediker': 'RwHv7LgeC7s',
  // vineyard rows under a warm low sun - Dan Meyers
  'boek-hooglied': '0AgtPoAARtE',
  // desert slope in bloom with purple flowers - Andreas Vonlanthen
  'boek-jesaja': 'Vv1VCU6GcVM',
  // almond blossom against blue sky - Dulcineia Dias
  'boek-jeremia': 'HQOA0LA91As',
  // ruined stone castle in thick fog - Bernd Dittrich
  'boek-klaagliederen': 'MY4jRyrUZdQ',
  // river running through a green forested valley - Peter Robbins
  'boek-ezechiel': 'U_emIOrVQBY',
  // dew on grass at sunrise - Aaron Burden
  'boek-hosea': '3TmLV0fLzfU',
  // golden grain field under a massive storm cloud - Steve Gribble
  'boek-joel': 'EzJQlDo3oCk',
  // small waterfall in a mossy forest - John Thomas
  'boek-amos': 'SqrZCO21V-Y',
  // sunlit sandstone canyon (the Siq, Petra) - Haci
  'boek-obadja': 'JnnOcB75lLs',
  // dark waves under a moody sky - Tim Marshall
  'boek-jona': 'qKlD2QlK-CY',
  // Judean hills with olive trees near Ein Karem - Laura Siegal
  'boek-micha': '_6d1KujNzug',
  // lightning over a mountain ridge at night - Micah Tindell
  'boek-nahum': 'AdOeV-qlAs4',
  // lone bare tree in a ploughed field - Ja Kubislav
  'boek-habakuk': 'pVV39dmFCEE',
  // golden sunrise over misty hills - Sam Burrough
  'boek-zefanja': 'jTcw4VlP-ac',
  // ancient stone vaulted arcade - Nico Ruge
  'boek-haggai': '-3QVdNHz1AI',
  // single olive tree against a pale sky - Vasilis Caravitis
  'boek-zacharia': '6gFxye8SVoY',
  // sunrise over misty farmland - Vincent Picavet
  'boek-maleachi': 'hpI18Ca87aE',
  // rocks in the Sea of Galilee - james ballard
  'boek-mattheus': 'RzV8XqB7QT0',
  // dusty desert valley with rock formations - Juli Kosolapova
  'boek-markus': 'Us_dv71f1bc',
  // country path between vineyards at dusk - Karsten Würth
  'boek-lukas': 'HiE1bIIoRqQ',
  // grapes on the vine in golden light - David Köhler
  'boek-johannes': 'gBdG886bLDY',
  // Mediterranean cliffs over deep-blue sea - Paweł Wojciechowski
  'boek-handelingen': 'QYAojSRu82c',
  // Via Appia lined with cypresses and pines - Mitch Botsford
  'boek-romeinen': 'bB6pr94w_EA',
  // Temple of Apollo, Ancient Corinth - Constantinos Kollias
  'boek-1-corinthiers': 'nESI7TqYBto',
  // clay jars and vases in soft light - Oshin Khandelwal
  'boek-2-corinthiers': 'OVpUFAvwhNA',
  // rock landscape of Cappadocia, Anatolia - Claude Taliana
  'boek-galaten': 'sBzqwzcY4tY',
  // Temple of Hadrian, Ephesus - Ulvi Safari
  'boek-efeziers': 'WClG5w6GC9I',
  // daisies in a meadow at evening sun - andreas kretschmer
  'boek-filippenzen': 'zUytXs3fusw',
  // exposed moss-covered tree roots - Eilis Garvey
  'boek-colossenzen': 'MskbR8VLNrA',
  // sea of clouds at dawn - Paxson Woelber
  'boek-1-thessalonicenzen': 'nv7WX42LKjU',
  // lighthouse beam over still water at night - Evgeni Tcherkasski
  'boek-2-thessalonicenzen': 'SHA85I0G8K4',
  // dip pen and ink on a blank sheet - Kelly Sikkema
  'boek-1-timotheus': 'SDa3foPsj5o',
  // old handwritten manuscript with quill and inkwell - David Billington
  'boek-2-timotheus': 'b3D8BfG1L8Y',
  // mountainous coastline over a deep-blue sea - Tadeusz Zachwieja
  'boek-titus': 'Qmhvd2LoKEc',
  // wax-sealed letters on a desk (black and white) - Raymond Petrik
  'boek-filemon': 'yG1mlQ1Rqpc',
  // old anchor on a sandy beach - Janosch Jost
  'boek-hebreeen': 'iupXZ62DQBY',
  // rain moving in over green farmland - Veronica White
  'boek-jakobus': 'lKILWySmEHs',
  // large boulders (a dolmen) in grass under sunrays - Joeri Römer
  'boek-1-petrus': 'Xne1N4yZuOY',
  // morning star above a dawn horizon (Uluru) - Grant McIver
  'boek-2-petrus': 'pmUEwPKL5IE',
  // sunlight streaming through a dark forest - Pascal van de Vendel
  'boek-1-johannes': 'xhD49fKOzw0',
  // forest path in golden morning light - Patrick Fore
  'boek-2-johannes': '74TufExdP3Y',
  // old wooden door - Joel & Jasmin Førestbird
  'boek-3-johannes': '4SvxBUfT-_c',
  // dark storm clouds over mountains and valley - simon
  'boek-judas': 'IzsVq4gwQO4',
  // golden light over clouds and mountain peaks - Nitish Meena
  'boek-openbaring': 'RbbdzZBKRDY',
  // sunrise over misty hills - Xingjiao Liu
  'opstanding': 'U9BStwKrP2c',
  // desert dune under a starry sky - Daniel Olah
  'abraham': '6KQETG8J-zI',
  // sunrise over the Sinai mountains - Vlad Kiselov
  'mozes': 'RGR-7-G4Wvs',
  // storm rolling in over a mountain lake - marco forno
  'geloof-in-storm': 'BLeKlh5je6k',
  // rainbow over green mountain slopes - Look Up Look Down Photography
  'noach': 't02XukS9dUU',
  // palm frond against a blue sky - Jakob Owens
  'intocht': 'TMxUnMAAwFA',
  // flock of sheep grazing on a green hill - Hasan Almasi
  'david': 'DNnxRx9Vkb4',
  // green hillside sloping down to a wide lake - T Y
  'bergrede': 'EYyD5ZrxJpo',
  // Roman gate on the road into Hierapolis - Gray Clary
  'paulus': '06BkQ54A3Zo',
  // still mountain lake mirroring the peaks - Gabor Koszegi
  'psalmen': 'fps3SRiQqoQ',
  // lion resting in tall grass - Birger Strahl
  'daniel': 'hesJq5WhaSA',
};

export type StudyPhoto = {
  /** The 800 px banner file. */
  src: string;
  /** The 240 px square thumbnail file. */
  thumb: string;
};

/** The photo for a study, or null when it has none and the horizon should show. */
export function studyPhotoFor(studyId: string): StudyPhoto | null {
  const id = STUDY_PHOTOS[studyId];
  if (!id) return null;
  return {
    src: `/images/study-photos/u-${id}.webp`,
    thumb: `/images/study-photos/u-${id}-sm.webp`,
  };
}
