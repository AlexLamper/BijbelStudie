import type { Pace } from './planGenerator';

/**
 * The wire shapes for the plan feature, in a module with no database imports
 * so client components can `import type` them without dragging mongoose into
 * the browser bundle.
 */

export type DayMode = 'read' | 'studied';

export type PlanReading = { day: number; book: string; chapter: number; title?: string };

export type PlanDayDTO = {
  day: number;
  title: string | null;
  readings: { book: string; chapter: number }[];
  completed: boolean;
  mode: DayMode | null;
  completedAt: Date | null;
};

export type PlanDTO = {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  categoryLabel: string;
  isPublic: boolean;
  author: string | null;
  isOwner: boolean;
  createdAt: Date;
  readings: PlanReading[];
  days: PlanDayDTO[];
  isEnrolled: boolean;
  pace: Pace | null;
  status: 'active' | 'completed' | 'abandoned' | null;
  startedAt: Date | null;
  completedDays: number[];
  studiedDays: number[];
  progressPercentage: number;
  /** First day that is not yet done - where "lees verder" goes. */
  currentDay: number | null;
  /** Where a user on the original schedule would be today. */
  scheduledDay: number | null;
};

export type ActivePlanCard = {
  id: string;
  title: string;
  duration: number;
  completedDays: number;
  progressPercentage: number;
  currentDay: number | null;
  scheduledDay: number | null;
  today: { book: string; chapter: number; title: string | null }[];
};

export type XpAward = {
  awarded: number;
  xp: number;
  level: number;
  levelledUp: boolean;
  newBadges: string[];
};
