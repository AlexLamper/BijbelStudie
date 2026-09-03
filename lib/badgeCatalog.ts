/**
 * The names behind the badge ids.
 *
 * `lib/gamification.ts` awards ids - `completed10`, `streak30` - and those ids
 * were reaching the reader verbatim: the end-of-lesson card rendered
 * `summary.newBadges` straight into a chip, so finishing a tenth study
 * congratulated you with the word "completed10". Ids are storage, not copy.
 *
 * Descriptions are the same strings the profile page has always shown in its
 * tooltips, kept here so the two surfaces cannot drift apart.
 */
export interface BadgeMeta {
  /** Short name, shown on a chip. */
  label: string;
  /** What earns it, shown in a tooltip or under the label. */
  description: string;
}

export const BADGE_META: Record<string, BadgeMeta> = {
  streak30: { label: '30-dagenreeks', description: '30 dagen op rij' },
  streak60: { label: '60-dagenreeks', description: '60 dagen op rij' },
  streak90: { label: '90-dagenreeks', description: '90 dagen op rij' },
  streak120: { label: '120-dagenreeks', description: '120 dagen op rij' },
  verified: { label: 'Geverifieerd', description: 'Geverifieerd account' },
  contributor: { label: 'Bijdrager', description: 'Bijdrage aan een studie' },
  completed1: { label: 'Eerste studie af', description: '1 studie voltooid' },
  completed5: { label: 'Vijf studies af', description: '5 studies voltooid' },
  completed10: { label: 'Tien studies af', description: '10 studies voltooid' },
  points100: { label: '100 XP', description: '100 XP verdiend' },
  points500: { label: '500 XP', description: '500 XP verdiend' },
  points1000: { label: '1000 XP', description: '1000 XP verdiend' },
  premium: { label: 'Pro-lid', description: 'Pro-abonnement' },
  invite: { label: 'Uitnodiger', description: 'Een vriend uitgenodigd' },
  commenter: { label: 'Deelnemer', description: 'Een bericht geplaatst' },
  profilepic: { label: 'Profielfoto', description: 'Profielfoto ingesteld' },
  firstlesson: { label: 'Eerste les', description: 'Eerste les bestudeerd' },
  tester: { label: 'Bètatester', description: 'Bètatester' },
  anniversary: { label: 'Eén jaar lid', description: 'Één jaar lid' },
};

/**
 * Never returns an id. An unknown badge - one awarded by a newer server than
 * this client - falls back to a generic word rather than leaking the slug.
 */
export function badgeLabel(id: string): string {
  return BADGE_META[id]?.label ?? 'Nieuwe badge';
}

export function badgeDescription(id: string): string {
  return BADGE_META[id]?.description ?? 'Nieuwe badge verdiend';
}
