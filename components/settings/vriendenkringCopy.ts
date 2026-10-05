/**
 * The Dutch copy of the Vriendenkring settings panel, in one place.
 *
 * Here rather than inline in the JSX for two reasons. These sentences are the
 * product's privacy promise in words - what is findable, what gets published,
 * what stays private - so they are worth reviewing as a block instead of
 * hunting through a component. And a test can then hold them to the promise
 * (tests/vriendenkringSettingsCopy.test.ts) without rendering React, which
 * this repo's vitest setup (environment: node) cannot do.
 *
 * On the three autoShare switches. Only `milestones` is read by the server
 * today (`postMilestone` in lib/friends/service.ts); `createPost` - the share
 * actions on the daily verse and on a note - checks nothing, because those are
 * always an explicit choice. So `verses` and `notes` are permission given in
 * advance for automatic sharing that does not exist yet, and the footnote says
 * exactly that rather than letting two switches imply a behaviour that is not
 * there. Notes in particular: nothing but a note the reader shared by hand
 * ever reaches the kring, with either switch in either position.
 */

export const VRIENDENKRING_SECTION = {
  title: 'Vriendenkring',
  subtitle: 'Wie je kan vinden, en wat er in je kring terechtkomt',
} as const;

export const DISCOVERABLE_COPY = {
  label: 'Vindbaar voor je contacten',
  hint:
    'Hiermee kan iemand die je telefoonnummer of e-mailadres al heeft je in BijbelStudie vinden ' +
    'en je een vriendschapsverzoek sturen. Staat dit uit, dan vindt niemand je zo; via een ' +
    'uitnodigingslink of een code kun je altijd vrienden worden. Dit staat los van het lezen van ' +
    'je contacten: een browser kan geen adresboek lezen, contacten zoeken kan alleen in de app.',
} as const;

export const AUTO_SHARE_COPY = {
  milestones: {
    label: 'Mijlpalen',
    hint:
      'Rond je een dag van je leesplan af, maak je een studie af, haal je een badge of lees je ' +
      '7, 30 of 100 dagen op rij? Dan komt dat als bericht in je kring. Dit is het enige wat ' +
      'vanzelf geplaatst wordt.',
  },
  verses: {
    label: 'Tekst van de dag',
    hint:
      'Je toestemming om de tekst van de dag namens jou in je kring te plaatsen: de verwijzing ' +
      'en de tekst zelf, nooit wat je erbij bewaart of onderstreept.',
  },
  notes: {
    label: 'Notities',
    hint:
      'Je toestemming om een notitie namens jou in je kring te plaatsen. Je notitieboek blijft ' +
      'privé: alleen een notitie die je zelf deelt komt ooit in je kring, en wat je kring dan ' +
      'ziet is een kopie - pas je de notitie later aan, dan verandert dat bericht niet mee.',
  },
} as const;

export const AUTO_SHARE_FOOTNOTE =
  'Vandaag plaatst alleen Mijlpalen vanzelf iets in je kring. Een tekst van de dag of een ' +
  'notitie komt er alleen in als je er zelf "Deel met je vrienden" bij kiest, ook met deze ' +
  'schakelaars aan.';

export const FORGET_CONTACTS_COPY = {
  label: 'Vergeet mijn contactgegevens',
  hint:
    'De app bewaart een versleutelde afdruk van je telefoonnummer en e-mailadres, zodat ' +
    'mensen die je al kennen je kunnen vinden. Hiermee gooi je die weg. Je vriendschappen ' +
    'blijven; alleen vinden via contacten werkt daarna niet meer tot je het in de app opnieuw ' +
    'aanzet.',
  action: 'Vergeten',
  confirmTitle: 'Je contactgegevens vergeten?',
  confirmBody:
    'We verwijderen de versleutelde afdruk van je telefoonnummer en e-mailadres. Je vrienden ' +
    'en je berichten blijven staan. Mensen die je nummer hebben, vinden je hierna niet meer ' +
    'in BijbelStudie.',
  confirmAction: 'Ja, vergeet ze',
  done: 'Je contactgegevens zijn verwijderd.',
} as const;

export const BLOCKED_COPY = {
  heading: 'Geblokkeerd',
  hint:
    'Wie je blokkeert, verdwijnt uit je kring en jullie zien elkaars berichten niet meer. ' +
    'Niemand krijgt bericht dat je dit gedaan hebt. Hef je de blokkade op, dan zijn jullie nog ' +
    'geen vrienden; daarvoor nodigen jullie elkaar opnieuw uit.',
  empty: 'Je hebt niemand geblokkeerd.',
  unblock: 'Blokkade opheffen',
} as const;

/** The same sentence on both clients, so a block reads the same everywhere. */
export const BLOCK_CONFIRM_COPY = {
  body:
    'Jullie verdwijnen uit elkaars kring en zien elkaars berichten en reacties niet meer. ' +
    'Je kunt de blokkade later opheffen bij Instellingen, onder Vriendenkring; de vriendschap ' +
    'komt daar niet mee terug, daarvoor nodigen jullie elkaar opnieuw uit.',
  action: 'Blokkeren',
} as const;

/** Names the person, because "deze persoon" in a dialog is one guess too many. */
export function blockConfirmTitle(name: string): string {
  return `${name || 'Deze persoon'} blokkeren?`;
}
