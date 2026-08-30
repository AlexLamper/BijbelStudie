"use client"

import { createContext, useContext, useMemo, useState } from "react"

/**
 * How the user answered onboarding's "Hoe studeer je het liefst?" question.
 *
 * `guided` = begeleide studies, `self` = zelf lezen. The answer reorders the
 * sidebar's primary navigation (components/layout/app-sidebar.tsx).
 */
export type StudyStyle = "guided" | "self"

/**
 * What everyone gets until they say otherwise, and what an unrecognised value
 * degrades to. It is the order the menu has always had - "this is a study app
 * before it is a reader" - so an account that never answered, an account
 * created before the question existed, and a signed-out visitor all see exactly
 * what they saw yesterday.
 */
export const DEFAULT_STUDY_STYLE: StudyStyle = "guided"

/**
 * The stored value arrives as a bare string: it comes out of Mongo, and the
 * mobile API (app/api/v1/preferences) can write the same field. Narrowing here,
 * at the one place it enters the UI, is why nothing downstream has to think
 * about junk.
 */
export function normaliseStudyStyle(value: unknown): StudyStyle {
  return value === "self" || value === "guided" ? value : DEFAULT_STUDY_STYLE
}

interface StudyStyleContextValue {
  studyStyle: StudyStyle
  /** Called by the onboarding modal the moment the answer is saved. */
  setStudyStyle: (next: StudyStyle) => void
}

const StudyStyleContext = createContext<StudyStyleContextValue>({
  studyStyle: DEFAULT_STUDY_STYLE,
  setStudyStyle: () => {},
})

/**
 * Carries the study-style preference from the server render into the client
 * components that need it, WITHOUT a fetch.
 *
 * This exists because of one specific failure: the sidebar is a client
 * component, and reordering its nav after a `fetch` resolved made the menu
 * visibly rearrange itself on every page load. Reading it off `useSession()`
 * instead only half-works - most route layouts call `getServerSession()`
 * without `authOptions`, so the session they hand their SessionProvider is the
 * bare `{name, email, image}` one and carries no preferences at all. The nav
 * would then be ordered correctly on /dashboard and /lezen and wrongly on
 * /groepen, /notities and /profiel.
 *
 * The root layout is the one place that always has the enriched session
 * (app/layout.tsx already awaits `getServerSession(authOptions)` for the
 * onboarding gate), so the value is seeded from there, once, for every route.
 * It is present in the server-rendered HTML and in the first client render, so
 * there is no frame in which the order is wrong and nothing to reshuffle - and
 * it costs no extra database query.
 *
 * The state is seeded from `initial` and then owned by the client: the
 * onboarding modal calls `setStudyStyle` as it saves, so the menu behind the
 * dialog is already in its new order when the dialog closes. `initial` is
 * deliberately not re-synced on later renders - the only thing that changes it
 * mid-session is that same modal, which has already told us.
 */
export function StudyStyleProvider({
  initial,
  children,
}: {
  initial?: string | null
  children: React.ReactNode
}) {
  const [studyStyle, setStudyStyle] = useState<StudyStyle>(() => normaliseStudyStyle(initial))

  const value = useMemo(() => ({ studyStyle, setStudyStyle }), [studyStyle])

  return <StudyStyleContext.Provider value={value}>{children}</StudyStyleContext.Provider>
}

/**
 * Safe outside the provider: the context default is the guided order, so a
 * component rendered without one behaves exactly as it did before this
 * preference existed rather than throwing.
 */
export function useStudyStyle() {
  return useContext(StudyStyleContext)
}
