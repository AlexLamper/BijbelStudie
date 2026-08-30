/**
 * Pathname to a fixed route key, for `page_view` and `ui_click`.
 *
 * `/api/analytics` is reachable while logged out, so nothing a client sends may
 * ever be persisted verbatim - that is the rule the whole allowlist in
 * lib/analyticsSchema.ts exists to enforce. A raw pathname breaks it twice
 * over: it is attacker-chosen text, and it is unbounded cardinality (every
 * `/bijbelboeken/<slug>` would be its own row).
 *
 * So the client sends the pathname, the SERVER normalises it here, and only the
 * resulting key - one of the constants below - is written. Dynamic segments
 * collapse into their parent: 66 book pages become `bijbelboeken_detail`, which
 * is the number an admin actually wants anyway.
 *
 * Anything unrecognised becomes `other`. Never `unknown`-per-path: a route that
 * is added without being registered here should show up as one visible bucket
 * to be fixed, not as a long tail of junk.
 */

export const ROUTE_KEYS = [
  'home',
  'dashboard',
  'lezen',
  'studies',
  'studies_detail',
  'studie_flow',
  'notities',
  'groepen',
  'groepen_detail',
  'profiel',
  'instellingen',
  'abonnement',
  'succes',
  'geannuleerd',
  'hulpbronnen',
  'hulpbronnen_detail',
  'bijbelboeken',
  'bijbelboeken_detail',
  'bijbelstudie',
  'help',
  'contact',
  'feedback',
  'inloggen',
  'registreren',
  'wachtwoord_vergeten',
  'wachtwoord_herstellen',
  'privacybeleid',
  'algemene_voorwaarden',
  'admin',
  'other',
] as const;

export type RouteKey = (typeof ROUTE_KEYS)[number];

/** Human labels for the admin dashboard. */
export const ROUTE_LABELS: Record<RouteKey, string> = {
  home: 'Landingspagina',
  dashboard: 'Dashboard',
  lezen: 'Lezen',
  studies: 'Studies (overzicht)',
  studies_detail: 'Studie (detail)',
  studie_flow: 'Studieflow (les)',
  notities: 'Notities',
  groepen: 'Groepen',
  groepen_detail: 'Groep (detail)',
  profiel: 'Profiel',
  instellingen: 'Instellingen',
  abonnement: 'Abonnement',
  succes: 'Betaling gelukt',
  geannuleerd: 'Betaling geannuleerd',
  hulpbronnen: 'Hulpbronnen',
  hulpbronnen_detail: 'Hulpbron (detail)',
  bijbelboeken: 'Bijbelboeken',
  bijbelboeken_detail: 'Bijbelboek (detail)',
  bijbelstudie: 'Bijbelstudie (SEO)',
  help: 'Help',
  contact: 'Contact',
  feedback: 'Feedback',
  inloggen: 'Inloggen',
  registreren: 'Registreren',
  wachtwoord_vergeten: 'Wachtwoord vergeten',
  wachtwoord_herstellen: 'Wachtwoord herstellen',
  privacybeleid: 'Privacybeleid',
  algemene_voorwaarden: 'Algemene voorwaarden',
  admin: 'Beheer',
  other: 'Overig',
};

/** Exact paths, checked before the prefix rules below. */
const EXACT: Record<string, RouteKey> = {
  '/': 'home',
  '/dashboard': 'dashboard',
  '/lezen': 'lezen',
  '/studies': 'studies',
  '/notities': 'notities',
  '/groepen': 'groepen',
  '/profiel': 'profiel',
  '/instellingen': 'instellingen',
  '/abonnement': 'abonnement',
  '/succes': 'succes',
  '/geannuleerd': 'geannuleerd',
  '/hulpbronnen': 'hulpbronnen',
  '/bijbelboeken': 'bijbelboeken',
  '/bijbelstudie': 'bijbelstudie',
  '/help': 'help',
  '/contact': 'contact',
  '/feedback': 'feedback',
  '/inloggen': 'inloggen',
  '/registreren': 'registreren',
  '/wachtwoord-vergeten': 'wachtwoord_vergeten',
  '/wachtwoord-herstellen': 'wachtwoord_herstellen',
  '/privacybeleid': 'privacybeleid',
  '/algemene-voorwaarden': 'algemene_voorwaarden',
};

/** Longest prefix wins, so `/studies/x` cannot be read as `/studie`. */
const PREFIXES: [string, RouteKey][] = [
  ['/studies/', 'studies_detail'],
  ['/studie/', 'studie_flow'],
  ['/groepen/', 'groepen_detail'],
  ['/hulpbronnen/', 'hulpbronnen_detail'],
  ['/bijbelboeken/', 'bijbelboeken_detail'],
  ['/admin', 'admin'],
];

export function toRouteKey(pathname: unknown): RouteKey {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return 'other';

  // Query and hash are never part of the key - they are the unbounded part.
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

  const exact = EXACT[path];
  if (exact) return exact;

  for (const [prefix, key] of PREFIXES) {
    if (path === prefix.replace(/\/$/, '') || path.startsWith(prefix)) return key;
  }

  return 'other';
}

/**
 * Interactive surfaces worth counting, as a closed set.
 *
 * Add a value here AND a `data-track="<value>"` attribute on the element. An
 * unregistered value is dropped server-side rather than stored, so a typo in the
 * markup loses one number instead of writing junk into the collection.
 */
export const CLICK_TARGETS = [
  // Acquisition
  'hero_cta_signup',
  'hero_cta_appstore',
  'hero_cta_learn_more',
  'nav_signin',
  'nav_register',
  // Navigation
  'sidebar_dashboard',
  'sidebar_lezen',
  'sidebar_studies',
  'sidebar_groepen',
  'sidebar_notities',
  'sidebar_profiel',
  'sidebar_instellingen',
  'sidebar_feedback',
  'sidebar_pro_cta',
  // Studies
  'study_card',
  'study_start',
  'study_resume',
  'study_settings_open',
  'study_lesson_open',
  'study_step_next',
  'study_step_previous',
  'study_lesson_complete',
  'study_quiz_submit',
  // Reading
  'reading_note_create',
  'reading_speak',
  'reading_preferences',
  'reading_tab_commentary',
  'reading_tab_original',
  'reading_tab_historical',
  'reading_tab_notes',
  'reading_tab_ai',
  // Assistant
  'ai_open',
  'ai_ask',
  // Other
  'tour_start',
  'tour_complete',
  'onboarding_complete',
  // Which of the two working styles new users pick in onboarding. Worth its own
  // pair of counters: the split decides how much of the product should lead
  // with guided studies at all.
  'onboarding_mode_guided',
  'onboarding_mode_self',
] as const;

export type ClickTarget = (typeof CLICK_TARGETS)[number];

export function isClickTarget(value: unknown): value is ClickTarget {
  return typeof value === 'string' && (CLICK_TARGETS as readonly string[]).includes(value);
}
