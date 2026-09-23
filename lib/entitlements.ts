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
