/**
 * What a free account may do, in numbers. The one place each limit is decided.
 *
 * Pure constants, no Mongoose: the routes that enforce these (web AND the v1
 * app API) import them, and so does the copy on /abonnement, the help pages
 * and the paywalls. Before this file the numbers lived beside each route, and
 * web and app drifted apart - notes were capped on the website and unlimited
 * in the app, and creating a group was Pro on the website and free in the app.
 * A limit that only one client enforces is not a limit.
 *
 * tests/abonnementContent.test.ts pins the pricing-page copy to these values:
 * a pricing page that names a different number than the code enforces is a
 * false entitlement claim, not a typo.
 */

/** AI questions per day on a free account. */
export const FREE_AI_DAILY_CAP = 3;

/**
 * AI questions per day with Pro. A soft anti-abuse ceiling, which is why the
 * copy says "200 per dag" and never "onbeperkt".
 */
export const PRO_AI_DAILY_CAP = 200;

/**
 * Notes a free account may write, website and app together. Highlights and the
 * answers a finished lesson stores (tag "studie") are not counted - see
 * `limitedNotesFilter` in lib/noteXp.ts. Existing notes above the limit stay
 * readable and editable; only creating a new one is refused.
 */
export const FREE_NOTE_LIMIT = 10;

/**
 * Study groups a free account may lead (create) at once. Joining a group is
 * always free and never counted. One free group lets a kring leader bring their
 * kring in - every member then meets the app on a free account - while running
 * more than one group is Pro.
 */
export const FREE_GROUP_LIMIT = 1;

export function canCreateGroup(groupsLed: number, isPro: boolean): boolean {
  return isPro || groupsLed < FREE_GROUP_LIMIT;
}

/** Shown when a free account tries to start a second group, on the website and in the app. */
export const GROUP_LIMIT_MESSAGE =
  `Met een gratis account leid je ${FREE_GROUP_LIMIT === 1 ? 'één groep' : `${FREE_GROUP_LIMIT} groepen`}. ` +
  'Met Pro start je zoveel groepen als je wilt. Deelnemen aan groepen blijft altijd gratis.';

/**
 * Cross-references a free reader sees per verse, website and app together.
 * They are the top-ranked ones (the list is sorted by OpenBible votes), so the
 * free taste is the best material; the rest of the list is Pro. A verse with
 * this many references or fewer shows no lock at all. Enforced by
 * `gateCrossRefs` in lib/proContent.ts - server-side on /api/v1/crossrefs.
 */
export const FREE_CROSS_REFS = 2;

/* -------------------------------------------------------------------------- */
/* Reverse trial and the personal limit                                       */
/* -------------------------------------------------------------------------- */

/**
 * A new account starts with Pro for its first REVERSE_TRIAL_DAYS *active* days:
 * Dutch calendar days on which the reader actually opened the app or the
 * website, counted on the server, both clients together. Nothing is asked for
 * up front. The bookkeeping is lib/reverseTrial.ts; the rules are pure, in
 * lib/reverseTrialRules.ts.
 */
export const REVERSE_TRIAL_DAYS = 3;

/**
 * The four things a reader leans on during those days, tracked per account
 * while the trial runs. The order is the tie-break when two score the same:
 * the costlier feature to serve wins, so a tie never hands out the cheaper
 * personal limit.
 *  - ai: questions to the AI-assistent;
 *  - notes: notes written (and verses highlighted, at half weight);
 *  - study: Pro study material opened - a Matthew Henry / Calvijn / Dachsel
 *    chapter, the grondtekst, the cross-references;
 *  - audio: background music, a chapter read aloud with a natural voice, a
 *    book downloaded for offline reading;
 *  - studies: the guided lessons - steps worked through (quiz and reflection
 *    included) and lessons finished. Free for everyone, without limit, unless
 *    it becomes this account's personal limit.
 * Studies lead the tie-break: they are what readers come back for (Alex, Nov
 * 2026: 106 enrolments in 30 days, "volgende stap" the most clicked control).
 */
export type ProFeature = "studies" | "ai" | "notes" | "study" | "audio";
export const PRO_FEATURE_KEYS: readonly ProFeature[] = ["studies", "ai", "notes", "study", "audio"];

export function isProFeature(value: unknown): value is ProFeature {
  return typeof value === "string" && (PRO_FEATURE_KEYS as readonly string[]).includes(value);
}

/**
 * The tiny allowances. After the trial, the ONE feature a reader used most
 * keeps a taste of what it was, and nothing more; every other feature gets the
 * normal free limits above. Bible reading is never limited.
 */
/** AI questions per day when AI is the personal limit (instead of FREE_AI_DAILY_CAP). */
export const TINY_AI_DAILY_CAP = 1;
/**
 * Notes an account may hold before writing a new one is refused, when notes
 * are the personal limit: none. Every existing note stays readable and
 * editable, highlights stay free, only a NEW note is Pro.
 */
export const TINY_NOTE_LIMIT = 0;
/**
 * Chapters a day for which the Pro study material opens in full when study is
 * the personal limit: the paid commentaries and the grondtekst of that chapter,
 * all of it. Every other chapter that day shows the lock, without the free
 * preview. KingComments stays free in full, always (a licensing fact).
 */
export const TINY_STUDY_CHAPTERS_PER_DAY = 1;
/** Cross-references per verse when study is the personal limit (instead of FREE_CROSS_REFS). */
export const TINY_CROSS_REFS = 1;
/**
 * Music tracks or chapters read aloud with a natural voice, together, per day,
 * when audio is the personal limit. On a normal free account these are Pro
 * only (0); offline download stays Pro either way.
 */
export const TINY_AUDIO_PER_DAY = 1;
/**
 * Anti-abuse ceiling behind TINY_AUDIO_PER_DAY on the website's natural voices,
 * which are billed per character: one reading a day is counted by the reading
 * the browser names, and this caps what a client that lies about that can
 * spend. Longer than the longest chapter (Psalm 119).
 */
export const TINY_TTS_DAILY_CHARS = 40_000;
/**
 * New lessons a day when studies are the personal limit. Only STARTING a
 * lesson counts: a lesson already begun - yesterday, last week - is always
 * finished, and a finished one can always be reread. Enforced by
 * lib/lessonAllowance.ts wherever a lesson is served or written.
 */
export const TINY_LESSONS_PER_DAY = 1;

/**
 * What one account may do right now. `null` means unlimited (Pro). Both
 * clients receive this object (`limits` on /api/v1/me and in the website
 * session) and mirror it; the routes enforce it.
 */
export interface Limits {
  /** AI questions per day. */
  aiDaily: number;
  /** Notes an account may hold before a new one is refused; null = unlimited. */
  notes: number | null;
  /** Cross-references per verse; null = all. */
  crossRefs: number | null;
  /**
   * null: the normal free preview of paid study material (FREE_COMMENTARY_CHARS,
   * FREE_ORIGINAL_VERSES), as often as you like - or everything, for Pro.
   * A number: that many chapters a day in full, nothing beyond.
   */
  studyChaptersPerDay: number | null;
  /** Music tracks / natural-voice readings per day; null = unlimited, 0 = Pro only. */
  audioPerDay: number | null;
  /** Offline download of whole books. */
  offline: boolean;
  /** New lessons a day; null = as many as you like (Pro, and every free account but one). */
  lessonsPerDay: number | null;
  /** The feature with a personal limit, or null when every limit is the normal one. */
  limitedFeature: ProFeature | null;
}

export const PRO_LIMITS: Limits = {
  aiDaily: PRO_AI_DAILY_CAP,
  notes: null,
  crossRefs: null,
  studyChaptersPerDay: null,
  audioPerDay: null,
  offline: true,
  lessonsPerDay: null,
  limitedFeature: null,
};

export const FREE_LIMITS: Limits = {
  aiDaily: FREE_AI_DAILY_CAP,
  notes: FREE_NOTE_LIMIT,
  crossRefs: FREE_CROSS_REFS,
  studyChaptersPerDay: null,
  audioPerDay: 0,
  offline: false,
  lessonsPerDay: null,
  limitedFeature: null,
};

/** The limits for an account: Pro, the normal free ones, or free with one personal limit. */
export function limitsFor(isPro: boolean, limitedFeature: ProFeature | null = null): Limits {
  if (isPro) return PRO_LIMITS;
  switch (limitedFeature) {
    case "ai":
      return { ...FREE_LIMITS, aiDaily: TINY_AI_DAILY_CAP, limitedFeature };
    case "notes":
      return { ...FREE_LIMITS, notes: TINY_NOTE_LIMIT, limitedFeature };
    case "study":
      return {
        ...FREE_LIMITS,
        crossRefs: TINY_CROSS_REFS,
        studyChaptersPerDay: TINY_STUDY_CHAPTERS_PER_DAY,
        limitedFeature,
      };
    case "audio":
      return { ...FREE_LIMITS, audioPerDay: TINY_AUDIO_PER_DAY, limitedFeature };
    case "studies":
      return { ...FREE_LIMITS, lessonsPerDay: TINY_LESSONS_PER_DAY, limitedFeature };
    default:
      return FREE_LIMITS;
  }
}

/** What the trial counted. Every field optional: a counter that never moved is absent. */
export interface TrialUsage {
  ai?: number;
  notes?: number;
  highlights?: number;
  study?: number;
  audio?: number;
  /** Lessons finished. */
  lessons?: number;
  /** Lesson steps worked through for the first time (quiz and reflection are steps). */
  lessonSteps?: number;
  /** Not a feature: chapters read, for the recap only. */
  chapters?: number;
}

/** A highlight is a tap; a note is a sentence. Half weight keeps a highlighter from outranking a writer. */
export const HIGHLIGHT_WEIGHT = 0.5;

/**
 * A lesson step is a tap on "volgende stap" through one part of a lesson;
 * a lesson has five or six. Four steps weigh one point, so a finished lesson
 * (1 for finishing it, plus its steps) counts about two and a half - about
 * as much as two or three AI questions, which is roughly the effort.
 */
export const LESSON_STEP_WEIGHT = 0.25;

/** Below this score a feature was not really used, and is never the personal limit. */
export const MIN_TOP_FEATURE_SCORE = 1;

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export function featureScores(usage: TrialUsage | null | undefined): Record<ProFeature, number> {
  const u = usage ?? {};
  return {
    ai: count(u.ai),
    notes: count(u.notes) + count(u.highlights) * HIGHLIGHT_WEIGHT,
    study: count(u.study),
    audio: count(u.audio),
    studies: count(u.lessons) + count(u.lessonSteps) * LESSON_STEP_WEIGHT,
  };
}

/**
 * The feature this reader used most during the trial, or null when they used
 * none of the four (then every limit is the normal free one). Ties go to the
 * earlier entry in PRO_FEATURE_KEYS.
 */
export function pickTopFeature(usage: TrialUsage | null | undefined): ProFeature | null {
  const scores = featureScores(usage);
  let best: ProFeature | null = null;
  for (const feature of PRO_FEATURE_KEYS) {
    const score = scores[feature];
    if (score < MIN_TOP_FEATURE_SCORE) continue;
    if (best === null || score > scores[best]) best = feature;
  }
  return best;
}

/** "1 vraag" / "9 vragen". */
function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "in 3 dagen" for the days the trial actually ran. */
function inDays(days: number): string {
  return days > 0 ? ` in ${plural(days, "dag", "dagen")}` : "";
}

/**
 * The reader's own numbers, as the paywall and the recap lead with them:
 * "Je stelde 9 vragen aan de AI in 3 dagen". Null when there is nothing to
 * say. The app has the same sentences in personal_plan.dart.
 */
export function usageHeadline(feature: ProFeature, usage: TrialUsage | null | undefined, days: number): string | null {
  const u = usage ?? {};
  switch (feature) {
    case "ai": {
      const n = count(u.ai);
      return n > 0 ? `Je stelde ${plural(n, "vraag", "vragen")} aan de AI${inDays(days)}` : null;
    }
    case "notes": {
      const notes = count(u.notes);
      if (notes > 0) return `Je schreef ${plural(notes, "notitie", "notities")}${inDays(days)}`;
      const marks = count(u.highlights);
      return marks > 0 ? `Je markeerde ${plural(marks, "vers", "verzen")}${inDays(days)}` : null;
    }
    case "study": {
      const n = count(u.study);
      return n > 0 ? `Je opende ${plural(n, "keer", "keer")} commentaar, grondtekst of kruisverwijzingen${inDays(days)}` : null;
    }
    case "audio": {
      const n = count(u.audio);
      return n > 0 ? `Je luisterde ${plural(n, "keer", "keer")} naar muziek of voorlezen${inDays(days)}` : null;
    }
    case "studies": {
      const lessons = count(u.lessons);
      if (lessons > 0) return `Je deed ${plural(lessons, "les", "lessen")}${inDays(days)}`;
      const steps = count(u.lessonSteps);
      return steps > 0 ? `Je zette ${plural(steps, "stap", "stappen")} in je lessen${inDays(days)}` : null;
    }
  }
}

/**
 * What a free account keeps of each feature when it is the personal limit -
 * the sentence the recap, the paywall and /abonnement use. Each one names
 * exactly the TINY_* value above.
 */
export const PERSONAL_LIMIT_LINES: Record<ProFeature, string> = {
  ai: `${plural(TINY_AI_DAILY_CAP, "vraag", "vragen")} per dag aan de AI-assistent`,
  notes: "geen nieuwe notities; je bestaande notities blijf je lezen en bewerken",
  study: `elke dag ${plural(TINY_STUDY_CHAPTERS_PER_DAY, "hoofdstuk", "hoofdstukken")} met al het commentaar en de grondtekst, en ${plural(TINY_CROSS_REFS, "kruisverwijzing", "kruisverwijzingen")} per vers`,
  audio: `${TINY_AUDIO_PER_DAY} muzieknummer of voorgelezen hoofdstuk per dag`,
  studies: `${plural(TINY_LESSONS_PER_DAY, "nieuwe les", "nieuwe lessen")} per dag; een les waar je al aan begonnen bent, maak je altijd af`,
};

/** The feature's name in running text: "Je AI-vragen", "Je notities"... */
export const PRO_FEATURE_NAMES: Record<ProFeature, string> = {
  ai: "AI-vragen",
  notes: "notities",
  study: "studiemateriaal",
  audio: "muziek en voorlezen",
  studies: "de lessen",
};

/**
 * The line a gate shows when the PERSONAL limit refuses something - the server
 * message on the website and in the app. Each one says what is left, so the
 * refusal never reads as "this is broken".
 */
export function personalLimitReason(feature: ProFeature): string {
  switch (feature) {
    case "ai":
      return `Je gratis AI-vraag voor vandaag is gesteld. Morgen kun je er weer ${TINY_AI_DAILY_CAP} stellen.`;
    case "notes":
      return "Nieuwe notities schrijven hoort bij Pro. Je bestaande notities blijf je lezen en bewerken, en markeren blijft gratis.";
    case "study":
      return `Je gratis hoofdstuk met al het studiemateriaal is voor vandaag gebruikt. Morgen opent er weer ${TINY_STUDY_CHAPTERS_PER_DAY}.`;
    case "audio":
      return `Je gratis muzieknummer of voorgelezen hoofdstuk is voor vandaag gebruikt. Morgen kun je er weer ${TINY_AUDIO_PER_DAY} kiezen.`;
    case "studies":
      return `Je nieuwe les voor vandaag ben je al begonnen. Morgen kun je weer ${TINY_LESSONS_PER_DAY} nieuwe les beginnen; een les waar je al in zit, maak je gewoon af.`;
  }
}

/**
 * What stays free, in words, for an account with [limited] as its personal
 * limit (null: the normal free account). The recap and /abonnement read this,
 * so the list can never promise a number the routes do not allow.
 */
export function freeIncludes(limited: ProFeature | null): string[] {
  const lines = [
    "de Bijbel lezen in alle vertalingen",
    limited === "studies" ? `${plural(TINY_LESSONS_PER_DAY, "nieuwe les", "nieuwe lessen")} per dag in de begeleide studies` : "alle begeleide studies",
    "het KingComments-commentaar",
  ];
  if (limited !== "ai") lines.push(`${FREE_AI_DAILY_CAP} AI-vragen per dag`);
  if (limited !== "notes") lines.push(`${FREE_NOTE_LIMIT} notities (markeren onbeperkt)`);
  else lines.push("onbeperkt markeren");
  if (limited !== "study") lines.push(`${FREE_CROSS_REFS} kruisverwijzingen per vers`);
  return lines;
}

/** "a, b en c". */
export function dutchList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} en ${items[items.length - 1]}`;
}

/**
 * The reverse trial in two sentences, for /abonnement, the help pages and the
 * guides. Every number comes from the constants above; nothing here may name
 * a limit the routes do not enforce.
 */
export const REVERSE_TRIAL_SUMMARY =
  `Een nieuw account heeft op de eerste ${REVERSE_TRIAL_DAYS} dagen waarop je BijbelStudie opent alles van Pro. ` +
  "Daarna ga je vanzelf verder met de gratis versie.";

/** For accounts from before the reverse trial: they get it once, too. */
export const EXISTING_ACCOUNT_TRIAL_LINE =
  `Had je al een account van voor deze regeling en nooit Pro, dan krijg je de ${REVERSE_TRIAL_DAYS} Pro-dagen één keer, vanaf je eerstvolgende bezoek.`;

/** The studies line in the free list: what a reader whose personal limit is studies keeps. */
export const STUDIES_LIMIT_NOTE =
  `Waren de lessen wat je het meest gebruikte in je Pro-dagen, dan begin je daarna ${TINY_LESSONS_PER_DAY} nieuwe les per dag; een les waar je al aan begonnen bent, maak je altijd af.`;

export const PERSONAL_LIMIT_SUMMARY =
  "Wat je in die dagen het meest gebruikte, houd je daarna in een klein dagelijks deel: " +
  `bij AI-vragen ${PERSONAL_LIMIT_LINES.ai}; ` +
  `bij notities ${PERSONAL_LIMIT_LINES.notes}; ` +
  `bij studiemateriaal ${PERSONAL_LIMIT_LINES.study}; ` +
  `bij muziek en voorlezen ${PERSONAL_LIMIT_LINES.audio}; ` +
  `bij de lessen ${PERSONAL_LIMIT_LINES.studies}. ` +
  "Al het andere houdt de gewone gratis limieten, en gebruikte je geen van die vijf, dan gelden overal de gewone gratis limieten. " +
  "De Bijbel lezen blijft altijd gratis.";
