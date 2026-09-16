"use client"

import ThumbsSignal from "./ThumbsSignal"

/**
 * "Was deze les goed?" - thumbs on a finished lesson, stored as
 * `touchpoint: "lesson_quality"` with the study and day, so the per-lesson
 * read-out in /beheer/feedback can find the weak lessons.
 *
 * Meant for the lesson-complete card (components/study/flow/LessonCompleteCard.tsx):
 *
 *   <LessonThumbs studyId={studyId} lessonDay={day} />
 */
export default function LessonThumbs({
  studyId,
  lessonDay,
  className = "",
}: {
  studyId: string
  lessonDay: number
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <span className="text-[12px] text-ink-muted">Was deze les goed?</span>
      <ThumbsSignal
        kind="lesson_quality"
        label="Was deze les goed?"
        payload={{ studyId, lessonDay, path: `/studie/${studyId}` }}
      />
    </div>
  )
}
