/**
 * A study's cover photograph.
 *
 * Every study in the catalogue - the 66 book studies and the authored person,
 * passage and theme studies - has one calm nature photograph of its own, and
 * no two studies share one. They sit on top of the drawn horizon from
 * `lib/studyArt.ts`, which stays underneath as the placeholder while the photo
 * loads and as the fallback when a study has no entry here (a new study) or
 * the file fails.
 *
 * Same look as the Dagtekst library (`lib/dailyVerseStore.ts`): mid-bright,
 * low contrast, almost no fine detail, muted colour, no people or buildings,
 * so a title reads over it and nothing competes with the study itself. The
 * subject still follows the book - desert for Exodus, a dark sea for Jona -
 * but the style comes first.
 *
 * Licence: every photo is from Pexels under the Pexels License (free for
 * commercial use, no attribution required - credited in the comment above each
 * entry). None of these repeat a Dagtekst photo.
 *
 * Files are local, like the Dagtekst library, so a page makes no third-party
 * request and Vercel does no image optimisation:
 *   `/images/study-photos/p-<id>.webp`     800 px wide, q70 (banners)
 *   `/images/study-photos/p-<id>-sm.webp`  240 x 240 crop, q70 (list thumbnails)
 * To add one: take the photo id from its pexels.com URL, download
 * `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?cs=srgb&w=800`
 * as the banner and a centre square of it at 240 x 240 as the thumbnail, both
 * WebP q70. `tests/studyPhotos.test.ts` keeps every entry backed by both files.
 */

/** Study id -> Unsplash photo id. Comment: what it shows - photographer. */
export const STUDY_PHOTOS: Readonly<Record<string, string>> = {
  // peaceful sunrise over serene ocean waters - dexter pan
  'boek-genesis': '35678996',
  // scenic view of a desert - K
  'boek-exodus': '9229398',
  // grass field on a foggy day - Plato Terentev
  'boek-leviticus': '9807794',
  // clear sky over hills and barren plains - Julia Volk
  'boek-numeri': '5199772',
  // a vast brown field under blue sky - Barbaros Gültekin
  'boek-deuteronomium': '12009801',
  // photo of brown mountains with a river below - K
  'boek-jozua': '9229433',
  // scenic view of a desert landscape - 康
  'boek-richteren': '11016989',
  // yellow, rural field - Andriy Nestruiev
  'boek-ruth': '17745468',
  // sun hidden behind mountains at dawn - Rodion Kutsaiev
  'boek-1-samuel': '19015073',
  // green trees and brown grass on a slope - Sami Aksu
  'boek-2-samuel': '9820926',
  // silhouette of trees on cornfield - Ivars
  'boek-1-koningen': '5583064',
  // panorama of a valley fields and distant mountain ranges - Gu Bra
  'boek-2-koningen': '19032042',
  // texture of sandstone - bima
  'boek-1-kronieken': '15107121',
  // golden dunes at sunrise in desert landscape - Stephen Leonardi
  'boek-2-kronieken': '28639369',
  // green trees covered with fog - William CHIANG
  'boek-ezra': '11952288',
  // blue, calm sea - Engin Akyurt
  'boek-nehemia': '17828906',
  // brown rocky mountain under blue sky - Brett Sayles
  'boek-esther': '4114953',
  // dry field and mountain range on horizon - Brett Sayles
  'boek-job': '4388478',
  // mesmerizing sunset over Zuluk mountain ranges - Mehul
  'boek-psalmen': '35462851',
  // pathway in the wheat field - Boys in Bristol Photography
  'boek-spreuken': '10255172',
  // autumn trees in thick fog - Nikola Tomašić
  'boek-prediker': '15695545',
  // blossoming tree on the background of blue sky - Hà Nguyễn
  'boek-hooglied': '11858149',
  // plant on ground - Thắng-Nhật Trần
  'boek-jesaja': '17699678',
  // a tree with pink flowers against a blue sky - Nikolett Emmert
  'boek-jeremia': '26970326',
  // field with trees in fog - Plato Terentev
  'boek-klaagliederen': '9807810',
  // scenic river and green hills in spring landscape - philotravel
  'boek-ezechiel': '32473704',
  // morning dew on grass blades in soft focus - Jelena Kazak
  'boek-hosea': '39824768',
  // dramatic sky over fields in merzifon, türkiye - Orhan Namlı
  'boek-joel': '36459951',
  // tranquil stream flowing over mossy rocks - Thorarinn Torfason
  'boek-amos': '38216304',
  // Buckskin gulch ravine - ARNAUD VIGNE
  'boek-obadja': '11958638',
  // foamy waves crashing on the shore - Alexey Demidov
  'boek-jona': '9313555',
  // a lush olive tree farm - Magda Ehlers
  'boek-micha': '5283373',
  // mountain shrouded in thick clouds - Francesco Ungaro
  'boek-nahum': '13394132',
  // landscape of mountains and fields under a dark sky - Mehmet Turgut Kirkgoz
  'boek-habakuk': '9646292',
  // sunlight over hills at sunset - Quang Nguyen Vinh
  'boek-zefanja': '10615213',
  // stones stacked on sand heap - General Kenobi
  'boek-haggai': '16567024',
  // lonely desert tree in rugged landscape - Sunrain L
  'boek-zacharia': '38635724',
  // serene misty sunrise over rural Latvian countryside - Lauma Augstkalne
  'boek-maleachi': '29561587',
  // serene lake view with tranquil pebbles - Ilo Frey
  'boek-mattheus': '37822950',
  // barren mountain landscape - Uri Baruch
  'boek-markus': '5590720',
  // sunset above rural countryside field - Vitaliy Fursov
  'boek-lukas': '8964315',
  // mountain and trees - Janko Ferlic
  'boek-johannes': '602430',
  // sea seen from cliff top - SlimMars 13
  'boek-handelingen': '18729420',
  // gray field under gray sky - Marko Tabak
  'boek-romeinen': '5660354',
  // scenic beach view in çanakkale, türkiye - Emre Ayata
  'boek-1-corinthiers': '31172056',
  // overcast Atlantic beach scene in North Carolina - A G
  'boek-2-corinthiers': '39835772',
  // brown mountain under blue sky - Michael Porter
  'boek-galaten': '6068242',
  // green and brown tree branch on blue sea - Engin Akyurt
  'boek-efeziers': '9097405',
  // delicate cosmos flowers in sunlit field - Chris Harvey
  'boek-filippenzen': '36999842',
  // white clouds and blue sky - Chris Flaten
  'boek-colossenzen': '3623693',
  // mystical sunset over misty hills in Kintzheim - Julien Goettelmann
  'boek-1-thessalonicenzen': '29379622',
  // lake in the mountains - Tom Fisk
  'boek-2-thessalonicenzen': '21535033',
  // serene lake at sunrise reflects tranquility - Cara Denison
  'boek-1-timotheus': '37437654',
  // view of hills covered in autumnal trees under a dark, cloudy sky - Rodion Kutsaiev
  'boek-2-timotheus': '16053990',
  // silhouette of mountains by ocean - Ramon Perucho
  'boek-titus': '19593947',
  // grayscale photo of a cropland under sprawling fog - Rastislav Durica
  'boek-filemon': '6018772',
  // weeds on beach - Arthur Shuraev
  'boek-hebreeen': '16693512',
  // agricultural farmland landscape under dark clouds - Péter Kövesi
  'boek-jakobus': '15211413',
  // a large boulder on a grass hill - César
  'boek-1-petrus': '17061420',
  // snow covered mountain under blue sky - Marek Piwnicki
  'boek-2-petrus': '13922651',
  // monochrome sand dunes with shadow patterns - Phil Evenden
  'boek-1-johannes': '31838829',
  // snow covered field with pine trees - andy jossi
  'boek-2-johannes': '14475552',
  // serene forest edge under clear blue sky - Сергей ЮССтудия
  'boek-3-johannes': '33143258',
  // mountains under thick clouds - Connor Scott McManus
  'boek-judas': '13258134',
  // aerial view of clouds illuminated by sunlight - Porfirio Trinidad Matos
  'boek-openbaring': '33462407',
  // sandy beach and a plaint - Alexey Demidov
  'boek-daniel': '11006331',
  // clouds over fields on hills - Quang Nguyen Vinh
  'opstanding': '6871919',
  // sunset over dunes in Death valley National Park - Stephen Leonardi
  'abraham': '28638790',
  // landscape - Leonardo Rossatti
  'mozes': '2613111',
  // gray mountains near the ocean - Nico Becker
  'geloof-in-storm': '5495456',
  // aerial view of rainbow over hills in Bangladesh - Juber Ahmed Sahel
  'noach': '36958971',
  // tall palm trees against clear blue sky - Sébastien Vincon
  'intocht': '33543030',
  // empty grass hill - Ron Lach
  'david': '10211887',
  // lake on hillside - Jakob Lorenzi
  'bergrede': '14975898',
  // lone tree in rural landscape - Oleksandra Zhyvytsia
  'paulus': '14960005',
  // withered leaf on water in shallow photography - Tobias Aeppli
  'psalmen': '1125266',
  // a desert with a lone mountain in the distance - Francesco Ungaro
  'daniel': '28202562',
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
    src: `/images/study-photos/p-${id}.webp`,
    thumb: `/images/study-photos/p-${id}-sm.webp`,
  };
}
