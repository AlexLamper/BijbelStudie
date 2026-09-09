import { ALL_STUDIES } from "../../../lib/bookStudies"
import { curatedStudies, type StudyType } from "../../../lib/data/curated-studies"
import { opstandingLessons } from "../../../lib/data/study-lessons/opstanding"
import { renderTreeSvg } from "../../../lib/levensboom/svg"
import { type DemoLesson } from "../StudyFlowDemo"

/**
 * Everything /proeflanding says, in one place.
 *
 * It is the live landing page's substance, carried over unchanged: the same
 * figures counted from the same catalogue, the same library, the same plan
 * lists and the same lesson. Restaged, not rewritten - the point of the
 * experiment is the staging.
 */

/** One fixed seed for every tree on this page, so the build output is stable. */
export const LANDING_SEED = "bijbelstudie-levensboom"

/** The marketing tree: grown, at dusk, the same one the live hero shows. */
export const SCENE_LEVEL = 14

/**
 * The scene behind the whole page, drawn on the server.
 *
 * `xMidYMax slice` rather than `xMidYMid slice`: aligned to the bottom, a wide
 * screen crops sky off the top and a phone crops sky off the sides, and in both
 * cases the ground the tree stands in survives. Centred, a 21:9 monitor would
 * cut the ground away.
 *
 * `maxLeaves` is held well under the 320 default: this SVG is inline in the
 * document of the page's first paint, so every leaf is bytes in front of the
 * headline.
 */
export function sceneSvg(): string {
  return renderTreeSvg({
    seed: LANDING_SEED,
    level: SCENE_LEVEL,
    frac: 0.7,
    species: "eik",
    scene: "waterbeken",
    framing: "scene",
    width: 1600,
    height: 1000,
    season: "summer",
    timeOfDay: "dusk",
    maxLeaves: 200,
    rootAttributes: 'aria-hidden="true" preserveAspectRatio="xMidYMax slice"',
  })
}

/**
 * The four facts under the hero copy. Every figure is counted from the data the
 * page is built from, so none of them is a claim to defend: the studies and
 * lessons from the catalogue, the translations and commentaries from the
 * library section further down.
 */
const LESSONS_TOTAL = ALL_STUDIES.reduce((sum, study) => sum + study.lessons.length, 0)

export const HERO_STATS: { value: number; label: string; count: boolean }[] = [
  { value: ALL_STUDIES.length, label: "begeleide bijbelstudies", count: true },
  { value: LESSONS_TOTAL, label: "lessen van een kwartier", count: true },
  { value: 4, label: "Nederlandse vertalingen", count: false },
  { value: 4, label: "commentaren, per vers", count: false },
]

/* ── The library ──────────────────────────────────────────────── */

/**
 * What is actually in the library, checked against what the app serves:
 * `hooks/useBibleData.ts` for the translations and `lib/mobileAttribution.ts`
 * for the commentaries. `short` is the tab label in the mock reader.
 */
export const TRANSLATIONS = [
  { name: "Statenvertaling",    short: "Statenvertaling", year: "1637", note: "De klassieke Nederlandse vertaling",                      tag: "Standaard" },
  { name: "NBG-vertaling",      short: "NBG 1951",        year: "1951", note: "Decennialang de kanselbijbel van de protestantse kerken", tag: "Onder licentie" },
  { name: "De Heilige Schrift", short: "1917",            year: "1917", note: "De eerste NBG-vertaling, in de taal van haar tijd",       tag: null },
  { name: "Canisiusbijbel",     short: "Canisius",        year: "1939", note: "Rooms-katholieke vertaling met deuterocanonieke boeken",  tag: null },
]

export const ENGLISH_TRANSLATIONS = 5

export const COMMENTARIES = [
  { name: "KingComments",        author: "Ger de Koning", note: "Eigentijds Nederlandstalig commentaar op de hele Bijbel, vers voor vers",  free: true  },
  { name: "Matthew Henry",       author: "1662-1714",     note: "Het bekendste commentaar op de hele Bijbel, in Nederlandse vertaling",     free: false },
  { name: "Karl August Dachsel", author: "1818-1893",     note: "Uitvoerig vers-voor-vers commentaar met veel aandacht voor de grondtekst", free: false },
  { name: "Heinrich Meyer",      author: "1800-1873",     note: "Kritisch-exegetisch commentaar op het Nieuwe Testament",                   free: false },
]

/* ── The studies ──────────────────────────────────────────────── */

export const KIND_LABEL: Record<StudyType, string> = {
  Boek: "Bijbelboek",
  Persoon: "Persoon",
  Gedeelte: "Gedeelte",
  Onderwerp: "Thema",
}

/** The hand-authored studies - the ones with real cover art and an intro a card
 *  can carry. Same rule the live page and the /studies carousel use. */
export const FEATURED_STUDIES = curatedStudies
  .filter(study => study.type !== "Boek" || (study.about?.length ?? 0) > 0)
  .slice(0, 3)

/* ── The plans ────────────────────────────────────────────────── */

/**
 * Both columns are checked against the enforcement code, not against what would
 * be nice to claim. Amounts are never written here: they come from
 * lib/pricing.ts at render time, which is what Stripe is charged against.
 */
export const FREE_FEATURES = [
  "Bijbel lezen (vier Nederlandse vertalingen)",
  "KingComments commentaar, volledig",
  "5 vragen per dag aan de AI-assistent",
  "Persoonlijke notities bij verzen",
  "Historische context per hoofdstuk",
  "Voortgang bijhouden",
]

export const PRO_FEATURES = [
  "Alles in het gratis plan",
  "200 AI-vragen per dag, i.p.v. 5",
  "Matthew Henry commentaar (NL)",
  "Karl August Dachsel en Heinrich Meyer",
  "Grondtekst: Hebreeuws en Grieks",
  "Prioriteitsondersteuning",
]

/* ── The lesson the demo plays ────────────────────────────────── */

/**
 * Les 1 of "De opstanding van Jezus", built from the same authored prose the
 * real flow serves (lib/data/study-lessons/opstanding) and the Statenvertaling
 * text of Johannes 20:1-3 - the one translation in the library that is public
 * domain and may therefore be quoted here at all.
 *
 * Assembled on the server at build time, so the browser receives finished copy
 * and an SVG of the tree, and only the playback runs on the client.
 */
export function demoLesson(): DemoLesson {
  const authored = opstandingLessons[1]
  return {
    studyTitle: "De opstanding van Jezus",
    lessonsTotal: 3,
    lesson: { day: 1, title: "Het lege graf", reference: "Johannes 20:1–18", minutes: 12 },
    intro: {
      headline: authored.intro?.headline ?? "Het lege graf",
      body: authored.intro?.body ?? [],
      watchFor: authored.intro?.watchFor ?? [],
    },
    readingCue: authored.word?.readingCue ?? "Lees rustig.",
    translation: "Statenvertaling",
    verses: [
      { n: 1, text: "En op den eersten dag der week ging Maria Magdalena vroeg, als het nog duister was, naar het graf; en zag den steen van het graf weggenomen." },
      { n: 2, text: "Zij liep dan, en kwam tot Simon Petrus en tot den anderen discipel, welken Jezus liefhad, en zeide tot hen: Zij hebben den Heere weggenomen uit het graf, en wij weten niet, waar zij Hem gelegd hebben." },
      { n: 3, text: "Petrus dan ging uit, en de andere discipel, en zij kwamen tot het graf." },
    ],
    depth: {
      body: authored.depth?.body ?? [],
      terms: authored.depth?.terms ?? [],
    },
    greek: [
      { word: "μιᾷ", translit: "mia", meaning: "eerste", strong: "G1520" },
      { word: "σαββάτων", translit: "sabbatōn", meaning: "van de week", strong: "G4521" },
      { word: "πρωΐ", translit: "prōi", meaning: "vroeg", strong: "G4404" },
      { word: "σκοτίας", translit: "skotias", meaning: "duisternis", strong: "G4653" },
      { word: "μνημεῖον", translit: "mnēmeion", meaning: "graf", strong: "G3419" },
      { word: "λίθον", translit: "lithon", meaning: "steen", strong: "G3037" },
    ],
    reflection: {
      question: authored.reflection?.question ?? "",
      prompts: authored.reflection?.prompts ?? [],
      placeholder: authored.reflection?.placeholder ?? "Schrijf op wat je opviel...",
      sample: "Maria zoekt een lichaam en vindt een stem. Ik herken Hem ook vaker in wat ik lees dan in wat ik zie.",
    },
    quiz: {
      question: "Wie komt in Johannes 20 als eerste bij het graf?",
      answers: ["Maria Magdalena", "Simon Petrus", "De andere discipel", "Thomas"],
      correct: 0,
    },
    xp: 25,
    nextLesson: { day: 2, title: "“Mijn Heer en mijn God”", reference: "Johannes 20:19–31" },
    tree: {
      svg: renderTreeSvg({ seed: LANDING_SEED, level: 7, frac: 0.7, species: "eik", framing: "portrait", width: 176, height: 176, rootAttributes: 'aria-hidden="true"' }),
      seed: LANDING_SEED,
      level: 7,
      species: "eik",
    },
  }
}
