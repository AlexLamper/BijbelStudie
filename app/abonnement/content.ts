import { PLANS, annualSaving, euro, perYear } from "../../lib/pricing";
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

export const PRICING_INTRO = `Lezen, begeleide studies, KingComments en ${FREE_AI_DAILY_CAP} AI-vragen per dag zijn gratis. Pro voegt Matthew Henry, Calvijn, Dachsel, de grondtekst bij elk vers en ${PRO_AI_DAILY_CAP} AI-vragen per dag toe, vanaf ${euro(MONTHLY.amountCents)}/maand. Eerste ${PRO_TRIAL_DAYS} dagen gratis.`;

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
