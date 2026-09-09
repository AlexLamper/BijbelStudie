import { ALL_STUDIES } from "../../../lib/bookStudies"
import { renderTreeSvg } from "../../../lib/levensboom/svg"

/**
 * Everything /proeflanding says, in one place.
 *
 * Short on purpose. The page used to carry the whole product here - an
 * eight-row library ledger, three study cards, a plan comparison and a
 * twelve-question accordion - and it read as a data sheet laid over a
 * landscape. What is left is what a landing page owes a visitor: what this is,
 * a few things that are concretely true about it, what it costs, and one way
 * in. Everything cut is still one click away on the pages that exist for it
 * (/studies, /bijbelstudie, /abonnement, /contact).
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

/* ── The library, as names only ───────────────────────────────── */

/**
 * What the reader actually gets, checked against what the app serves
 * (`hooks/useBibleData.ts` for the translations, `lib/mobileAttribution.ts` for
 * the commentaries).
 *
 * Names, not text. Only the Statenvertaling is public domain; the NBG-vertaling
 * 1951 is licensed and the HSV and BasisBijbel never ship at all, so no verse
 * from any of them may appear on a marketing page. KingComments may not be
 * redistributed either, so the commentaries are named and never quoted.
 */
export const DUTCH_TRANSLATIONS = [
  "Statenvertaling",
  "NBG-vertaling 1951",
  "De Heilige Schrift 1917",
  "Canisiusbijbel 1939",
]

export const COMMENTARIES = [
  "KingComments",
  "Matthew Henry",
  "Karl August Dachsel",
  "Heinrich Meyer",
]

/**
 * The two licensing sentences, carried over from the live landing page word for
 * word. They are obligations, not marketing copy: neither may be dropped or
 * reworded while the sources they name are on the page.
 */
export const LICENSE_NOTE =
  "KingComments is voor iedereen gratis en volledig te lezen. De NBG-vertaling 1951 wordt gebruikt onder licentie van het Nederlands-Vlaams Bijbelgenootschap."

/* ── The figures in the hero ──────────────────────────────────── */

/**
 * The four facts under the hero copy. Every figure is counted from the data the
 * page is built from, so none of them is a claim to defend: the studies and the
 * lessons from the catalogue, the translations and the commentaries from the
 * lists above.
 */
const LESSONS_TOTAL = ALL_STUDIES.reduce((sum, study) => sum + study.lessons.length, 0)

export const HERO_STATS: { value: number; label: string; count: boolean }[] = [
  { value: ALL_STUDIES.length, label: "begeleide bijbelstudies", count: true },
  { value: LESSONS_TOTAL, label: "lessen van een kwartier", count: true },
  { value: DUTCH_TRANSLATIONS.length, label: "Nederlandse vertalingen", count: false },
  { value: COMMENTARIES.length, label: "commentaren, per vers", count: false },
]

/* ── What is in the product ───────────────────────────────────── */

/**
 * Three things that are concretely true, one line each. Not a feature ledger:
 * the point of each is that it can be checked, so each names what it is rather
 * than what it is like.
 */
export const REASONS: { title: string; body: string }[] = [
  {
    title: "Vier Nederlandse vertalingen",
    body: `${DUTCH_TRANSLATIONS.join(", ")} - naast elkaar in één scherm.`,
  },
  {
    title: "Uitleg bij elk vers",
    body: "De uitleg van vier commentaren, historische context per hoofdstuk en de Hebreeuwse en Griekse grondtekst.",
  },
  {
    title: "Uw eigen aantekeningen",
    body: "Notities bij elk vers, bewaard in uw account en op elk apparaat. Iedere lezer plant een boom die met elke les meegroeit.",
  },
]

/**
 * The five steps of a lesson - the same five the real flow runs and the live
 * page names in its subheading, described in the order a reader meets them.
 * Enough to know what a quarter of an hour looks like; not a mock-up of it.
 */
export const LESSON_STEPS: { name: string; body: string }[] = [
  { name: "Intro", body: "Waar het gedeelte over gaat, en waar u op let." },
  { name: "Het Woord", body: "Het bijbelgedeelte zelf, rustig gelezen." },
  { name: "Verdieping", body: "Uitleg, kernwoorden en de grondtekst." },
  { name: "Reflectie", body: "Eén vraag, en ruimte voor uw eigen antwoord." },
  { name: "Toetsing", body: "Een korte vraag, om te zien wat blijft hangen." },
]

/* ── The plans ────────────────────────────────────────────────── */

/**
 * Four lines per plan, checked against the enforcement code rather than against
 * what would be nice to claim. Amounts are never written here: they come from
 * lib/pricing.ts at render time, which is what Stripe is charged against.
 */
export const FREE_FEATURES = [
  "Bijbel lezen in vier Nederlandse vertalingen",
  "KingComments commentaar, volledig",
  "Notities, historische context en voortgang",
  "5 AI-vragen per dag",
]

export const PRO_FEATURES = [
  "Alles in het gratis plan",
  "Matthew Henry, Dachsel en Meyer",
  "Grondtekst: Hebreeuws en Grieks",
  "200 AI-vragen per dag",
]
