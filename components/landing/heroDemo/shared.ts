/**
 * The contract for the hero demo: one hard verse, and what the product does
 * with it. Five scenes, played in this order:
 *
 *   verse       the passage, with the word nobody understands marked
 *   uitleg      the explanation slides in beside it
 *   grondtekst  the Greek of the verse, word for word
 *   ai          the reader's own question, answered
 *   voortgang   the lesson ticked off, and how far the reader is
 *
 * `HeroDemo.tsx` is the shell (frame, timer, scene tabs). `VersePane` stays
 * mounted through the first four scenes and reacts to `scene`; the three side
 * panels and `VoortgangPanel` are mounted fresh each time their scene starts,
 * so their entrance animations simply run from mount.
 *
 * Everything on screen comes from HERO_DEMO below - no panel invents copy.
 * The verses are the Statenvertaling (public domain), checked against the
 * chapter page the site serves. Never swap in a licensed translation here:
 * this ships in the landing bundle (see CLAUDE.md, licensing and HSV rules).
 */

export type HeroScene = 'verse' | 'uitleg' | 'grondtekst' | 'ai' | 'voortgang';

export const HERO_SCENES: HeroScene[] = ['verse', 'uitleg', 'grondtekst', 'ai', 'voortgang'];

/** The tab under the frame, and the caption read out for the scene. One word
    each: five tabs share one row, and a label that wraps to two lines there
    reads as a caption rather than as a tab. */
export const SCENE_LABEL: Record<HeroScene, string> = {
  verse: 'Vers',
  uitleg: 'Uitleg',
  grondtekst: 'Grondtekst',
  ai: 'Vraag',
  voortgang: 'Voortgang',
};

/** How long each scene stays, in ms. The ones that type or tick get longer. */
export const SCENE_DWELL: Record<HeroScene, number> = {
  verse: 2500,
  uitleg: 3900,
  grondtekst: 3600,
  ai: 5600,
  voortgang: 4000,
};

/** Props of the three side panels (UitlegPanel, GrondtekstPanel, AiPanel). */
export type PanelProps = {
  /** prefers-reduced-motion: render the finished state, start no timers. */
  reduce: boolean;
};

export type VersePaneProps = { scene: HeroScene; reduce: boolean };

export type VoortgangPanelProps = PanelProps & {
  /** Server-rendered SVG of the reader's tree (lib/levensboom/svg). */
  treeSvg: string;
};

/* Colours. Neutrals are the global tokens so the demo follows dark mode; the
   `--lp-*` set comes from LP_THEME_VARS on the landing page root. */
export const HD = {
  teal: '#0D9488',
  tealText: 'var(--lp-teal-text, #0F766E)',
  /** Text ON `tealLight`: `tealText` only reaches 4.43:1 there. */
  tealDeep: 'var(--lp-teal-deep, #115E59)',
  tealLight: 'var(--lp-teal-light, #CCFBF1)',
  text: 'var(--ink)',
  muted: 'var(--lp-muted, #4B5563)',
  faint: 'var(--ink-faint)',
  border: 'var(--line)',
  surface: 'var(--surface)',
  sunken: 'var(--surface-sunken)',
} as const;

export const HERO_DEMO = {
  book: 'Lukas',
  chapter: 14,
  chaptersInBook: 24,
  reference: 'Lukas 14:26',
  translation: 'Statenvertaling',
  focusVerse: 26,
  /** The word in the focus verse the whole demo turns on. Occurs once. */
  hardWord: 'haat',
  verses: [
    { n: 25, text: 'En vele scharen gingen met Hem; en Hij, Zich omkerende, zeide tot hen:' },
    {
      n: 26,
      text: 'Indien iemand tot Mij komt en niet haat zijn vader, en moeder, en vrouw, en kinderen, en broeders, en zusters, ja, ook zelfs zijn eigen leven, die kan Mijn discipel niet zijn.',
    },
    { n: 27, text: 'En wie zijn kruis niet draagt, en Mij navolgt, die kan Mijn discipel niet zijn.' },
  ],
  uitleg: {
    eyebrow: 'Uitleg',
    title: 'Bij vers 26',
    body: [
      'Jezus vraagt hier geen afkeer van je familie. "Haten" is in het Hebreeuwse spraakgebruik ook een manier van vergelijken: het een op de tweede plaats zetten, achter het ander.',
      'Hij vraagt de eerste plaats. Wie Hem volgt, stelt zelfs zijn dierbaarsten niet boven Hem.',
    ],
    crossRef: {
      reference: 'Mattheüs 10:37',
      text: 'Die vader of moeder liefheeft boven Mij, is Mijns niet waardig',
    },
  },
  grondtekst: {
    eyebrow: 'Grondtekst',
    language: 'Grieks',
    /**
     * Nine words of the verse around the hard one, in reading order, exactly
     * as the Grondtekst tab serves them (data/original/Luke/14, verse 26):
     * surface form, transliteration, the English gloss and the Strong number.
     * The glosses are English because the product's are - the demo shows the
     * tab as it is, not a Dutch lexicon it does not have.
     */
    tokens: [
      { word: 'καὶ', translit: 'kai', gloss: 'and', strong: 'G2532' },
      { word: 'οὐ', translit: 'ou', gloss: 'not', strong: 'G3756' },
      { word: 'μισεῖ', translit: 'misei', gloss: 'he hates', strong: 'G3404' },
      { word: 'τὸν', translit: 'ton', gloss: 'the', strong: 'G3588' },
      { word: 'πατέρα', translit: 'patera', gloss: 'father', strong: 'G3962' },
      { word: 'ἑαυτοῦ', translit: "he'autou", gloss: 'of himself', strong: 'G1438' },
      { word: 'καὶ', translit: 'kai', gloss: 'and', strong: 'G2532' },
      { word: 'τὴν', translit: 'tēn', gloss: 'the', strong: 'G3588' },
      { word: 'μητέρα', translit: 'mētera', gloss: 'mother', strong: 'G3384' },
    ],
    /** Index into `tokens` of the word behind `hardWord`. */
    focus: 2,
    /** The tab's own hint, verbatim (components/study/flow/OriginalVersePanel). */
    hint: 'Tik op een Strong-nummer voor het lexicon.',
  },
  ai: {
    /** The product's own labels, verbatim (components/study/AiAssistant, AiDock). */
    title: 'AI-assistent',
    placeholder: 'Stel een vraag over de Bijbel…',
    caveat: 'Antwoorden kunnen fouten bevatten, toets alles aan de Schrift.',
    question: 'Moet ik mijn familie dan echt haten?',
    answer:
      'Nee. "Haten" betekent hier: op de tweede plaats zetten. Genesis 29 noemt Lea "gehaat", terwijl het vers ervoor zegt dat Jakob Rachel liever had dan Lea. Het gaat om voorrang, niet om afkeer.',
  },
  voortgang: {
    /** The six steps of lib/studyFlow.ts, in order. Keep in step by hand. */
    steps: ['Inleiding', 'Bijbelse context', 'Lezen', 'Verdieping', 'Toetsing', 'Toepassing'],
    xp: 25,
    chaptersRead: 14,
    streakDays: 5,
  },
} as const;

/**
 * The shared animation vocabulary, injected once by the shell. Every class
 * sits behind the reduced-motion query, so without motion each element is
 * simply in its final state. Stagger with an inline `animationDelay`.
 * A panel that needs one more keyframe adds its own, prefixed `hd-<panel>-`.
 */
export const HERO_DEMO_CSS = `
@keyframes hd-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes hd-slide { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@keyframes hd-pop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes hd-caret { 50% { opacity: 0; } }
@keyframes hd-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes hd-mark { from { background-size: 0% 100%; } to { background-size: 100% 100%; } }
@media (prefers-reduced-motion: no-preference) {
  .hd-rise { animation: hd-rise 420ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .hd-slide { animation: hd-slide 460ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .hd-pop { animation: hd-pop 320ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .hd-caret { animation: hd-caret 1s steps(1) infinite; }
  .hd-bar { animation: hd-bar 900ms cubic-bezier(0.16, 1, 0.3, 1) both; transform-origin: left; }
  .hd-mark { animation: hd-mark 600ms ease-out both; }
}
.hd-mark { background-repeat: no-repeat; background-size: 100% 100%; }
`;
