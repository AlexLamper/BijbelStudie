"use client"

import DashboardWerkbank from "../../../components/dashboard/proef/versie-4/DashboardWerkbank"

/**
 * Dashboardontwerp 4 - "Werkbank".
 *
 * The page owns the whole viewport: /proefdashboard's layout deliberately
 * renders no chrome, so the candidate draws the real navbar itself and puts its
 * own rail where the sidebar would be. Everything lives in
 * components/dashboard/proef/versie-4.
 */
export default function ProefdashboardVersie4Page() {
  return <DashboardWerkbank />
}
