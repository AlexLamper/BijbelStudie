"use client"

import DashboardUitzicht from "../../../components/dashboard/proef/versie-2/DashboardUitzicht"

/**
 * Dashboardontwerp 2 - "Uitzicht".
 *
 * A client route on purpose: every number comes from `useDashboardData`, the
 * scene from the levensboom state the root layout already mounts, and nothing
 * on this page touches the database. `app/proefdashboard/layout.tsx` gives it
 * the session and the sidebar context and no chrome at all, so the candidate
 * draws its own.
 */
export default function ProefdashboardVersie2Page() {
  return <DashboardUitzicht />
}
