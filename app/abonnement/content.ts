import { PLANS, annualSaving, euro, perYear } from "../../lib/pricing";
import { FREE_COMMENTARY_CHARS } from "../../lib/proContent";
import {
  FREE_AI_DAILY_CAP,
  FREE_GROUP_LIMIT,
  FREE_NOTE_LIMIT,
  PRO_AI_DAILY_CAP,
} from "../../lib/entitlements";
import { PRO_TRIAL_DAYS } from "../../lib/promo";

/**
 * The part of /abonnement that is not the checkout: what the free account
 * includes, what Pro adds, and the questions people ask before they pay.
 *
 * Why this exists: Google crawled /abonnement and declined to index it. The
 * server HTML carried ~216 words, most of them the app shell's navigation, and
 * everything the page said about the plans was already on the indexed home
 * page (/#prijzen). This copy is what the page has that no other page has - the
 * per-feature line between free and Pro, and the billing facts from the terms.
 *
 * Every claim is checked against the code that enforces it, not against what
 * would read well:
 *  - commentary preview: lib/proContent.ts (`FREE_COMMENTARY_CHARS`, KingComments
 *    always free via `isAlwaysFreeCommentary`)
 *  - grondtekst preview: lib/proContent.ts (`FREE_ORIGINAL_VERSES` = 1)
 *  - AI, notes, groups: lib/entitlements.ts, enforced by the website routes
 *    (app/api/ai/chat, app/api/notes, app/api/groepen) AND the app's v1 routes
 *  - voorlezen: app/api/tts serves the natural (cloud) voices to Pro only
 *  - streak protection: lib/streak.ts spends a freeze only for a Pro reader
 *  - tree items: lib/levensboom/catalog.ts (`pro` unlocks)
 *  - trial: lib/promo.ts `PRO_TRIAL_DAYS`, once per account (lib/trialEligibility.ts)
 *  - payment methods: app/api/checkout/route.ts `payment_method_types`
 *  - pause 1-3 months: app/api/subscription/pause/route.ts (Stripe only)
 *  - cancel, withdrawal, App Store: app/i18n/locales/nl/terms-of-service.json
 * tests/abonnementContent.test.ts pins the numbers to those sources.
 *
 * Prices come from lib/pricing.ts only. No "was"-price, no deadline: the one
 * comparison made (annual vs. twelve monthly payments) is between two tariffs
 * that are both genuinely charged, which is what lib/pricing.ts allows.
 */

/** "één groep" rather than "1 groepen" in running text. */
const groupsLed = FREE_GROUP_LIMIT === 1 ? "één groep" : `${FREE_GROUP_LIMIT} groepen`;

const MONTHLY = PLANS.monthly;
const ANNUAL = PLANS.annual;

/** "1.200" - Dutch thousands separator. */
const commentaryChars = FREE_COMMENTARY_CHARS.toLocaleString("nl-NL");

export const PRICING_INTRO = `De Bijbel lezen, de begeleide studies, het KingComments-commentaar en ${FREE_AI_DAILY_CAP} AI-vragen per dag zijn gratis, zonder tijdslimiet en zonder creditcard. Pro kost ${euro(MONTHLY.amountCents)} per maand of ${euro(ANNUAL.amountCents)} per jaar en voegt de volledige commentaren van Matthew Henry, Calvijn en Dachsel toe, de Hebreeuwse en Griekse grondtekst bij elk vers, ${PRO_AI_DAILY_CAP} AI-vragen per dag, onbeperkt notities en voorlezen met natuurlijke stemmen. Had je Pro nog niet eerder, dan zijn de eerste ${PRO_TRIAL_DAYS} dagen gratis.`;

export interface ComparisonRow {
  feature: string;
  free: string;
  pro: string;
}

/** Free and Pro side by side, one row per thing the code treats differently - or deliberately does not. */
export const COMPARISON: ComparisonRow[] = [
  {
    feature: "Bijbeltekst",
    free: "Vier Nederlandse vertalingen en meerdere Engelse en Duitse",
    pro: "Dezelfde vertalingen",
  },
  {
    feature: "Begeleide studies",
    free: "Alle studies, ook de studie bij elk hoofdstuk",
    pro: "Alle studies",
  },
  {
    feature: "Historische context en kaarten",
    free: "Ja",
    pro: "Ja",
  },
  {
    feature: "KingComments",
    free: "Volledig",
    pro: "Volledig",
  },
  {
    feature: "Matthew Henry, Calvijn en Dachsel",
    free: `Het begin van het commentaar bij elk hoofdstuk (de eerste ${commentaryChars} tekens)`,
    pro: "Volledig",
  },
  {
    feature: "Grondtekst (Hebreeuws en Grieks)",
    free: "Het eerste vers van elk hoofdstuk",
    pro: "Elk vers, woord voor woord, ook direct onder het vers dat je in een studie leest",
  },
  {
    feature: "AI-assistent",
    free: `${FREE_AI_DAILY_CAP} vragen per dag`,
    pro: `${PRO_AI_DAILY_CAP} vragen per dag`,
  },
  {
    feature: "Notities",
    free: `Tot ${FREE_NOTE_LIMIT} eigen notities, op de website en in de app samen; markeringen en je antwoorden uit de studies tellen niet mee`,
    pro: "Onbeperkt",
  },
  {
    feature: "Studiegroepen",
    free: `Deelnemen aan elke groep; zelf ${groupsLed} leiden`,
    pro: "Deelnemen en zoveel groepen leiden als je wilt",
  },
  {
    feature: "Voorlezen",
    free: "Met de stem van je browser",
    pro: "Met natuurlijke Nederlandse stemmen",
  },
  {
    feature: "Streakbescherming",
    free: "Nee",
    pro: "Elke vijf dagen verdien je een bescherming; mis je een dag, dan blijft je streak staan",
  },
  {
    feature: "Je boom",
    free: "Groeit mee, met alles wat je vrijspeelt door te lezen en te studeren",
    pro: "Daarnaast de ceder en de cipres, twee extra landschappen, de leeuw en de gouden ring",
  },
  {
    feature: "Prijs",
    free: "€0",
    pro: `${MONTHLY.billedLabel}, of ${ANNUAL.billedLabel}`,
  },
];

/** "Heb ik Pro nodig?" - said plainly, including when the answer is no. */
export const WHO_IS_PRO_FOR: { title: string; text: string }[] = [
  {
    title: "Je hebt Pro niet nodig als",
    text: "je vooral de Bijbel leest, de begeleide studies volgt en af en toe iets aan de AI-assistent vraagt. Dat blijft gratis, zonder tijdslimiet, en er gaat niets verloren als je nooit overstapt.",
  },
  {
    title: "Pro is gemaakt voor wie",
    text: "een gedeelte grondig wil uitzoeken: een bijbelkring of preek voorbereidt, een bijbelboek vers voor vers doorwerkt, verschillende uitleggers naast elkaar wil lezen of wil zien welk Hebreeuws of Grieks woord onder de vertaling ligt.",
  },
];

/** What each Pro line actually opens up, and what a free account sees of it. */
export const PRO_EXPLAINED: { title: string; text: string }[] = [
  {
    title: "Drie klassieke commentaren, volledig",
    text: `Matthew Henry (1662-1714), de Engelse predikant van wie het bekendste commentaar op de hele Bijbel komt, in Nederlandse vertaling. Johannes Calvijn (1509-1564), de reformator, met zijn uitleg van de meeste bijbelboeken. Karl August Dachsel (1818-1893), vers voor vers en met veel aandacht voor de grondtekst. Zonder Pro lees je van elk hoofdstuk de eerste ${commentaryChars} tekens; is het commentaar korter, dan lees je het helemaal.`,
  },
  {
    title: "De grondtekst bij elk vers",
    text: "Onder de vertaling het Hebreeuwse of Griekse woord, met transliteratie, een korte Engelse woordbetekenis en het Strong-nummer, met een link naar het lexicon. In een studie open je het direct onder het vers dat je leest, zodat je vertaling en grondtekst samen ziet. Je hoeft de taal niet te kennen. Zonder Pro zie je de grondtekst van het eerste vers van elk hoofdstuk.",
  },
  {
    title: `${PRO_AI_DAILY_CAP} vragen per dag aan de AI-assistent`,
    text: `De assistent beantwoordt je vragen over het gedeelte dat je leest, bijvoorbeeld over een begrip, de achtergrond of een verband met een andere tekst. Met een gratis account stel je er ${FREE_AI_DAILY_CAP} per dag, met Pro ${PRO_AI_DAILY_CAP}.`,
  },
  {
    title: "Onbeperkt notities, overal",
    text: `Schrijf bij elk vers zoveel notities als je wilt, op de website en in de app. Zonder Pro zijn het er ${FREE_NOTE_LIMIT} in totaal; markeringen en je antwoorden uit de begeleide studies tellen nooit mee, en wat je al schreef blijft altijd leesbaar en bewerkbaar.`,
  },
  {
    title: "Studiegroepen leiden",
    text: `Deelnemen aan een studiegroep is voor iedereen gratis. Met een gratis account leid je zelf ${groupsLed}; met Pro start je er zoveel als je wilt, bijvoorbeeld voor meerdere kringen.`,
  },
  {
    title: "Voorlezen met natuurlijke stemmen",
    text: "Laat een hoofdstuk of een vers voorlezen door een natuurlijke Nederlandse mannen- of vrouwenstem. Zonder Pro lees je voor met de stem die je browser meebrengt.",
  },
];

/**
 * The FAQ, rendered visibly on the page and emitted as the page's only
 * FAQPage node (app/abonnement/layout.tsx). Answers are plain text so the
 * visible copy and the structured data are the same string.
 */
export const ABONNEMENT_FAQ: { q: string; a: string }[] = [
  {
    q: "Is BijbelStudie gratis te gebruiken?",
    a: `Ja. Met een gratis account lees je de Bijbel in alle beschikbare vertalingen, volg je alle begeleide studies, lees je het KingComments-commentaar volledig, stel je ${FREE_AI_DAILY_CAP} vragen per dag aan de AI-assistent, schrijf je ${FREE_NOTE_LIMIT} notities en doe je mee met elke studiegroep. Er zit geen tijdslimiet aan en je hebt geen creditcard nodig. Pro voegt de volledige commentaren van Matthew Henry, Calvijn en Dachsel toe, de grondtekst bij elk vers, ${PRO_AI_DAILY_CAP} AI-vragen per dag, onbeperkt notities, meer dan ${groupsLed} leiden, voorlezen met natuurlijke stemmen, streakbescherming en extra bomen en landschappen voor je boom.`,
  },
  {
    q: "Wat kost BijbelStudie Pro?",
    a: `Pro kost ${MONTHLY.billedLabel}, of ${ANNUAL.billedLabel}. De prijzen zijn inclusief btw. Wie een jaar lang maandelijks betaalt, is ${perYear(MONTHLY)} kwijt; het jaarplan is daarmee ${annualSaving()} goedkoper. Het abonnement verlengt automatisch aan het einde van elke periode, totdat je opzegt.`,
  },
  {
    q: "Kan ik Pro eerst gratis proberen?",
    a: `Ja, als je nog nooit Pro hebt gehad: de eerste ${PRO_TRIAL_DAYS} dagen zijn gratis. Je kiest een plan en een betaalmethode, maar betaalt vandaag niets. Zeg je binnen ${PRO_TRIAL_DAYS} dagen op via Instellingen, dan wordt er niets afgeschreven; anders gaat je abonnement daarna vanzelf in tegen de prijs van je plan. De proefperiode is er één keer per account.`,
  },
  {
    q: "Hoe zeg ik mijn abonnement op?",
    a: "Via Instellingen, onder Abonnement. Je hoeft geen reden op te geven en niemand te bellen of te mailen. Je houdt Pro tot het einde van de periode die je al betaald hebt; daarna wordt er niets meer afgeschreven. Je notities en voortgang blijven bewaard.",
  },
  {
    q: "Kan ik mijn abonnement pauzeren in plaats van opzeggen?",
    a: "Ja, voor een, twee of drie maanden, ook via Instellingen onder Abonnement. Tijdens de pauze betaal je niets, je notities en voortgang blijven bewaard en daarna loopt het abonnement vanzelf weer door. Pauzeren kan bij een abonnement dat je op de website hebt afgesloten.",
  },
  {
    q: "Welke betaalmethoden kan ik gebruiken?",
    a: "iDEAL, Bancontact, SEPA-incasso en creditcard. De betaling verloopt via Stripe.",
  },
  {
    q: "Ik heb Pro in de app gekocht. Werkt dat ook op de website?",
    a: "Ja. Log op de website in met hetzelfde account, dan wordt je abonnement uit de App Store herkend. Opzeggen of wijzigen doe je in dat geval in je Apple-account, niet op de website.",
  },
  {
    q: "Kan ik mijn geld terugkrijgen?",
    a: "Binnen 14 dagen na het afsluiten kun je de overeenkomst zonder opgave van reden herroepen, via info@bijbelstudie.io. Omdat je direct toegang tot Pro krijgt, betaal je dan alleen naar verhouding voor de dagen dat je het al gebruikte; de rest krijg je binnen 14 dagen terug. Daarna worden betaalde periodes niet terugbetaald, tenzij de wet anders bepaalt.",
  },
];

/** Public pages this one should hand a reader on to - and the only crawlable links on it besides the app shell's. */
export const ABONNEMENT_LINKS: { href: string; label: string; description: string }[] = [
  {
    href: "/bijbelstudie/gratis",
    label: "Gratis bijbelstudie",
    description: "Alle gratis vertalingen, commentaren en bronnen op een rij, ook buiten deze site.",
  },
  {
    href: "/studies",
    label: "Begeleide studies",
    description: "Uitgewerkte studies over personen, thema's en bijbelboeken - gratis.",
  },
  {
    href: "/bijbelstudie",
    label: "Bijbelstudie: de complete gids",
    description: "Wat bijbelstudie is, welke methoden er zijn en hoe je begint.",
  },
  {
    href: "/help",
    label: "Help en veelgestelde vragen",
    description: "Over je account, de vertalingen, de AI-assistent en privacy.",
  },
  {
    href: "/algemene-voorwaarden",
    label: "Algemene voorwaarden",
    description: "Looptijd, verlenging, opzeggen en herroepingsrecht in detail.",
  },
];
