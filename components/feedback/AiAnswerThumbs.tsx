"use client"

import ThumbsSignal from "./ThumbsSignal"

/**
 * Thumbs under one AI-assistant answer (`touchpoint: "ai_answer"`).
 *
 * "Onjuist" is the one reason worth keeping the answer itself for, so that
 * chip ALSO files a report through the existing AI-report route
 * (`POST /api/v1/feedback/ai-report`, lib/aiReport.ts), which stores the
 * question and the answer text for review in /beheer/feedback. The other
 * reasons are counts only; no answer text is stored for them.
 */
export default function AiAnswerThumbs({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  return (
    <ThumbsSignal
      kind="ai_answer"
      label="Was dit antwoord nuttig?"
      className="mt-1 pl-1"
      // The route key is folded server-side from the real path; the book and
      // chapter themselves are not stored for a thumb.
      payload={{ path: typeof window !== "undefined" ? window.location.pathname : "/lezen" }}
      onReason={(reason) => {
        if (reason !== "onjuist") return
        void fetch("/api/v1/feedback/ai-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "onjuist",
            question: question.slice(0, 2000),
            answer: answer.slice(0, 4000),
            surface: "web_ai",
            platform: "web",
          }),
        }).catch(() => {})
      }}
    />
  )
}
