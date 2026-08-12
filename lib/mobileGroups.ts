/**
 * Shared shaping for the `/api/v1/groups*` routes.
 *
 * It lives here rather than in a `route.ts` because Next's App Router only
 * permits HTTP handlers and route config to be exported from a route module.
 */

export type GroupMember = {
  userId: { toString(): string };
  role: string;
  joinedAt: Date;
};

export type GroupDoc = {
  _id: { toString(): string };
  name: string;
  description: string;
  isPublic: boolean;
  inviteCode?: string;
  createdBy: { toString(): string };
  members: GroupMember[];
  weeklyAssignment?: { book?: string; chapter?: number; title?: string; dueDate?: Date };
  createdAt: Date;
};

export function serialiseGroup(group: GroupDoc, userId: string) {
  const membership = group.members.find((m) => m.userId?.toString() === userId);
  return {
    id: group._id.toString(),
    name: group.name,
    description: group.description,
    isPublic: group.isPublic,
    memberCount: group.members.length,
    role: membership?.role ?? null,
    isMember: !!membership,
    isLeader: membership?.role === 'leader',
    // The invite code is a credential: only members ever see it.
    inviteCode: membership ? (group.inviteCode ?? null) : null,
    weeklyAssignment: group.weeklyAssignment?.book
      ? {
          book: group.weeklyAssignment.book,
          chapter: group.weeklyAssignment.chapter ?? null,
          title: group.weeklyAssignment.title ?? '',
          dueDate: group.weeklyAssignment.dueDate ?? null,
        }
      : null,
    createdAt: group.createdAt,
  };
}
